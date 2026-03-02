import { Sparkles, AlertCircle, CheckCircle, Lightbulb, Building, User, ChevronDown, X, MessageSquare, Loader2, TrendingUp, Award, BedDouble, RefreshCw } from 'lucide-react';
import kudosIcon from 'figma:asset/d13c169a55630b616ca2bbf29b05b5269d82cbb9.png';
import { AIChat, AIChatButton } from '../components/AIChat';
import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { useAuth } from '../components/AuthContext';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/api/make-server-20781d19`;

// Color palette for dynamically assigned member colors
const MEMBER_COLORS = [
  '#FF6B6B', '#C9A227', '#081A33', '#10B981', '#6366F1',
  '#EC4899', '#F59E0B', '#8B5CF6', '#14B8A6', '#F97316',
  '#EF4444', '#3B82F6', '#22C55E', '#A855F7', '#06B6D4',
];

type ViewMode = 'company' | 'individual';

interface MemberAnalytics {
  company_member_id: string;
  display_name: string;
  email: string | null;
  job_title: string | null;
  member_role: string;
  total_kudos: number;
  total_points: number;
  total_stays_created: number;
  avg_daily: number;
  week_growth: number;
  kudos_trend: { date: string; count: number }[];
  category_breakdown: { category: string; count: number }[];
  category_scores: { category: string; score: number; count: number }[];
  recent_kudos: { category: string; message_text: string; points_awarded: number; created_at: string }[];
}

interface CompanyAnalytics {
  total_kudos: number;
  total_points: number;
  total_stays: number;
  completed_stays: number;
  active_stays: number;
  avg_kudos_per_day: number;
  kudos_trend: { date: string; count: number }[];
  stays_trend: { date: string; count: number }[];
  category_breakdown: { category: string; count: number; points: number }[];
  category_scores: { category: string; score: number; count: number }[];
  recent_kudos: { kudos_id: string; category: string; message_text: string; receiver_company_member_id: string; points_awarded: number; created_at: string }[];
}

interface AnalyticsData {
  period_days: number;
  since: string;
  company: CompanyAnalytics;
  members: MemberAnalytics[];
}

interface AIInsight {
  type: 'positive' | 'attention' | 'opportunity';
  title: string;
  description: string;
  impact: string;
}

export default function AnalyticsPage() {
  const { session, activeMembership } = useAuth();
  const companyId = activeMembership?.company_id;

  const [viewMode, setViewMode] = useState<ViewMode>('company');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [currentCommentIndex, setCurrentCommentIndex] = useState(0);

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    const accessToken = session?.access_token;
    if (!accessToken || !companyId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/ops-analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ access_token: accessToken, company_id: companyId, days: 30 }),
      });

      const json = await res.json();
      if (!res.ok) {
        console.error('[analytics] Fetch error:', json);
        setError(json.message || 'Failed to fetch analytics');
        return;
      }

      setData(json);

      // Auto-select top 3 members
      if (json.members && json.members.length > 0 && selectedMembers.length === 0) {
        setSelectedMembers(json.members.slice(0, 3).map((m: MemberAnalytics) => m.company_member_id));
      }

      console.log('[analytics] Loaded:', json.company.total_kudos, 'kudos,', json.members.length, 'members');
    } catch (err) {
      console.error('[analytics] Network error:', err);
      setError('Network error while loading analytics');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, companyId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Rotate recent kudos comments every 5 seconds
  useEffect(() => {
    if (!data?.company.recent_kudos.length) return;
    const interval = setInterval(() => {
      setCurrentCommentIndex((prev) => (prev + 1) % data.company.recent_kudos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [data?.company.recent_kudos.length]);

  // ── Derived data ──
  const members = data?.members || [];
  const company = data?.company;

  const memberColorMap: Record<string, string> = {};
  members.forEach((m, idx) => {
    memberColorMap[m.company_member_id] = MEMBER_COLORS[idx % MEMBER_COLORS.length];
  });

  const getColor = (id: string) => memberColorMap[id] || '#6B7280';
  const getName = (id: string) => members.find(m => m.company_member_id === id)?.display_name || id;
  const getMember = (id: string) => members.find(m => m.company_member_id === id);

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Generate AI insights from real data
  const generateInsights = (): AIInsight[] => {
    if (!data || members.length === 0) return [];
    const insights: AIInsight[] = [];

    // Top performer
    const topMember = members[0];
    if (topMember) {
      insights.push({
        type: 'positive',
        title: `Top Performer: ${topMember.display_name}`,
        description: `${topMember.display_name} (${topMember.job_title || topMember.member_role}) leads with ${topMember.total_kudos} kudos and ${topMember.total_points} points this month. ${topMember.week_growth > 0 ? `Trending up ${topMember.week_growth}% week-over-week.` : ''}`,
        impact: 'high',
      });
    }

    // Best category
    if (company && company.category_breakdown.length > 0) {
      const best = company.category_breakdown[0];
      const worst = company.category_breakdown[company.category_breakdown.length - 1];
      insights.push({
        type: 'opportunity',
        title: `Category Opportunity: ${worst.category}`,
        description: `"${worst.category}" received only ${worst.count} kudos vs "${best.category}" with ${best.count}. Training or awareness in this area could improve guest satisfaction scores.`,
        impact: 'medium',
      });
    }

    // Member with declining performance
    const decliningMembers = members.filter(m => m.week_growth < -10);
    if (decliningMembers.length > 0) {
      const declining = decliningMembers[0];
      insights.push({
        type: 'attention',
        title: `Performance Dip: ${declining.display_name}`,
        description: `${declining.display_name}'s kudos declined ${Math.abs(declining.week_growth)}% this week. Consider a check-in to identify any challenges or provide support.`,
        impact: 'medium',
      });
    } else if (company && company.avg_kudos_per_day > 0) {
      insights.push({
        type: 'positive',
        title: 'Consistent Daily Performance',
        description: `The team averages ${company.avg_kudos_per_day} kudos per day with ${company.total_stays} guest stays this month. ${company.active_stays} stays are currently active.`,
        impact: 'medium',
      });
    }

    return insights;
  };

  const aiInsights = generateInsights();

  // ── Prepare chart data ──
  // Company trend: combined kudos + stays
  const companyTrendData = company?.kudos_trend.map((k, idx) => ({
    date: k.date.slice(5), // MM-DD
    kudos: k.count,
    stays: company.stays_trend[idx]?.count || 0,
  })) || [];

  // Individual trend data
  const individualTrendData = (() => {
    if (selectedMembers.length === 0 || members.length === 0) return [];
    const firstMember = getMember(selectedMembers[0]);
    if (!firstMember) return [];

    return firstMember.kudos_trend.map((item, idx) => {
      const point: any = { date: item.date.slice(5) };
      selectedMembers.forEach(id => {
        const m = getMember(id);
        if (m && m.kudos_trend[idx]) {
          point[id] = m.kudos_trend[idx].count;
        }
      });
      // Team average
      const allCounts = members.map(m => m.kudos_trend[idx]?.count || 0);
      point['team-avg'] = Math.round((allCounts.reduce((a, b) => a + b, 0) / allCounts.length) * 10) / 10;
      return point;
    });
  })();

  // Radar chart data (individual view)
  const radarData = (() => {
    if (selectedMembers.length === 0) return [];
    const allCategories = ["Service", "Cleanliness", "Dining", "Amenities", "Communication", "Friendliness"];
    return allCategories.map(cat => {
      const point: any = { category: cat, fullMark: 100 };
      selectedMembers.forEach(id => {
        const m = getMember(id);
        if (m) {
          const cs = m.category_scores.find(c => c.category === cat);
          point[id] = cs?.score || 0;
        }
      });
      // Team average
      const teamScores = members.map(m => {
        const cs = m.category_scores.find(c => c.category === cat);
        return cs?.score || 0;
      });
      point['team-avg'] = teamScores.length > 0
        ? Math.round(teamScores.reduce((a, b) => a + b, 0) / teamScores.length)
        : 0;
      return point;
    });
  })();

  // Company radar
  const companyRadarData = company?.category_scores.map(cs => ({
    category: cs.category,
    score: cs.score,
    fullMark: 100,
  })) || [];

  // Category bar chart data
  const categoryBarData = company?.category_breakdown.map(cb => ({
    category: cb.category,
    count: cb.count,
    points: cb.points,
  })) || [];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive': return <CheckCircle size={20} className="text-[#10B981]" />;
      case 'attention': return <AlertCircle size={20} className="text-[#F59E0B]" />;
      case 'opportunity': return <Lightbulb size={20} className="text-[#C9A227]" />;
      default: return null;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return { bg: '#10B981', border: '#10B981' };
      case 'attention': return { bg: '#F59E0B', border: '#F59E0B' };
      case 'opportunity': return { bg: '#C9A227', border: '#C9A227' };
      default: return { bg: '#6B7280', border: '#6B7280' };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-[#C9A227] mx-auto mb-4" />
          <p className="text-[#6B7280]">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="text-[#FF6B6B] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#081A33] mb-2">Failed to Load Analytics</h3>
          <p className="text-sm text-[#6B7280] mb-4">{error}</p>
          <button onClick={fetchAnalytics} className="px-4 py-2 bg-[#081A33] text-white rounded-lg hover:bg-[#0A2240] transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || !company) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <p className="text-[#6B7280]">No analytics data available. Please run seed first.</p>
      </div>
    );
  }

  const currentKudos = company.recent_kudos[currentCommentIndex];
  const currentKudosReceiver = currentKudos ? getMember(currentKudos.receiver_company_member_id) : null;

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#081A33]">Analytics Dashboard</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              Last {data.period_days} days — {company.total_kudos} kudos · {company.total_stays} stays · {members.length} staff
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAnalytics}
              className="p-2.5 border border-[#E5E7EB] rounded-lg hover:bg-[#F7F8FA] transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className="text-[#6B7280]" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C9A227]/10 to-[#C9A227]/5 border border-[#C9A227]/20 rounded-lg">
              <Sparkles size={16} className="text-[#C9A227]" />
              <span className="text-sm font-medium text-[#081A33]">AI Analysis Active</span>
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-[#FF6B6B] to-[#FF8585] rounded-lg p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <img src={kudosIcon} alt="Kudos" className="w-5 h-5" />
              <span className="text-xs font-semibold opacity-80">Total Kudos</span>
            </div>
            <p className="text-3xl font-bold">{company.total_kudos.toLocaleString()}</p>
            <p className="text-xs opacity-70 mt-1">{company.avg_kudos_per_day}/day avg</p>
          </div>
          
          
          <div className="bg-gradient-to-br from-[#10B981] to-[#34D399] rounded-lg p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} />
              <span className="text-xs font-semibold opacity-80">Top Performer</span>
            </div>
            <p className="text-lg font-bold truncate">{members[0]?.display_name || '—'}</p>
            <p className="text-xs opacity-70 mt-1">{members[0]?.total_kudos || 0} kudos · {members[0]?.total_points || 0} pts</p>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex gap-2 p-1 bg-[#F7F8FA] rounded-lg">
                <button
                  onClick={() => setViewMode('company')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'company'
                      ? 'bg-[#081A33] text-white shadow-sm'
                      : 'text-[#6B7280] hover:text-[#081A33]'
                  }`}
                >
                  <Building size={16} />
                  Company Overview
                </button>
                <button
                  onClick={() => setViewMode('individual')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'individual'
                      ? 'bg-[#081A33] text-white shadow-sm'
                      : 'text-[#6B7280] hover:text-[#081A33]'
                  }`}
                >
                  <User size={16} />
                  Individual
                </button>
              </div>
            </div>

            {viewMode === 'individual' && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg hover:border-[#C9A227] transition-colors flex items-center gap-2 min-w-[250px]"
                >
                  <span className="text-sm text-[#6B7280] flex-1 text-left">
                    {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                  </span>
                  <ChevronDown size={16} className="text-[#9CA3AF]" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E7EB] rounded-lg shadow-xl z-10 p-2 max-h-96 overflow-y-auto">
                    {members.map((m) => {
                      const isSelected = selectedMembers.includes(m.company_member_id);
                      const color = getColor(m.company_member_id);
                      return (
                        <button
                          key={m.company_member_id}
                          onClick={() => toggleMember(m.company_member_id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            isSelected ? 'bg-[#F7F8FA] border border-[#E5E7EB]' : 'hover:bg-[#FAFBFC]'
                          }`}
                        >
                          <div
                            className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                            style={{
                              borderColor: isSelected ? color : '#D1D5DB',
                              backgroundColor: isSelected ? color : 'transparent',
                            }}
                          >
                            {isSelected && <CheckCircle size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-[#081A33]">{m.display_name}</p>
                            <p className="text-xs text-[#9CA3AF]">{m.job_title || m.member_role} · {m.total_kudos} kudos</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {viewMode === 'individual' && selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[#E5E7EB]">
              {selectedMembers.map((id) => (
                <div
                  key={id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                  style={{
                    backgroundColor: `${getColor(id)}15`,
                    borderColor: `${getColor(id)}40`,
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(id) }}></div>
                  <span className="text-sm font-medium text-[#081A33]">{getName(id)}</span>
                  <button onClick={() => toggleMember(id)} className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors">
                    <X size={12} className="text-[#6B7280]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══════════════ COMPANY VIEW ═══════════════ */}
        {viewMode === 'company' && (
          <>
            {/* Kudos & Stays Trend */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-[#081A33] mb-1">Daily Kudos & Stays Trend</h3>
                <p className="text-sm text-[#6B7280]">Last 30 days of guest activity</p>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={companyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '11px' }} interval={4} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="kudos" name="Kudos" stroke="#FF6B6B" fill="#FF6B6B" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="stays" name="Stays" stroke="#081A33" fill="#081A33" fillOpacity={0.08} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown Bar Chart */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                <div className="mb-6">
                  <h3 className="font-semibold text-[#081A33] mb-1">Kudos by Category</h3>
                  <p className="text-sm text-[#6B7280]">Distribution of guest appreciation</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                    <YAxis dataKey="category" type="category" stroke="#9CA3AF" style={{ fontSize: '11px' }} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="count" name="Kudos Count" fill="#FF6B6B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Company Radar */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                <div className="mb-6">
                  <h3 className="font-semibold text-[#081A33] mb-1">Category Performance</h3>
                  <p className="text-sm text-[#6B7280]">Team-wide performance radar</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={companyRadarData}>
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis dataKey="category" style={{ fontSize: '11px', fill: '#6B7280' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} style={{ fontSize: '10px', fill: '#9CA3AF' }} />
                    <Radar name="Company Score" dataKey="score" stroke="#C9A227" fill="#C9A227" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Live Kudos Stream + Staff Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live Kudos Stream */}
              <div className="bg-gradient-to-br from-[#FF6B6B] to-[#FF8585] rounded-lg p-6 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare size={18} />
                  <span className="text-sm font-semibold opacity-90">Recent Kudos Stream</span>
                  <span className="ml-auto text-xs opacity-60">{company.recent_kudos.length} recent</span>
                </div>
                <div className="space-y-3">
                  {company.recent_kudos.slice(0, 4).map((kudos, idx) => {
                    const receiver = getMember(kudos.receiver_company_member_id);
                    return (
                      <div key={kudos.kudos_id || idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <p className="text-sm mb-2 line-clamp-2">"{kudos.message_text}"</p>
                        <div className="flex items-center justify-between text-xs opacity-80">
                          <span>→ {receiver?.display_name || 'Staff'} ({kudos.category})</span>
                          <span>{formatDate(kudos.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Staff Leaderboard */}
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                <div className="mb-4">
                  <h3 className="font-semibold text-[#081A33] mb-1">Staff Leaderboard</h3>
                  <p className="text-sm text-[#6B7280]">Ranked by total kudos received</p>
                </div>
                <div className="space-y-3">
                  {members.slice(0, 7).map((m, idx) => (
                    <div key={m.company_member_id} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-[#C9A227] text-white' :
                        idx === 1 ? 'bg-[#9CA3AF] text-white' :
                        idx === 2 ? 'bg-[#CD7F32] text-white' :
                        'bg-[#F7F8FA] text-[#6B7280]'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#081A33] truncate">{m.display_name}</span>
                          <span className="text-sm font-semibold text-[#081A33] ml-2">{m.total_kudos}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-[#9CA3AF]">{m.job_title || m.member_role}</span>
                          <span className={`text-xs font-medium ${m.week_growth >= 0 ? 'text-[#10B981]' : 'text-[#FF6B6B]'}`}>
                            {m.week_growth >= 0 ? '+' : ''}{m.week_growth}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#F7F8FA] rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (m.total_kudos / Math.max(1, members[0]?.total_kudos)) * 100)}%`,
                              backgroundColor: getColor(m.company_member_id),
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════ INDIVIDUAL VIEW ═══════════════ */}
        {viewMode === 'individual' && (
          <>
            {selectedMembers.length === 0 ? (
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#F7F8FA] flex items-center justify-center mx-auto mb-4">
                  <User size={32} className="text-[#9CA3AF]" />
                </div>
                <h3 className="text-lg font-semibold text-[#081A33] mb-2">No Members Selected</h3>
                <p className="text-sm text-[#6B7280]">Select staff members from the dropdown to compare performance</p>
              </div>
            ) : (
              <>
                {/* Member KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {selectedMembers.map(id => {
                    const m = getMember(id);
                    if (!m) return null;
                    return (
                      <div
                        key={id}
                        className="bg-white rounded-lg border-2 p-5 hover:shadow-lg transition-all"
                        style={{ borderColor: getColor(id) }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(id) }}></div>
                          <span className="text-xs font-semibold text-[#6B7280] truncate">{m.display_name}</span>
                          <span className="text-xs text-[#9CA3AF] ml-auto">{m.job_title || m.member_role}</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <img src={kudosIcon} alt="Kudos" className="w-4 h-4" />
                              <span className="text-xs text-[#9CA3AF]">Total Kudos</span>
                            </div>
                            <p className="text-2xl font-semibold text-[#081A33]">{m.total_kudos.toLocaleString()}</p>
                          </div>
                          <div className="pt-3 border-t border-[#E5E7EB] grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs text-[#9CA3AF] mb-0.5">Points</p>
                              <p className="text-sm font-semibold text-[#C9A227]">{m.total_points}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#9CA3AF] mb-0.5">Avg/Day</p>
                              <p className="text-sm font-semibold text-[#081A33]">{m.avg_daily}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#9CA3AF] mb-0.5">Growth</p>
                              <p className={`text-sm font-semibold ${m.week_growth >= 0 ? 'text-[#10B981]' : 'text-[#FF6B6B]'}`}>
                                {m.week_growth >= 0 ? '+' : ''}{m.week_growth}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Individual Trend */}
                <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                  <div className="mb-6">
                    <h3 className="font-semibold text-[#081A33] mb-1">Kudos Trend Comparison</h3>
                    <p className="text-sm text-[#6B7280]">Daily kudos with team average</p>
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={individualTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '11px' }} interval={4} />
                      <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      {selectedMembers.map(id => (
                        <Line key={id} type="monotone" dataKey={id} name={getName(id)} stroke={getColor(id)} strokeWidth={2} dot={false} />
                      ))}
                      <Line type="monotone" dataKey="team-avg" name="Team Average" stroke="#6B7280" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Individual Radar */}
                <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                  <div className="mb-6">
                    <h3 className="font-semibold text-[#081A33] mb-1">Category Performance Comparison</h3>
                    <p className="text-sm text-[#6B7280]">Compare individual performance with team average</p>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#E5E7EB" />
                      <PolarAngleAxis dataKey="category" style={{ fontSize: '12px', fill: '#6B7280' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} style={{ fontSize: '10px', fill: '#9CA3AF' }} />
                      {selectedMembers.map(id => (
                        <Radar key={id} name={getName(id)} dataKey={id} stroke={getColor(id)} fill={getColor(id)} fillOpacity={0.15} strokeWidth={2} />
                      ))}
                      <Radar name="Team Average" dataKey="team-avg" stroke="#6B7280" fill="transparent" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </>
        )}

        {/* AI Insights Section */}
        {aiInsights.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-[#C9A227]" />
              <h3 className="font-semibold text-[#081A33]">AI-Generated Insights</h3>
            </div>
            {aiInsights.map((insight, index) => {
              const colors = getInsightColor(insight.type);
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-[#E5E7EB] p-6 hover:shadow-lg transition-all"
                  style={{ borderLeftWidth: '4px', borderLeftColor: colors.border }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5">{getInsightIcon(insight.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-[#081A33]">{insight.title}</h4>
                        <span
                          className="px-2.5 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: colors.bg }}
                        >
                          {insight.impact.toUpperCase()} IMPACT
                        </span>
                      </div>
                      <p className="text-sm text-[#6B7280]">{insight.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Chat */}
      {showAIChat ? (
        <AIChat context="analytics" onClose={() => setShowAIChat(false)} />
      ) : (
        <AIChatButton onClick={() => setShowAIChat(true)} />
      )}
    </div>
  );
}