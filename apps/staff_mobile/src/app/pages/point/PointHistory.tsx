import { motion } from 'motion/react';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useState } from 'react';

interface Transaction {
  id: number;
  type: 'earned' | 'redeemed';
  amount: number;
  description: string;
  date: string;
  category: string;
}

export default function PointHistory() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'earned' | 'redeemed'>('all');

  const allTransactions: Transaction[] = [
    { id: 1, type: 'earned', amount: 50, description: 'Monthly performance bonus', date: '2026-02-18', category: 'Bonus' },
    { id: 2, type: 'redeemed', amount: -200, description: 'Gift card exchange', date: '2026-02-15', category: 'Exchange' },
    { id: 3, type: 'earned', amount: 100, description: 'Customer satisfaction reward', date: '2026-02-12', category: 'Achievement' },
    { id: 4, type: 'earned', amount: 75, description: 'Team achievement', date: '2026-02-10', category: 'Teamwork' },
    { id: 5, type: 'earned', amount: 50, description: 'Outstanding service', date: '2026-02-08', category: 'Service' },
    { id: 6, type: 'redeemed', amount: -150, description: 'Restaurant voucher', date: '2026-02-05', category: 'Exchange' },
    { id: 7, type: 'earned', amount: 80, description: 'Weekly goal completed', date: '2026-02-01', category: 'Goal' },
    { id: 8, type: 'earned', amount: 120, description: 'Special recognition', date: '2026-01-28', category: 'Achievement' },
    { id: 9, type: 'redeemed', amount: -100, description: 'Wellness program', date: '2026-01-25', category: 'Exchange' },
    { id: 10, type: 'earned', amount: 60, description: 'Training completion', date: '2026-01-20', category: 'Learning' },
    { id: 11, type: 'earned', amount: 90, description: 'Guest feedback excellence', date: '2026-01-15', category: 'Service' },
    { id: 12, type: 'redeemed', amount: -250, description: 'Travel voucher', date: '2026-01-10', category: 'Exchange' },
  ];

  const filteredTransactions = allTransactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  const totalEarned = allTransactions.filter(t => t.type === 'earned').reduce((sum, t) => sum + t.amount, 0);
  const totalRedeemed = Math.abs(allTransactions.filter(t => t.type === 'redeemed').reduce((sum, t) => sum + t.amount, 0));

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <div 
        className="px-6 pt-10 pb-6 relative overflow-hidden"
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
                Transaction History
              </h1>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4"
              style={{
                boxShadow: '0 2px 8px rgba(8, 26, 51, 0.08)'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(91, 165, 165, 0.12)' }}
                >
                  <TrendingUp size={14} style={{ color: '#5BA5A5' }} />
                </div>
                <span style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                  Earned
                </span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#5BA5A5', letterSpacing: '-1px' }}>
                +{totalEarned.toLocaleString()}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl p-4"
              style={{
                boxShadow: '0 2px 8px rgba(8, 26, 51, 0.08)'
              }}
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
                -{totalRedeemed.toLocaleString()}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-4">
        <div className="flex gap-2">
          {(['all', 'earned', 'redeemed'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className="px-4 py-2 rounded-xl transition-all"
              style={{
                backgroundColor: filter === filterOption ? '#081A33' : 'transparent',
                color: filter === filterOption ? '#ffffff' : '#9CA3AF',
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'capitalize'
              }}
            >
              {filterOption === 'redeemed' ? 'used' : filterOption}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-6 pb-24">
        {/* Group by Month */}
        {['February 2026', 'January 2026'].map((month, monthIndex) => {
          const monthTransactions = filteredTransactions.filter(t => {
            const transactionDate = new Date(t.date);
            const monthStr = transactionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            return monthStr === month;
          });

          if (monthTransactions.length === 0) return null;

          return (
            <div key={month} className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1">
                <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {month}
                </h3>
              </div>
              
              <div className="space-y-2">
                {monthTransactions.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (monthIndex * 0.1) + (index * 0.03) }}
                    className="bg-white rounded-2xl p-4"
                    style={{
                      boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: transaction.type === 'earned' 
                              ? 'rgba(91, 165, 165, 0.1)' 
                              : 'rgba(212, 165, 116, 0.1)'
                          }}
                        >
                          {transaction.type === 'earned' ? (
                            <TrendingUp size={16} style={{ color: '#5BA5A5' }} />
                          ) : (
                            <TrendingDown size={16} style={{ color: '#D4A574' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#081A33', marginBottom: '3px' }}>
                            {transaction.description}
                          </div>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                              {new Date(transaction.date).toLocaleDateString('en-US', { 
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
                          color: transaction.type === 'earned' ? '#5BA5A5' : '#D4A574',
                          letterSpacing: '-0.5px',
                          flexShrink: 0,
                          marginLeft: '12px'
                        }}
                      >
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}