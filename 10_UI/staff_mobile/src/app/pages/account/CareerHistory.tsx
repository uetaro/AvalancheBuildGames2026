import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Building2, ShieldCheck, Clock, ExternalLink, ChevronDown, ChevronUp, Heart, Loader2, AlertCircle, CheckCircle2, Timer } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase, serverUrl, authHeaders } from '../../lib/supabase';

interface OnChainInfo {
  status: string;
  tx_hash: string | null;
  anchor_hash: string;
  confirmed_at: string | null;
  chain_id: number;
  explorer_url: string | null;
}

interface CareerItem {
  company_member_id: string;
  company_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_location: string | null;
  member_role: string;
  member_status: string;
  job_title: string | null;
  started_at: string;
  ended_at: string | null;
  kudos_count: number;
  on_chain: OnChainInfo | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function durationLabel(startStr: string, endStr: string | null): string {
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months < 1) return 'Less than a month';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

function ChainStatusBadge({ chain }: { chain: OnChainInfo | null }) {
  if (!chain) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(156, 163, 175, 0.1)' }}>
        <AlertCircle size={12} style={{ color: '#9CA3AF' }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF' }}>Not Recorded</span>
      </div>
    );
  }

  if (chain.status === 'confirmed') {
    // confirmed + tx_hash あり → エクスプローラーへ直リンク
    if (chain.explorer_url) {
      return (
        <a
          href={chain.explorer_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-opacity active:opacity-70"
          style={{ backgroundColor: 'rgba(91, 165, 165, 0.15)', textDecoration: 'none' }}
        >
          <ShieldCheck size={12} style={{ color: '#5BA5A5' }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#5BA5A5' }}>Verified On-Chain</span>
          <ExternalLink size={10} style={{ color: '#5BA5A5' }} />
        </a>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(91, 165, 165, 0.1)' }}>
        <ShieldCheck size={12} style={{ color: '#5BA5A5' }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#5BA5A5' }}>Verified On-Chain</span>
      </div>
    );
  }

  if (chain.status === 'submitted') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(201, 162, 39, 0.1)' }}>
        <Timer size={12} style={{ color: '#C9A227' }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#C9A227' }}>Confirming...</span>
      </div>
    );
  }

  if (chain.status === 'queued') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(201, 162, 39, 0.1)' }}>
        <Clock size={12} style={{ color: '#C9A227' }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#C9A227' }}>Queued</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255, 107, 107, 0.1)' }}>
      <AlertCircle size={12} style={{ color: '#FF6B6B' }} />
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#FF6B6B' }}>Retry Pending</span>
    </div>
  );
}

export default function CareerHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<CareerItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate('/'); return; }

        const res = await fetch(`${serverUrl}/my-career-history`, {
          headers: authHeaders(session.access_token),
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.log('Career history fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [navigate]);

  const verifiedCount = history.filter(h => h.on_chain?.status === 'confirmed').length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <div
        className="px-6 pb-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, #081A33 0%, #0F2847 50%, #14335B 100%)',
          paddingTop: 'max(3rem, calc(env(safe-area-inset-top, 0px) + 1.25rem))',
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
        <div className="relative">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 mb-4"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <ArrowLeft size={20} style={{ color: '#ffffff' }} />
          </button>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 500 }}>
            Career Record
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
            Work History
          </h1>
          {!loading && history.length > 0 && (
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(91, 165, 165, 0.2)' }}>
                <ShieldCheck size={12} style={{ color: '#5BA5A5' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#5BA5A5' }}>
                  {verifiedCount}/{history.length} Verified
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                <Building2 size={12} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>
                  {history.length} Position{history.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-8 -mt-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin" style={{ color: '#5BA5A5' }} />
          </div>
        ) : history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 text-center"
            style={{ boxShadow: '0 8px 32px rgba(8, 26, 51, 0.08)' }}
          >
            <Building2 size={40} style={{ color: '#D1D5DB', margin: '0 auto 16px' }} />
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#081A33', marginBottom: '8px' }}>No Work History</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
              Join a company through Affiliation to start building your verified career record.
            </p>
            <button
              onClick={() => navigate('/app/account/affiliation')}
              className="mt-5 px-6 py-3 rounded-2xl transition-all active:scale-95"
              style={{ backgroundColor: '#5BA5A5', color: '#ffffff', fontSize: '14px', fontWeight: 600 }}
            >
              Apply for Affiliation
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => {
              const isExpanded = expandedId === item.company_member_id;
              const isActive = item.member_status === 'active';

              return (
                <motion.div
                  key={item.company_member_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-3xl overflow-hidden"
                  style={{ boxShadow: '0 2px 8px rgba(8, 26, 51, 0.06)' }}
                >
                  {/* Main Row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.company_member_id)}
                    className="w-full p-5 text-left transition-all active:bg-gray-50"
                  >
                    {/* Top row: icon + name + chevron */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{
                          background: item.company_logo_url ? 'transparent' : 'linear-gradient(135deg, #5BA5A5 0%, #4a9090 100%)',
                        }}
                      >
                        {item.company_logo_url ? (
                          <img src={item.company_logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 size={20} style={{ color: '#ffffff' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate" style={{ fontSize: '16px', fontWeight: 700, color: '#081A33', letterSpacing: '-0.3px' }}>
                            {item.company_name}
                          </h3>
                          {isActive && (
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#5BA5A5' }} />
                          )}
                        </div>
                        <p className="truncate" style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
                          {item.job_title || item.member_role}
                          {item.company_location && ` · ${item.company_location}`}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} className="flex-shrink-0" style={{ color: '#9CA3AF' }} />
                      ) : (
                        <ChevronDown size={16} className="flex-shrink-0" style={{ color: '#9CA3AF' }} />
                      )}
                    </div>

                    {/* Bottom row: date range + status badge */}
                    <div className="flex items-center justify-between pl-14">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                          {formatDate(item.started_at)} — {item.ended_at ? formatDate(item.ended_at) : 'Present'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#D1D5DB' }}>
                          {durationLabel(item.started_at, item.ended_at)}
                        </span>
                      </div>
                      <ChainStatusBadge chain={item.on_chain} />
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="px-5 pb-5 pt-0 space-y-4"
                          style={{ borderTop: '1px solid rgba(8, 26, 51, 0.06)' }}
                        >
                          {/* Stats */}
                          <div className="flex gap-3 pt-4">
                            <div className="flex-1 p-3.5 rounded-2xl" style={{ backgroundColor: 'rgba(255, 107, 107, 0.06)' }}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Heart size={12} style={{ color: '#FF6B6B' }} />
                                <span style={{ fontSize: '10px', color: '#FF6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                  Kudos
                                </span>
                              </div>
                              <div style={{ fontSize: '24px', fontWeight: 700, color: '#081A33' }}>
                                {item.kudos_count}
                              </div>
                            </div>
                            <div className="flex-1 p-3.5 rounded-2xl" style={{ backgroundColor: 'rgba(91, 165, 165, 0.06)' }}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Clock size={12} style={{ color: '#5BA5A5' }} />
                                <span style={{ fontSize: '10px', color: '#5BA5A5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                  Duration
                                </span>
                              </div>
                              <div style={{ fontSize: '16px', fontWeight: 700, color: '#081A33' }}>
                                {durationLabel(item.started_at, item.ended_at)}
                              </div>
                            </div>
                          </div>

                          {/* On-Chain Verification */}
                          <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FAFBFC', border: '1px solid rgba(8, 26, 51, 0.06)' }}>
                            <div className="flex items-center gap-2 mb-3">
                              <ShieldCheck size={14} style={{ color: '#5BA5A5' }} />
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#081A33' }}>
                                On-Chain Verification
                              </span>
                            </div>

                            {item.on_chain ? (
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Status</span>
                                  <div className="flex items-center gap-1.5">
                                    {item.on_chain.status === 'confirmed' ? (
                                      <CheckCircle2 size={12} style={{ color: '#5BA5A5' }} />
                                    ) : (
                                      <Clock size={12} style={{ color: '#C9A227' }} />
                                    )}
                                    <span style={{
                                      fontSize: '12px', fontWeight: 600,
                                      color: item.on_chain.status === 'confirmed' ? '#5BA5A5' : '#C9A227'
                                    }}>
                                      {item.on_chain.status === 'confirmed' ? 'Confirmed' :
                                       item.on_chain.status === 'submitted' ? 'Pending Confirmation' :
                                       item.on_chain.status === 'queued' ? 'Queued' : 'Retrying'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Network</span>
                                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#081A33' }}>
                                    {item.on_chain.chain_id === 43114 ? 'Avalanche C-Chain' : 'Avalanche Fuji Testnet'}
                                  </span>
                                </div>

                                {item.on_chain.confirmed_at && (
                                  <div className="flex items-center justify-between">
                                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Confirmed At</span>
                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#081A33' }}>
                                      {new Date(item.on_chain.confirmed_at).toLocaleDateString('en-US', {
                                        year: 'numeric', month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                )}

                                {item.on_chain.anchor_hash && (
                                  <div>
                                    <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>Anchor Hash</span>
                                    <div
                                      className="px-3 py-2 rounded-xl font-mono break-all"
                                      style={{ fontSize: '10px', color: '#6B7280', backgroundColor: '#ffffff', border: '1px solid rgba(8, 26, 51, 0.06)' }}
                                    >
                                      {item.on_chain.anchor_hash}
                                    </div>
                                  </div>
                                )}

                                {item.on_chain.tx_hash && (
                                  <div>
                                    <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>Transaction Hash</span>
                                    {item.on_chain.explorer_url ? (
                                      <a
                                        href={item.on_chain.explorer_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-opacity active:opacity-70"
                                        style={{ backgroundColor: '#ffffff', border: '1px solid rgba(91, 165, 165, 0.3)', textDecoration: 'none' }}
                                      >
                                        <span className="font-mono break-all flex-1" style={{ fontSize: '10px', color: '#5BA5A5' }}>
                                          {item.on_chain.tx_hash}
                                        </span>
                                        <ExternalLink size={12} className="flex-shrink-0" style={{ color: '#5BA5A5' }} />
                                      </a>
                                    ) : (
                                      <div
                                        className="px-3 py-2 rounded-xl font-mono break-all"
                                        style={{ fontSize: '10px', color: '#6B7280', backgroundColor: '#ffffff', border: '1px solid rgba(8, 26, 51, 0.06)' }}
                                      >
                                        {item.on_chain.tx_hash}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {item.on_chain.explorer_url && (
                                  <a
                                    href={item.on_chain.explorer_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl transition-all active:scale-[0.98]"
                                    style={{ backgroundColor: '#5BA5A5', color: '#ffffff', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                                  >
                                    <ExternalLink size={14} />
                                    View on Snowtrace Explorer
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-3">
                                <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                  This affiliation was created before on-chain recording was enabled.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
