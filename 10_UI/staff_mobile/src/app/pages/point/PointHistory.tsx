import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, TrendingDown, Gift } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase, serverUrl, authHeaders } from '../../lib/supabase';

interface ExchangeItem {
  exchange_id: string;
  gift_name: string;
  points_used: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export default function PointHistory() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ExchangeItem[]>([]);
  const [totalUsed, setTotalUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${serverUrl}/my-exchange-history`, {
          headers: authHeaders(session.access_token),
        });
        if (!res.ok) return;
        const json = await res.json();
        setItems(json.items ?? []);
        setTotalUsed(json.total_used ?? 0);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Group by month
  const byMonth = items.reduce<Record<string, ExchangeItem[]>>((acc, item) => {
    const d = new Date(item.created_at);
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const monthKeys = Object.keys(byMonth).sort((a, b) => {
    const da = new Date(a);
    const db = new Date(b);
    return db.getTime() - da.getTime();
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <div
        className="px-6 pt-10 pb-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, #C9A227 0%, #B8922A 50%, #A8822D 100%)'
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
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <ArrowLeft size={18} className="text-white" />
            </button>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
                Exchange History
              </h1>
            </div>
          </div>

          {/* Used summary card only */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4"
            style={{ boxShadow: '0 2px 8px rgba(8, 26, 51, 0.08)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(212, 165, 116, 0.12)' }}
              >
                <TrendingDown size={14} style={{ color: '#D4A574' }} />
              </div>
              <span style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                Used
              </span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#D4A574', letterSpacing: '-1px' }}>
              -{totalUsed.toLocaleString()}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Exchange list */}
      <div className="px-6 pb-24">
        {loading ? (
          <div className="py-12 text-center" style={{ color: '#9CA3AF', fontSize: '14px' }}>
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center" style={{ color: '#9CA3AF', fontSize: '14px' }}>
            No exchange history yet.
          </div>
        ) : (
          monthKeys.map((month) => (
            <div key={month} className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1">
                <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {month}
                </h3>
              </div>

              <div className="space-y-2">
                {byMonth[month].map((item, index) => (
                  <motion.div
                    key={item.exchange_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-white rounded-2xl p-4"
                    style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'rgba(212, 165, 116, 0.1)' }}
                        >
                          <Gift size={16} style={{ color: '#D4A574' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#081A33', marginBottom: '3px' }}>
                            {item.gift_name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                              {new Date(item.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '17px',
                          fontWeight: 700,
                          color: '#D4A574',
                          letterSpacing: '-0.5px',
                          flexShrink: 0,
                          marginLeft: '12px'
                        }}
                      >
                        -{item.points_used.toLocaleString()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
