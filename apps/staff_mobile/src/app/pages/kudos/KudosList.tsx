import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Search, Heart, Loader2, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, serverUrl, authHeaders } from '../../lib/supabase';

interface KudosItem {
  kudos_id: string;
  kudos_status: string;
  category: string;
  message_preview: string;
  points_awarded: number;
  created_at: string;
  confirmed_at: string | null;
  stay_id: string | null;
  company_name: string | null;
}

interface KudosSummary {
  pending: number;
  confirmed: number;
  rejected: number;
}

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'rejected';
type FilterCategory = 'all' | 'Service' | 'Teamwork' | 'Leadership' | 'Innovation';

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  'Service': '#FF6B6B',
  'Service Excellence': '#FF6B6B',
  'Teamwork': '#5BA5A5',
  'Leadership': '#C9A227',
  'Innovation': '#D4A574',
  'Other': '#9CA3AF',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  confirmed: { label: 'Confirmed', color: '#5BA5A5', bg: 'rgba(91, 165, 165, 0.1)', icon: CheckCircle },
  pending: { label: 'Pending', color: '#C9A227', bg: 'rgba(201, 162, 39, 0.1)', icon: Clock },
  rejected: { label: 'Rejected', color: '#FF6B6B', bg: 'rgba(255, 107, 107, 0.1)', icon: XCircle },
};

export default function KudosList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<KudosItem[]>([]);
  const [summary, setSummary] = useState<KudosSummary>({ pending: 0, confirmed: 0, rejected: 0 });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const fetchKudos = useCallback(async (cursor?: string | null, append = false) => {
    try {
      if (!append) setIsLoading(true);
      else setIsLoadingMore(true);
      setError(null);

      const token = await getAccessToken();
      if (!token) {
        navigate('/');
        return;
      }

      const params = new URLSearchParams();
      params.set('limit', '30');
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (cursor) {
        params.set('cursor', cursor);
      }

      const res = await fetch(`${serverUrl}/my-kudos?${params.toString()}`, {
        headers: authHeaders(token),
      });

      const data = await res.json();
      console.log('Kudos list response:', res.status, data);

      if (!res.ok) {
        if (res.status === 403) {
          setError('No active company membership. Please apply for affiliation first.');
        } else {
          setError(data.message || 'Failed to load kudos');
        }
        return;
      }

      if (append) {
        setItems(prev => [...prev, ...(data.items || [])]);
      } else {
        setItems(data.items || []);
      }
      setNextCursor(data.next_cursor || null);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.log('Kudos list fetch error:', err);
      setError(`Network error: ${err}`);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [getAccessToken, navigate, statusFilter]);

  // Re-fetch when status filter changes
  useEffect(() => {
    fetchKudos();
  }, [fetchKudos]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current || !nextCursor) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && nextCursor && !isLoadingMore) {
          fetchKudos(nextCursor, true);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextCursor, isLoadingMore, fetchKudos]);

  // Client-side filtering for category and search
  const filteredItems = items.filter(item => {
    if (categoryFilter !== 'all') {
      const cat = item.category?.toLowerCase() || '';
      const filterLower = categoryFilter.toLowerCase();
      if (!cat.includes(filterLower)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = item.message_preview?.toLowerCase().includes(q);
      const matchCat = item.category?.toLowerCase().includes(q);
      const matchCompany = item.company_name?.toLowerCase().includes(q);
      if (!matchMsg && !matchCat && !matchCompany) return false;
    }
    return true;
  });

  const totalCount = summary.pending + summary.confirmed + summary.rejected;

  const getCategoryColor = (category: string) => {
    for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
      if (category.toLowerCase().includes(key.toLowerCase())) return color;
    }
    return '#9CA3AF';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <div
        className="px-6 pt-12 pb-6"
        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid rgba(8, 26, 51, 0.08)' }}
      >
        <div className="flex items-center gap-4 mb-5">
          <button
            onClick={() => navigate('/app/kudos')}
            className="p-2 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
          >
            <ArrowLeft size={24} style={{ color: '#081A33' }} />
          </button>
          <div className="flex-1">
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#081A33' }}>
              Kudos History
            </h1>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: 'rgba(8, 26, 51, 0.04)' }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#081A33' }}>
              {totalCount}
            </span>
            <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '4px' }}>total</span>
          </div>
          {Object.entries(summary).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status];
            if (!cfg || count === 0) return null;
            return (
              <div
                key={status}
                className="px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                style={{ backgroundColor: cfg.bg }}
              >
                <cfg.icon size={11} style={{ color: cfg.color }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: cfg.color }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search kudos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2"
            style={{ backgroundColor: '#F8F9FA', color: '#081A33', fontSize: '14px' }}
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {(['all', 'confirmed', 'pending', 'rejected'] as FilterStatus[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className="px-4 py-2 rounded-xl transition-all whitespace-nowrap"
              style={{
                backgroundColor: statusFilter === tab ? '#FF6B6B' : '#F8F9FA',
                color: statusFilter === tab ? '#ffffff' : '#6B7280',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {(['all', 'Service', 'Teamwork', 'Leadership', 'Innovation'] as FilterCategory[]).map((tab) => {
            const isActive = categoryFilter === tab;
            const color = tab === 'all' ? '#081A33' : getCategoryColor(tab);
            return (
              <button
                key={tab}
                onClick={() => setCategoryFilter(tab)}
                className="px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
                style={{
                  backgroundColor: isActive ? `${color}15` : 'transparent',
                  color: isActive ? color : '#9CA3AF',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: isActive ? `1.5px solid ${color}30` : '1.5px solid transparent',
                }}
              >
                {tab === 'all' ? 'All Categories' : tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4 pb-28">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin" style={{ color: '#FF6B6B' }} />
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3" style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}>
            <AlertCircle size={32} style={{ color: '#FF6B6B' }} />
            <p style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center' }}>
              {error}
            </p>
            <button
              onClick={() => fetchKudos()}
              className="mt-2 px-5 py-2 rounded-xl text-white transition-all active:scale-95"
              style={{ backgroundColor: '#FF6B6B', fontSize: '13px', fontWeight: 600 }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Heart size={48} style={{ color: '#E5E7EB', marginBottom: '12px' }} />
            <p style={{ fontSize: '15px', color: '#6B7280', fontWeight: 500, marginBottom: '4px' }}>
              {items.length === 0 ? 'No kudos received yet' : 'No kudos match your filters'}
            </p>
            <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
              {items.length === 0 ? 'Keep up the great work!' : 'Try adjusting the filters'}
            </p>
          </div>
        )}

        {/* Kudos list */}
        {!isLoading && !error && filteredItems.length > 0 && (
          <div className="space-y-3">
            {filteredItems.map((kudos, index) => {
              const catColor = getCategoryColor(kudos.category);
              const statusCfg = STATUS_CONFIG[kudos.kudos_status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;

              return (
                <motion.div
                  key={kudos.kudos_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  onClick={() => navigate(`/app/kudos/${kudos.kudos_id}`)}
                  className="bg-white rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98]"
                  style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)', border: '1px solid rgba(8, 26, 51, 0.06)' }}
                >
                  <div className="flex items-start gap-3">
                    {/* Category color indicator */}
                    <div
                      className="w-1 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: catColor, height: '40px' }}
                    />
                    <div className="flex-1 min-w-0">
                      {/* Top row: category + status + date */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="px-2 py-0.5 rounded-md"
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: catColor,
                              backgroundColor: `${catColor}15`,
                            }}
                          >
                            {kudos.category}
                          </span>
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: statusCfg.color,
                              backgroundColor: statusCfg.bg,
                            }}
                          >
                            <StatusIcon size={9} />
                            {statusCfg.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#9CA3AF', flexShrink: 0 }}>
                          {new Date(kudos.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {/* Message preview */}
                      <p
                        className="mb-1.5"
                        style={{
                          fontSize: '13px',
                          color: '#081A33',
                          lineHeight: '1.5',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {kudos.message_preview || '(No message)'}
                      </p>

                      {/* Bottom row: company name + points */}
                      <div className="flex items-center justify-between">
                        {kudos.company_name && (
                          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                            {kudos.company_name}
                          </span>
                        )}
                        {kudos.points_awarded > 0 && (
                          <span
                            className="flex items-center gap-1 ml-auto"
                            style={{ fontSize: '12px', fontWeight: 700, color: '#C9A227' }}
                          >
                            +{kudos.points_awarded}
                            <span style={{ fontSize: '10px', fontWeight: 500, color: '#9CA3AF' }}>pt</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} />

            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={20} className="animate-spin" style={{ color: '#FF6B6B' }} />
              </div>
            )}

            {/* End of list */}
            {!nextCursor && items.length > 0 && (
              <p className="text-center py-4" style={{ fontSize: '12px', color: '#D1D5DB' }}>
                All kudos loaded
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
