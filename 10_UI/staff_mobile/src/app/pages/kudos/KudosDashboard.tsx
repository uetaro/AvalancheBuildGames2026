import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, ArrowLeft, ArrowUpRight, TrendingUp, TrendingDown, ChevronUp, ChevronDown, Target, Loader2 } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Area, AreaChart, Tooltip, Cell, PieChart, Pie } from 'recharts';
import QuickPrompts from '../../components/QuickPrompts';
import kudosIcon from 'figma:asset/kudos.png';
import { supabase, serverUrl, authHeaders, authHeadersWithJson } from '../../lib/supabase';

const CATEGORY_PALETTE = ['#FF6B6B', '#5BA5A5', '#C9A227', '#D4A574', '#8B7EC8', '#9CA3AF'];

const CATEGORY_COLOR_MAP: Record<string, string> = {
  'Hospitality': '#FF6B6B',
  'Service': '#FF6B6B',
  'Service Excellence': '#FF6B6B',
  'Professionalism': '#5BA5A5',
  'Teamwork': '#5BA5A5',
  'Kindness': '#C9A227',
  'Leadership': '#C9A227',
  'Quick Response': '#D4A574',
  'Innovation': '#D4A574',
  'Friendly': '#8B7EC8',
  'Other': '#9CA3AF',
};

function getCategoryColor(category: string, index = 0): string {
  for (const [key, color] of Object.entries(CATEGORY_COLOR_MAP)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}

interface StatsData {
  total: number;
  this_month: number;
  last_month: number;
  best_month: { count: number; month_label: string };
  hotel_rank: number;
  hotel_total: number;
  monthly_trend: Array<{ month: string; total: number; by_category: Record<string, number> }>;
  category_totals: Array<{ category: string; count: number; percentage: number; prev_month_count: number }>;
  hotel_category_distribution: Record<string, number>;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return '1 day ago';
  if (diffDay < 30) return `${diffDay} days ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

interface RecentKudosItem {
  kudos_id: string;
  category: string;
  message_preview: string;
  created_at: string;
  kudos_status: string;
  points_awarded: number;
  company_name: string | null;
}

export default function KudosDashboard() {
  const navigate = useNavigate();
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [comparisonView, setComparisonView] = useState<'radar' | 'detail'>('radar');
  const [categoryView, setCategoryView] = useState<'category' | 'trend'>('category');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([
    {
      role: 'ai',
      content: "Hi! I'm your career advisor for hospitality. You can ask about career growth, work-life balance, using guest feedback to develop, or anything else. What's on your mind?"
    }
  ]);

  // Stats from API
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Recent Kudos for carousel
  const [recentKudos, setRecentKudos] = useState<RecentKudosItem[]>([]);
  const [recentKudosLoading, setRecentKudosLoading] = useState(true);
  const [currentKudosIndex, setCurrentKudosIndex] = useState(0);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${serverUrl}/my-kudos-stats`, {
          headers: authHeaders(session.access_token),
        });
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (err) {
        console.log('Stats fetch error:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Fetch recent kudos
  useEffect(() => {
    const fetchRecentKudos = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${serverUrl}/my-kudos?limit=5`, {
          headers: authHeaders(session.access_token),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.items?.length > 0) setRecentKudos(data.items);
        }
      } catch (err) {
        console.log('Recent kudos error:', err);
      } finally {
        setRecentKudosLoading(false);
      }
    };
    fetchRecentKudos();
  }, []);

  useEffect(() => {
    if (recentKudos.length === 0) return;
    const interval = setInterval(() => {
      setCurrentKudosIndex((prev) => (prev + 1) % recentKudos.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [recentKudos.length]);

  // ── Derived stats ──
  const totalReceived = stats?.total ?? 0;
  const thisMonth = stats?.this_month ?? 0;
  const lastMonth = stats?.last_month ?? 0;
  const bestMonth = stats?.best_month.count ?? 0;
  const monthlyGrowth = lastMonth > 0
    ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
    : (thisMonth > 0 ? 100 : 0);
  const hotelRank = stats?.hotel_rank ?? 0;
  const hotelTotal = stats?.hotel_total ?? 0;

  // Category breakdown
  const categoryData = (stats?.category_totals ?? []).map((cat, i) => ({
    category: cat.category,
    short: cat.category,
    count: cat.count,
    percentage: cat.percentage,
    lastMonth: cat.prev_month_count,
    color: getCategoryColor(cat.category, i),
  }));

  // Top 4 categories for trend chart
  const topCategories = (stats?.category_totals ?? []).slice(0, 4).map((c) => c.category);

  // Monthly trend: flatten by_category into row object
  const monthlyTrendData = (stats?.monthly_trend ?? []).map((m) => {
    const row: Record<string, number | string> = { month: m.month, total: m.total };
    for (const cat of topCategories) {
      row[cat] = m.by_category[cat] ?? 0;
    }
    return row;
  });

  // Radar data: category distribution vs hotel avg
  const radarData = (stats?.category_totals ?? []).slice(0, 6).map((cat) => ({
    skill: cat.category,
    you: cat.percentage,
    hotelAvg: stats?.hotel_category_distribution[cat.category] ?? 0,
  }));

  // Top strength / growth area
  const topStrength = radarData.length > 0
    ? radarData.reduce((best, item) =>
        (item.you - item.hotelAvg) > (best.you - best.hotelAvg) ? item : best,
        radarData[0])
    : null;
  const growthArea = radarData.length > 0
    ? radarData.reduce((worst, item) =>
        (item.you - item.hotelAvg) < (worst.you - worst.hotelAvg) ? item : worst,
        radarData[0])
    : null;

  // Overall percentile (based on hotel rank)
  const overallPercentile = hotelTotal > 1
    ? Math.round(((hotelTotal - hotelRank) / (hotelTotal - 1)) * 100)
    : (hotelRank === 1 ? 100 : 0);

  const [isAILoading, setIsAILoading] = useState(false);

  const handleSendMessage = async () => {
    const text = message.trim();
    if (!text) return;
    const newUserMessage = { role: 'user' as const, content: text };
    setChatHistory((prev) => [...prev, newUserMessage]);
    setMessage('');
    setIsAILoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setChatHistory((prev) => [...prev, { role: 'ai', content: 'Please sign in again to use AI Insights.' }]);
        return;
      }
      const res = await fetch(`${serverUrl}/career-chat`, {
        method: 'POST',
        headers: authHeadersWithJson(session.access_token),
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg = data.message || 'Something went wrong. Please try again.';
        setChatHistory((prev) => [...prev, { role: 'ai', content: errMsg }]);
        return;
      }
      if (data.reply) {
        setChatHistory((prev) => [...prev, { role: 'ai', content: data.reply }]);
      } else {
        setChatHistory((prev) => [...prev, { role: 'ai', content: 'I couldn\'t generate a response. Please try again.' }]);
      }
    } catch (err) {
      console.error('Career chat error:', err);
      setChatHistory((prev) => [...prev, { role: 'ai', content: 'Connection error. Please check your network and try again.' }]);
    } finally {
      setIsAILoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <AnimatePresence mode="wait">
        {!isAIOpen ? (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div 
              className="px-6 pt-12 pb-8 relative overflow-hidden"
              style={{ 
                background: 'linear-gradient(165deg, #FF6B6B 0%, #FF5252 50%, #E85555 100%)'
              }}
            >
              <div 
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.8) 1px, transparent 1px),
                                   radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
                  backgroundSize: '60px 60px'
                }}
              />
              <motion.div
                animate={{ y: [0, -8, 0], opacity: [0.2, 0.3, 0.2] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute"
                style={{ top: '15%', right: '10%' }}
              >
                <div style={{
                  width: '100px', height: '100px', borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 70%)',
                }} />
              </motion.div>
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 500 }}>
                      Recognition Hub
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
                      Your Kudos
                    </h1>
                  </div>
                  <motion.div
                    animate={{ rotate: [0, -12, 12, -12, 0], y: [0, -4, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                    className="w-11 h-11"
                  >
                    <img src={kudosIcon} alt="Kudos" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="px-6 -mt-4 pb-24">
              {/* Stats Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-lg relative overflow-hidden mb-4"
                style={{ boxShadow: '0 8px 32px rgba(8, 26, 51, 0.08)' }}
              >
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.03) 0%, rgba(91, 165, 165, 0.03) 100%)'
                  }}
                />
                <div className="relative p-8">
                  {/* Total Kudos */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <span style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>
                        Total Received
                      </span>
                      {!statsLoading && lastMonth > 0 && (
                        <div 
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: monthlyGrowth >= 0 ? 'rgba(91, 165, 165, 0.1)' : 'rgba(255, 107, 107, 0.1)' }}
                        >
                          {monthlyGrowth >= 0 ? (
                            <TrendingUp size={12} style={{ color: '#5BA5A5' }} />
                          ) : (
                            <TrendingDown size={12} style={{ color: '#FF6B6B' }} />
                          )}
                          <span style={{ fontSize: '11px', fontWeight: 600, color: monthlyGrowth >= 0 ? '#5BA5A5' : '#FF6B6B' }}>
                            {monthlyGrowth >= 0 ? '+' : ''}{monthlyGrowth}%
                          </span>
                        </div>
                      )}
                    </div>
                    {statsLoading ? (
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-32 rounded-xl animate-pulse" style={{ backgroundColor: '#F0F0F0' }} />
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-3">
                        <div style={{ fontSize: '64px', fontWeight: 700, color: '#081A33', letterSpacing: '-3px', lineHeight: '1' }}>
                          {totalReceived}
                        </div>
                        <div style={{ fontSize: '18px', color: '#9CA3AF', fontWeight: 600, paddingBottom: '8px' }}>
                          kudos
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mini Chart */}
                  {!statsLoading && monthlyTrendData.length > 0 && (
                    <div className="mb-6" style={{ marginLeft: '-8px', marginRight: '-8px' }}>
                      <ResponsiveContainer width="100%" height={72}>
                        <AreaChart 
                          data={monthlyTrendData}
                          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="kudosGradientNew" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.2}/>
                              <stop offset="100%" stopColor="#FF6B6B" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area 
                            type="monotone" 
                            dataKey="total" 
                            stroke="#FF6B6B" 
                            strokeWidth={2.5}
                            fill="url(#kudosGradientNew)"
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Monthly Stats */}
                  <div 
                    className="pt-6 border-t"
                    style={{ borderColor: 'rgba(8, 26, 51, 0.06)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px', letterSpacing: '0.5px' }}>
                          This Month
                        </div>
                        {statsLoading ? (
                          <div className="h-8 w-16 rounded-lg animate-pulse" style={{ backgroundColor: '#F0F0F0' }} />
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <div style={{ fontSize: '32px', fontWeight: 700, color: '#5BA5A5', letterSpacing: '-1px' }}>
                              {thisMonth}
                            </div>
                            <div style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 600 }}>
                              kudos
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px', letterSpacing: '0.5px' }}>
                          Best Month{stats?.best_month.month_label ? ` (${stats.best_month.month_label})` : ''}
                        </div>
                        {statsLoading ? (
                          <div className="h-8 w-16 rounded-lg animate-pulse ml-auto" style={{ backgroundColor: '#F0F0F0' }} />
                        ) : (
                          <div className="flex items-baseline gap-2 justify-end">
                            <div style={{ fontSize: '32px', fontWeight: 700, color: '#C9A227', letterSpacing: '-1px' }}>
                              {bestMonth}
                            </div>
                            <div style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 600 }}>
                              kudos
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Recent Kudos */}
              <div className="mb-4">
                <div className="mb-3 px-1">
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#081A33' }}>
                    Recent Recognition
                  </h3>
                </div>
                <div className="relative overflow-hidden" style={{ height: '130px' }}>
                  {recentKudosLoading ? (
                    <div className="bg-white rounded-3xl p-5 shadow-sm h-full flex items-center justify-center" style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}>
                      <Loader2 size={22} className="animate-spin" style={{ color: '#FF6B6B' }} />
                    </div>
                  ) : recentKudos.length === 0 ? (
                    <div className="bg-white rounded-3xl p-5 shadow-sm h-full flex flex-col items-center justify-center" style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}>
                      <p style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 500 }}>No kudos received yet</p>
                      <p style={{ fontSize: '11px', color: '#D1D5DB', marginTop: '4px' }}>Keep up the great work!</p>
                    </div>
                  ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentKudosIndex}
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.6 }}
                      onClick={() => navigate(`/app/kudos/${recentKudos[currentKudosIndex].kudos_id}`)}
                      className="bg-white rounded-3xl p-5 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
                      style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: '12px', fontWeight: 600, color: getCategoryColor(recentKudos[currentKudosIndex].category) }}>
                                {recentKudos[currentKudosIndex].category}
                              </span>
                              {recentKudos[currentKudosIndex].points_awarded > 0 && (
                                null
                              )}
                            </div>
                            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                              {formatRelativeTime(recentKudos[currentKudosIndex].created_at)}
                            </span>
                          </div>
                          <p style={{ fontSize: '14px', color: '#081A33', lineHeight: '1.5', fontWeight: 500 }}>
                            {recentKudos[currentKudosIndex].message_preview || '(No message)'}
                          </p>
                          {recentKudos[currentKudosIndex].company_name && (
                            <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                              {recentKudos[currentKudosIndex].company_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-4 justify-center">
                        {recentKudos.map((_, index) => (
                          <div
                            key={index}
                            className="h-1 rounded-full transition-all"
                            style={{
                              width: index === currentKudosIndex ? '24px' : '8px',
                              backgroundColor: index === currentKudosIndex ? '#FF6B6B' : '#E5E7EB'
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  )}
                </div>
              </div>

              {/* View All Button */}
              <button
                onClick={() => navigate('/app/kudos/list')}
                className="w-full flex items-center justify-end gap-1 transition-all active:scale-[0.98] mb-6"
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#FF6B6B' }}>
                  View All Kudos
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>

              {/* Category Breakdown */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#081A33' }}>
                    {categoryView === 'category' ? 'Recognition by Category' : 'Monthly Breakdown'}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCategoryView('category')}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{ backgroundColor: categoryView === 'category' ? '#FF6B6B' : '#D1D5DB' }}
                    />
                    <button
                      onClick={() => setCategoryView('trend')}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{ backgroundColor: categoryView === 'trend' ? '#FF6B6B' : '#D1D5DB' }}
                    />
                  </div>
                </div>

                <div className="overflow-hidden">
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_e, { offset }) => {
                      if (offset.x > 50) setCategoryView('category');
                      else if (offset.x < -50) setCategoryView('trend');
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {categoryView === 'category' ? (
                        <motion.div
                          key="category"
                          initial={{ opacity: 0, x: -100 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 100 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="bg-white rounded-3xl p-6 shadow-sm" style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}>
                            {statsLoading ? (
                              <div className="space-y-3">
                                {[1,2,3].map(i => (
                                  <div key={i} className="h-5 rounded-lg animate-pulse" style={{ backgroundColor: '#F0F0F0' }} />
                                ))}
                              </div>
                            ) : categoryData.length === 0 ? (
                              <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', padding: '16px 0' }}>
                                No kudos data yet
                              </p>
                            ) : (
                              <>
                                {/* Donut + Legend */}
                                <div className="flex items-center gap-4 mb-6">
                                  <div style={{ width: '110px', height: '110px', flexShrink: 0 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                        <Pie
                                          data={categoryData}
                                          cx="50%"
                                          cy="50%"
                                          innerRadius={30}
                                          outerRadius={50}
                                          paddingAngle={3}
                                          dataKey="count"
                                          strokeWidth={0}
                                        >
                                          {categoryData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                          ))}
                                        </Pie>
                                      </PieChart>
                                    </ResponsiveContainer>
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    {categoryData.map((item) => {
                                      const growth = item.count - item.lastMonth;
                                      const growthPct = item.lastMonth > 0
                                        ? Math.round((growth / item.lastMonth) * 100)
                                        : (growth > 0 ? 100 : 0);
                                      return (
                                        <div key={item.category} className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span style={{ fontSize: '12px', color: '#6B7280' }}>{item.short}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#081A33' }}>{item.count}</span>
                                            {item.lastMonth > 0 && (
                                              <div className="flex items-center gap-0.5">
                                                {growth >= 0 ? (
                                                  <ChevronUp size={10} style={{ color: '#5BA5A5' }} />
                                                ) : (
                                                  <ChevronDown size={10} style={{ color: '#FF6B6B' }} />
                                                )}
                                                <span style={{ fontSize: '10px', fontWeight: 600, color: growth >= 0 ? '#5BA5A5' : '#FF6B6B' }}>
                                                  {growth >= 0 ? '+' : ''}{growthPct}%
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="trend"
                          initial={{ opacity: 0, x: 100 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="bg-white rounded-3xl p-6 shadow-sm" style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}>
                            {statsLoading ? (
                              <div className="h-52 rounded-xl animate-pulse" style={{ backgroundColor: '#F0F0F0' }} />
                            ) : monthlyTrendData.length === 0 ? (
                              <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', padding: '40px 0' }}>
                                No trend data yet
                              </p>
                            ) : (
                              <>
                                <ResponsiveContainer width="100%" height={220}>
                                  <AreaChart 
                                    data={monthlyTrendData}
                                    margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                                  >
                                    <defs>
                                      {topCategories.map((cat, i) => (
                                        <linearGradient key={cat} id={`catGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor={getCategoryColor(cat, i)} stopOpacity={0.12}/>
                                          <stop offset="100%" stopColor={getCategoryColor(cat, i)} stopOpacity={0}/>
                                        </linearGradient>
                                      ))}
                                    </defs>
                                    {topCategories.map((cat, i) => (
                                      <Area
                                        key={cat}
                                        type="monotone"
                                        dataKey={cat}
                                        stroke={getCategoryColor(cat, i)}
                                        fill={i < 2 ? `url(#catGrad${i})` : 'none'}
                                        strokeWidth={i < 2 ? 2 : 1.5}
                                        dot={false}
                                        strokeDasharray={i >= 2 ? '4 4' : undefined}
                                      />
                                    ))}
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: '#081A33', border: 'none', borderRadius: '12px', 
                                        padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                                      }}
                                      labelStyle={{ color: '#9CA3AF', fontSize: '10px', marginBottom: '4px' }}
                                      itemStyle={{ fontSize: '11px', padding: '1px 0' }}
                                      cursor={{ stroke: 'rgba(8, 26, 51, 0.08)' }}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                                <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
                                  {topCategories.map((cat, i) => (
                                    <div key={cat} className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(cat, i) }} />
                                      <span style={{ fontSize: '10px', color: '#6B7280' }}>{cat}</span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>

              {/* Skills Benchmark */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#081A33' }}>
                    {comparisonView === 'radar' ? 'Skills Benchmark' : 'Skill Details'}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setComparisonView('radar')}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{ backgroundColor: comparisonView === 'radar' ? '#FF6B6B' : '#D1D5DB' }}
                    />
                    <button
                      onClick={() => setComparisonView('detail')}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{ backgroundColor: comparisonView === 'detail' ? '#FF6B6B' : '#D1D5DB' }}
                    />
                  </div>
                </div>

                <div className="overflow-hidden">
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_e, { offset }) => {
                      if (offset.x > 50) setComparisonView('radar');
                      else if (offset.x < -50) setComparisonView('detail');
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {comparisonView === 'radar' ? (
                        <motion.div
                          key="radar"
                          initial={{ opacity: 0, x: -100 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 100 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="bg-white rounded-3xl p-6 shadow-sm" style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}>
                            {statsLoading ? (
                              <div className="h-64 rounded-xl animate-pulse" style={{ backgroundColor: '#F0F0F0' }} />
                            ) : radarData.length < 3 ? (
                              <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', padding: '40px 0' }}>
                                Not enough data yet
                              </p>
                            ) : (
                              <>
                                <ResponsiveContainer width="100%" height={250}>
                                  <RadarChart data={radarData}>
                                    <PolarGrid stroke="#F0F0F0" />
                                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: '#6B7280' }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} />
                                    <Radar name="You" dataKey="you" stroke="#FF6B6B" fill="#FF6B6B" fillOpacity={0.15} strokeWidth={2} />
                                    <Radar name="Hotel Avg" dataKey="hotelAvg" stroke="#5BA5A5" fill="none" strokeWidth={1.5} strokeDasharray="5 5" />
                                  </RadarChart>
                                </ResponsiveContainer>
                                <div className="flex items-center justify-center gap-5 mt-1 mb-5">
                                  {[{ label: 'You', color: '#FF6B6B' }, { label: 'Hotel Avg', color: '#5BA5A5' }].map(item => (
                                    <div key={item.label} className="flex items-center gap-1.5">
                                      <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: item.color }} />
                                      <span style={{ fontSize: '10px', color: '#6B7280' }}>{item.label}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Insights */}
                                <div className="grid grid-cols-2 gap-3">
                                  {topStrength && (
                                    <div className="p-3.5 rounded-2xl" style={{ backgroundColor: 'rgba(91, 165, 165, 0.06)' }}>
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        <Target size={12} style={{ color: '#5BA5A5' }} />
                                        <span style={{ fontSize: '10px', color: '#5BA5A5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                          Top Strength
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#081A33', marginBottom: '2px' }}>
                                        {topStrength.skill}
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#5BA5A5', fontWeight: 500 }}>
                                        {topStrength.you}% of your kudos
                                      </div>
                                    </div>
                                  )}
                                  {growthArea && growthArea.skill !== topStrength?.skill && (
                                    <div className="p-3.5 rounded-2xl" style={{ backgroundColor: 'rgba(201, 162, 39, 0.06)' }}>
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        <TrendingUp size={12} style={{ color: '#C9A227' }} />
                                        <span style={{ fontSize: '10px', color: '#C9A227', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                          Growth Area
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#081A33', marginBottom: '2px' }}>
                                        {growthArea.skill}
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#C9A227', fontWeight: 500 }}>
                                        Hotel avg: {growthArea.hotelAvg}%
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="detail"
                          initial={{ opacity: 0, x: 100 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="bg-white rounded-3xl p-6 shadow-sm" style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}>
                            {statsLoading ? (
                              <div className="space-y-4">
                                {[1,2,3,4].map(i => (
                                  <div key={i} className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: '#F0F0F0' }} />
                                ))}
                              </div>
                            ) : radarData.length === 0 ? (
                              <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', padding: '40px 0' }}>
                                No data yet
                              </p>
                            ) : (
                              <>
                                <div className="space-y-5">
                                  {radarData.map((item, index) => {
                                    const diff = item.you - item.hotelAvg;
                                    return (
                                      <div key={item.skill}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span style={{ fontSize: '12px', fontWeight: 500, color: '#081A33' }}>
                                            {item.skill}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#081A33' }}>
                                              {item.you}
                                            </span>
                                            <span style={{ fontSize: '10px', color: '#9CA3AF' }}>%</span>
                                          </div>
                                        </div>
                                        <div className="relative h-2 rounded-full overflow-hidden mb-1" style={{ backgroundColor: '#F0F0F0' }}>
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.you}%` }}
                                            transition={{ delay: index * 0.08, duration: 0.8, ease: "easeOut" }}
                                            className="absolute top-0 left-0 h-full rounded-full"
                                            style={{ backgroundColor: '#FF6B6B' }}
                                          />
                                          {item.hotelAvg > 0 && (
                                            <div 
                                              className="absolute top-0 h-full"
                                              style={{ left: `${item.hotelAvg}%`, width: '2px', backgroundColor: '#5BA5A5', opacity: 0.6 }}
                                            />
                                          )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span style={{ fontSize: '10px', color: '#9CA3AF' }}>
                                            Hotel avg {item.hotelAvg}%
                                          </span>
                                          <span style={{ fontSize: '10px', fontWeight: 600, color: diff >= 0 ? '#5BA5A5' : '#FF6B6B' }}>
                                            {diff >= 0 ? '+' : ''}{diff}pts vs hotel
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Overall percentile */}
                                {hotelTotal > 1 && (
                                  <div 
                                    className="mt-5 pt-5 border-t flex items-center justify-between"
                                    style={{ borderColor: 'rgba(8, 26, 51, 0.06)' }}
                                  >
                                    <span style={{ fontSize: '12px', color: '#6B7280' }}>
                                      Hotel Percentile
                                    </span>
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-1.5 rounded-full overflow-hidden" style={{ width: '80px', backgroundColor: '#F0F0F0' }}>
                                        <div className="h-full rounded-full" style={{ width: `${overallPercentile}%`, backgroundColor: '#FF6B6B' }} />
                                      </div>
                                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#FF6B6B' }}>
                                        Top {100 - overallPercentile > 0 ? 100 - overallPercentile : 1}%
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ai"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ backgroundColor: '#FAFBFC' }}
          >
            {/* AI Header — fixed at top (clear notch) */}
            <div
              className="flex-shrink-0 px-6 pb-4"
              style={{
                backgroundColor: '#FAFBFC',
                paddingTop: '3.5rem'
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsAIOpen(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
                  style={{ backgroundColor: '#F5F5F5' }}
                >
                  <ArrowLeft size={20} style={{ color: '#081A33' }} />
                </button>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #5BA5A5 0%, #4a9090 100%)' }}
                  >
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#081A33' }}>
                      AI Insights
                    </h1>
                    <p style={{ fontSize: '12px', color: '#6B7280' }}>
                      Career consultation
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-4 pb-4">
              {chatHistory.map((chat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="rounded-2xl px-4 py-3 max-w-[85%]"
                    style={{
                      backgroundColor: chat.role === 'user' ? '#081A33' : '#ffffff',
                      color: chat.role === 'user' ? '#ffffff' : '#081A33',
                      boxShadow: chat.role === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                  >
                    {chat.role === 'ai' && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#5BA5A5' }}>
                          <Sparkles size={12} className="text-white" />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#5BA5A5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          AI
                        </span>
                      </div>
                    )}
                    <p style={{ fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {chat.content}
                    </p>
                  </div>
                </motion.div>
              ))}
              {isAILoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div
                    className="rounded-2xl px-4 py-3 max-w-[85%]"
                    style={{ backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#5BA5A5' }}>
                        <Sparkles size={12} className="text-white" />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#5BA5A5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        AI
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" style={{ color: '#5BA5A5' }} />
                      <span style={{ fontSize: '13px', color: '#6B7280' }}>Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input area — fixed at bottom (above tab bar) */}
            <div
              className="flex-shrink-0 px-6 pt-4"
              style={{
                backgroundColor: '#FAFBFC',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 3.5rem)'
              }}
            >
              <div className="mb-4">
                <QuickPrompts 
                  onPromptClick={(prompt) => {
                    setMessage(prompt);
                    setTimeout(() => handleSendMessage(), 100);
                  }} 
                />
              </div>
              <div 
                className="rounded-3xl p-1.5 shadow-sm"
                style={{ backgroundColor: '#ffffff', border: '1px solid rgba(8, 26, 51, 0.06)' }}
              >
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about your career..."
                    className="flex-1 px-4 py-3.5 rounded-3xl border-0 focus:outline-none"
                    style={{ fontSize: '14px', backgroundColor: 'transparent', color: '#081A33' }}
                  />
                  <motion.button
                    onClick={handleSendMessage}
                    whileTap={{ scale: 0.95 }}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                    style={{ 
                      background: message.trim() ? 'linear-gradient(135deg, #5BA5A5 0%, #4a9090 100%)' : '#F5F5F5',
                      boxShadow: message.trim() ? '0 4px 12px rgba(91, 165, 165, 0.25)' : 'none'
                    }}
                    disabled={!message.trim() || isAILoading}
                  >
                    <Send size={20} style={{ color: message.trim() ? '#ffffff' : '#9CA3AF' }} />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating AI Button */}
      {!isAIOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          onClick={() => setIsAIOpen(true)}
          className="fixed transition-all active:scale-95"
          style={{
            right: '24px', bottom: '104px', width: '56px', height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #5BA5A5 0%, #4a9090 100%)',
            boxShadow: '0 8px 24px rgba(91, 165, 165, 0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', zIndex: 50
          }}
        >
          <Sparkles size={24} style={{ color: '#ffffff' }} />
        </motion.button>
      )}
    </div>
  );
}