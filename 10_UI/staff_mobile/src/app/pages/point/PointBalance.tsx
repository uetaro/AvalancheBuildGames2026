import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Gift, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import pointIcon from 'figma:asset/coin.png';
import { supabase, serverUrl, authHeaders } from '../../lib/supabase';

interface PointBalanceData {
  balance: number;
  this_month: number;
  monthly_trend: Array<{ month: string; points: number }>;
}

export default function PointBalance() {
  const navigate = useNavigate();
  const [data, setData] = useState<PointBalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${serverUrl}/my-point-balance`, {
          headers: authHeaders(session.access_token),
        });
        if (!res.ok) return;
        const json = await res.json();
        setData(json);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchBalance();
  }, []);

  const totalBalance = data?.balance ?? 0;
  const thisMonth = data?.this_month ?? 0;
  const chartData = data?.monthly_trend ?? [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <div 
        className="px-6 pt-12 pb-8 relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(165deg, #C9A227 0%, #B8922A 50%, #A8822D 100%)'
        }}
      >
        {/* Subtle geometric background */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.8) 1px, transparent 1px),
                             radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Floating elements */}
        <motion.div
          animate={{ 
            y: [0, -8, 0],
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute"
          style={{
            top: '15%',
            right: '10%'
          }}
        >
          <div 
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 70%)',
            }}
          />
        </motion.div>

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 500 }}>
                Rewards Program
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
                Points Balance
              </h1>
            </div>
            <motion.div
              animate={{ 
                rotate: [0, -12, 12, -12, 0],
                y: [0, -4, 0]
              }}
              transition={{ 
                duration: 2.5,
                repeat: Infinity,
                repeatDelay: 3
              }}
              className="w-11 h-11"
            >
              <img src={pointIcon} alt="Points" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 -mt-4 pb-24">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg relative overflow-hidden mb-4"
          style={{
            boxShadow: '0 8px 32px rgba(8, 26, 51, 0.08)'
          }}
        >
          {/* Subtle gradient overlay */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.03) 0%, rgba(91, 165, 165, 0.03) 100%)'
            }}
          />
          
          <div className="relative p-8">
            {/* Total Balance */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Available Balance
                </span>
                <div className="flex items-center gap-1">
                  
                  
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <div style={{ fontSize: '64px', fontWeight: 700, color: '#081A33', letterSpacing: '-3px', lineHeight: '1' }}>
                  {loading ? '—' : totalBalance.toLocaleString()}
                </div>
                <div style={{ fontSize: '18px', color: '#9CA3AF', fontWeight: 600, paddingBottom: '8px' }}>
                  pts
                </div>
              </div>
            </div>

            {/* Mini Chart */}
            <div className="mb-6" style={{ marginLeft: '-8px', marginRight: '-8px' }}>
              <ResponsiveContainer width="100%" height={72}>
                <AreaChart 
                  data={chartData}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="pointsGradientNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C9A227" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="#C9A227" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="points" 
                    stroke="#C9A227" 
                    strokeWidth={2.5}
                    fill="url(#pointsGradientNew)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* This Month Stats */}
            <div 
              className="pt-6 border-t"
              style={{ borderColor: 'rgba(8, 26, 51, 0.06)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    Earned This Month
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div style={{ fontSize: '32px', fontWeight: 700, color: '#5BA5A5', letterSpacing: '-1px' }}>
                      {loading ? '—' : `+${thisMonth}`}
                    </div>
                    <div style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 600 }}>
                      pts
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/app/point/exchange-list')}
            className="bg-white rounded-3xl p-5 relative overflow-hidden group"
            style={{ 
              boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)',
            }}
          >
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-active:scale-95"
                  style={{ 
                    backgroundColor: 'rgba(201, 162, 39, 0.08)'
                  }}
                >
                  <Gift size={20} style={{ color: '#C9A227' }} />
                </div>
                <ArrowUpRight 
                  size={16} 
                  style={{ color: '#D1D5DB' }} 
                  className="transition-all group-active:translate-x-0.5 group-active:-translate-y-0.5 group-active:text-[#C9A227]" 
                />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#081A33', marginBottom: '4px' }}>
                  Exchange
                </div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: '1.4' }}>
                  Redeem your points
                </div>
              </div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/app/point/history')}
            className="bg-white rounded-3xl p-5 relative overflow-hidden group"
            style={{ 
              boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)',
            }}
          >
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-active:scale-95"
                  style={{ 
                    backgroundColor: 'rgba(91, 165, 165, 0.08)'
                  }}
                >
                  <TrendingUp size={20} style={{ color: '#5BA5A5' }} />
                </div>
                <ArrowUpRight 
                  size={16} 
                  style={{ color: '#D1D5DB' }} 
                  className="transition-all group-active:translate-x-0.5 group-active:-translate-y-0.5 group-active:text-[#5BA5A5]" 
                />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#081A33', marginBottom: '4px' }}>
                  Exchange History
                </div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: '1.4' }}>
                  View exchange history
                </div>
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}