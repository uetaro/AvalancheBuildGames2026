import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, ArrowLeft, ArrowUpRight, TrendingUp, TrendingDown, Award, ChevronUp, ChevronDown, Target, Loader2 } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Area, AreaChart, Tooltip, Cell, PieChart, Pie } from 'recharts';
import QuickPrompts from '../../components/QuickPrompts';
import kudosIcon from 'figma:asset/d13c169a55630b616ca2bbf29b05b5269d82cbb9.png';
import { supabase, serverUrl, authHeaders } from '../../lib/supabase';

const CATEGORY_COLORS: Record<string, string> = {
  'Service': '#FF6B6B',
  'Service Excellence': '#FF6B6B',
  'Hospitality': '#FF6B6B',
  'Teamwork': '#5BA5A5',
  'Leadership': '#C9A227',
  'Innovation': '#D4A574',
  'Other': '#9CA3AF',
};

function getCategoryColor(category: string): string {
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#9CA3AF';
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
      content: "Hi! I can help you analyze your recognition patterns, suggest areas for improvement, and provide personalized insights. What would you like to know?"
    }
  ]);

  // Stats
  const totalReceived = 127;
  const thisMonth = 24;
  const bestMonth = 32;
  const lastMonth = 19;
  const monthlyGrowth = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  const hotelRank = 3;
  const hotelTotal = 48;

  // Recent Kudos for carousel
  const [recentKudos, setRecentKudos] = useState<RecentKudosItem[]>([]);
  const [recentKudosLoading, setRecentKudosLoading] = useState(true);

  const [currentKudosIndex, setCurrentKudosIndex] = useState(0);

  // Fetch recent kudos from API
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
          console.log('Dashboard recent kudos:', data.items?.length || 0);
          if (data.items && data.items.length > 0) {
            setRecentKudos(data.items);
          }
        } else {
          console.log('Dashboard recent kudos fetch failed:', res.status);
        }
      } catch (err) {
        console.log('Dashboard recent kudos error:', err);
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

  // Category breakdown
  const categoryData = [
    { category: 'Service Excellence', short: 'Service', count: 45, percentage: 35, lastMonth: 38, color: '#FF6B6B' },
    { category: 'Teamwork', short: 'Teamwork', count: 32, percentage: 25, lastMonth: 28, color: '#5BA5A5' },
    { category: 'Leadership', short: 'Leadership', count: 25, percentage: 20, lastMonth: 22, color: '#C9A227' },
    { category: 'Innovation', short: 'Innovation', count: 15, percentage: 12, lastMonth: 12, color: '#D4A574' },
    { category: 'Other', short: 'Other', count: 10, percentage: 8, lastMonth: 11, color: '#9CA3AF' }
  ];

  // Monthly trend data
  const monthlyTrendData = [
    { month: 'Sep', service: 8, teamwork: 6, leadership: 4, innovation: 2, total: 22 },
    { month: 'Oct', service: 7, teamwork: 5, leadership: 4, innovation: 2, total: 20 },
    { month: 'Nov', service: 10, teamwork: 7, leadership: 5, innovation: 2, total: 26 },
    { month: 'Dec', service: 11, teamwork: 8, leadership: 5, innovation: 2, total: 28 },
    { month: 'Jan', service: 14, teamwork: 9, leadership: 5, innovation: 2, total: 32 },
    { month: 'Feb', service: 10, teamwork: 6, leadership: 4, innovation: 2, total: 24 },
  ];

  // Industry comparison
  const industryComparison = [
    { skill: 'Guest Service', you: 95, yourHotel: 85, industry: 78 },
    { skill: 'Teamwork', you: 88, yourHotel: 82, industry: 75 },
    { skill: 'Communication', you: 90, yourHotel: 80, industry: 72 },
    { skill: 'Problem Solving', you: 85, yourHotel: 78, industry: 70 },
    { skill: 'Leadership', you: 80, yourHotel: 72, industry: 65 },
    { skill: 'Innovation', you: 75, yourHotel: 68, industry: 60 }
  ];

  const handleSendMessage = () => {
    if (!message.trim()) return;
    const newUserMessage = { role: 'user' as const, content: message };
    setChatHistory(prev => [...prev, newUserMessage]);
    setTimeout(() => {
      const responses = [
        "Based on your Kudos pattern, you excel in Guest Service (+22% above industry average). Your consistent recognition in this area shows strong customer-facing skills. Consider sharing your approach with team members to elevate overall service quality.",
        "Your Teamwork kudos have increased by 45% this month! This suggests you're collaborating more effectively. Keep fostering these connections - they're crucial for career growth in hospitality.",
        "I notice you're receiving 34% more kudos than your hotel average. Your Innovation category is growing. Have you considered taking on a mentorship role to guide others?",
        "Your recognition pattern shows consistency in Service Excellence. To further develop, focus on Leadership opportunities - that's an area where you can grow +15% to match top performers."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setChatHistory(prev => [...prev, { role: 'ai', content: randomResponse }]);
    }, 800);
    setMessage('');
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
                    </div>
                    <div className="flex items-baseline gap-3">
                      <div style={{ fontSize: '64px', fontWeight: 700, color: '#081A33', letterSpacing: '-3px', lineHeight: '1' }}>
                        {totalReceived}
                      </div>
                      <div style={{ fontSize: '18px', color: '#9CA3AF', fontWeight: 600, paddingBottom: '8px' }}>
                        kudos
                      </div>
                    </div>
                  </div>

                  {/* Mini Chart */}
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

                  {/* Monthly Stats - 2 column like PointBalance */}
                  <div 
                    className="pt-6 border-t"
                    style={{ borderColor: 'rgba(8, 26, 51, 0.06)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px', letterSpacing: '0.5px' }}>
                          This Month
                        </div>
                        <div className="flex items-baseline gap-2">
                          <div style={{ fontSize: '32px', fontWeight: 700, color: '#5BA5A5', letterSpacing: '-1px' }}>
                            {thisMonth}
                          </div>
                          <div style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 600 }}>
                            kudos
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px', letterSpacing: '0.5px' }}>
                          Best Month
                        </div>
                        <div className="flex items-baseline gap-2 justify-end">
                          <div style={{ fontSize: '32px', fontWeight: 700, color: '#C9A227', letterSpacing: '-1px' }}>
                            {bestMonth}
                          </div>
                          <div style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 600 }}>
                            kudos
                          </div>
                        </div>
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
                                  const growthPct = Math.round((growth / item.lastMonth) * 100);
                                  return (
                                    <div key={item.category} className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span style={{ fontSize: '12px', color: '#6B7280' }}>{item.short}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#081A33' }}>{item.count}</span>
                                        <div className="flex items-center gap-0.5">
                                          {growth >= 0 ? (
                                            <ChevronUp size={10} style={{ color: '#5BA5A5' }} />
                                          ) : (
                                            <ChevronDown size={10} style={{ color: '#FF6B6B' }} />
                                          )}
                                          <span style={{ 
                                            fontSize: '10px', fontWeight: 600,
                                            color: growth >= 0 ? '#5BA5A5' : '#FF6B6B' 
                                          }}>
                                            {growth >= 0 ? '+' : ''}{growthPct}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Rank indicator */}
                            <div 
                              className="flex items-center justify-between px-4 py-3 rounded-2xl"
                              style={{ backgroundColor: 'rgba(201, 162, 39, 0.06)' }}
                            >
                              <div className="flex items-center gap-2.5">
                                <Award size={16} style={{ color: '#C9A227' }} />
                                <span style={{ fontSize: '12px', color: '#081A33', fontWeight: 500 }}>
                                  Hotel Ranking
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span style={{ fontSize: '18px', fontWeight: 700, color: '#C9A227' }}>
                                  #{hotelRank}
                                </span>
                                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                  / {hotelTotal} staff
                                </span>
                              </div>
                            </div>
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
                            <ResponsiveContainer width="100%" height={220}>
                              <AreaChart 
                                data={monthlyTrendData}
                                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                              >
                                <defs>
                                  <linearGradient id="serviceGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.12}/>
                                    <stop offset="100%" stopColor="#FF6B6B" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="teamworkGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#5BA5A5" stopOpacity={0.12}/>
                                    <stop offset="100%" stopColor="#5BA5A5" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="service" stroke="#FF6B6B" fill="url(#serviceGrad)" strokeWidth={2} dot={false} />
                                <Area type="monotone" dataKey="teamwork" stroke="#5BA5A5" fill="url(#teamworkGrad)" strokeWidth={2} dot={false} />
                                <Area type="monotone" dataKey="leadership" stroke="#C9A227" fill="none" strokeWidth={1.5} dot={false} />
                                <Area type="monotone" dataKey="innovation" stroke="#D4A574" fill="none" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#081A33', border: 'none', borderRadius: '12px', 
                                    padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                                  }}
                                  labelStyle={{ color: '#9CA3AF', fontSize: '10px', marginBottom: '4px' }}
                                  itemStyle={{ fontSize: '11px', padding: '1px 0' }}
                                  formatter={(value: number, name: string) => {
                                    const labels: Record<string, string> = { service: 'Service', teamwork: 'Teamwork', leadership: 'Leadership', innovation: 'Innovation' };
                                    return [value, labels[name] || name];
                                  }}
                                  cursor={{ stroke: 'rgba(8, 26, 51, 0.08)' }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                            <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
                              {[
                                { label: 'Service', color: '#FF6B6B' },
                                { label: 'Teamwork', color: '#5BA5A5' },
                                { label: 'Leadership', color: '#C9A227' },
                                { label: 'Innovation', color: '#D4A574' },
                              ].map(item => (
                                <div key={item.label} className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                  <span style={{ fontSize: '10px', color: '#6B7280' }}>{item.label}</span>
                                </div>
                              ))}
                            </div>
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
                            <ResponsiveContainer width="100%" height={250}>
                              <RadarChart data={industryComparison}>
                                <PolarGrid stroke="#F0F0F0" />
                                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: '#6B7280' }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} />
                                <Radar name="You" dataKey="you" stroke="#FF6B6B" fill="#FF6B6B" fillOpacity={0.15} strokeWidth={2} />
                                <Radar name="Hotel Avg" dataKey="yourHotel" stroke="#5BA5A5" fill="none" strokeWidth={1.5} strokeDasharray="5 5" />
                                <Radar name="Industry" dataKey="industry" stroke="#9CA3AF" fill="none" strokeWidth={1.5} strokeDasharray="5 5" />
                              </RadarChart>
                            </ResponsiveContainer>
                            <div className="flex items-center justify-center gap-5 mt-1 mb-5">
                              {[
                                { label: 'You', color: '#FF6B6B' },
                                { label: 'Hotel Avg', color: '#5BA5A5' },
                                { label: 'Industry', color: '#9CA3AF' },
                              ].map(item => (
                                <div key={item.label} className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: item.color }} />
                                  <span style={{ fontSize: '10px', color: '#6B7280' }}>{item.label}</span>
                                </div>
                              ))}
                            </div>

                            {/* Insights */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3.5 rounded-2xl" style={{ backgroundColor: 'rgba(91, 165, 165, 0.06)' }}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Target size={12} style={{ color: '#5BA5A5' }} />
                                  <span style={{ fontSize: '10px', color: '#5BA5A5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                    Top Strength
                                  </span>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#081A33', marginBottom: '2px' }}>
                                  Guest Service
                                </div>
                                <div style={{ fontSize: '11px', color: '#5BA5A5', fontWeight: 500 }}>
                                  +17 pts above industry
                                </div>
                              </div>
                              <div className="p-3.5 rounded-2xl" style={{ backgroundColor: 'rgba(201, 162, 39, 0.06)' }}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <TrendingUp size={12} style={{ color: '#C9A227' }} />
                                  <span style={{ fontSize: '10px', color: '#C9A227', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                    Growth Area
                                  </span>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#081A33', marginBottom: '2px' }}>
                                  Innovation
                                </div>
                                <div style={{ fontSize: '11px', color: '#C9A227', fontWeight: 500 }}>
                                  +15 pts potential
                                </div>
                              </div>
                            </div>
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
                            <div className="space-y-5">
                              {industryComparison.map((item, index) => {
                                const diff = item.you - item.yourHotel;
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
                                        <span style={{ fontSize: '10px', color: '#9CA3AF' }}>/100</span>
                                      </div>
                                    </div>
                                    {/* Your score bar */}
                                    <div className="relative h-2 rounded-full overflow-hidden mb-1" style={{ backgroundColor: '#F0F0F0' }}>
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.you}%` }}
                                        transition={{ delay: index * 0.08, duration: 0.8, ease: "easeOut" }}
                                        className="absolute top-0 left-0 h-full rounded-full"
                                        style={{ backgroundColor: '#FF6B6B' }}
                                      />
                                      {/* Hotel avg marker */}
                                      <div 
                                        className="absolute top-0 h-full"
                                        style={{ 
                                          left: `${item.yourHotel}%`, 
                                          width: '2px', 
                                          backgroundColor: '#5BA5A5',
                                          opacity: 0.6
                                        }}
                                      />
                                      {/* Industry marker */}
                                      <div 
                                        className="absolute top-0 h-full"
                                        style={{ 
                                          left: `${item.industry}%`, 
                                          width: '2px', 
                                          backgroundColor: '#9CA3AF',
                                          opacity: 0.4
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span style={{ fontSize: '10px', color: '#9CA3AF' }}>
                                        Hotel {item.yourHotel} / Industry {item.industry}
                                      </span>
                                      <span style={{ 
                                        fontSize: '10px', fontWeight: 600,
                                        color: diff > 0 ? '#5BA5A5' : '#FF6B6B' 
                                      }}>
                                        {diff > 0 ? '+' : ''}{diff} vs hotel
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Overall percentile */}
                            <div 
                              className="mt-5 pt-5 border-t flex items-center justify-between"
                              style={{ borderColor: 'rgba(8, 26, 51, 0.06)' }}
                            >
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                                Overall Percentile
                              </span>
                              <div className="flex items-center gap-2.5">
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ width: '80px', backgroundColor: '#F0F0F0' }}>
                                  <div className="h-full rounded-full" style={{ width: '86%', backgroundColor: '#FF6B6B' }} />
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#FF6B6B' }}>
                                  Top 14%
                                </span>
                              </div>
                            </div>
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
            className="min-h-screen flex flex-col"
          >
            {/* AI Header */}
            <div className="px-6 pt-8 pb-6">
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
                      Your performance assistant
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-6 space-y-4">
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
                    <p style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      {chat.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Bottom Section */}
            <div className="px-6 pb-24 pt-4" style={{ backgroundColor: '#FAFBFC' }}>
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
                    placeholder="Ask about your performance..."
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
                    disabled={!message.trim()}
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