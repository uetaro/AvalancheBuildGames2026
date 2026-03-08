import { ArrowLeft, CheckCircle2, CreditCard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { useState } from 'react';
import pointIcon from 'figma:asset/coin.png';

export default function Exchange() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Mock item if no state is passed
  const item = location.state?.item || {
    id: 1,
    name: 'Amazon Gift Card',
    points: 500,
    value: '$50',
    category: 'Gift Card',
    icon: CreditCard,
    color: '#FF6B6B'
  };

  const ItemIcon = item.icon;
  const userPoints = 2850;

  const handleExchange = () => {
    setShowSuccess(true);
    setTimeout(() => {
      navigate('/app/point');
    }, 2000);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAFBFC' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center px-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle2 size={80} style={{ color: '#4CAF50', margin: '0 auto 24px' }} />
          </motion.div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#081A33', marginBottom: '12px' }}>
            Exchange Successful!
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            Your reward will be sent to your email shortly.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFBFC' }}>
      {/* Header */}
      <div 
        className="px-6 pt-12 pb-6"
        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid rgba(8, 26, 51, 0.08)' }}
      >
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/app/point/exchange-list')}
            className="p-2 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
          >
            <ArrowLeft size={24} style={{ color: '#081A33' }} />
          </button>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#081A33' }}>
            Confirm Exchange
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Item Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border mb-6"
          style={{ borderColor: 'rgba(8, 26, 51, 0.08)' }}
        >
          <div className="text-center mb-6">
            <div 
              className="w-32 h-32 mx-auto mb-4 rounded-3xl flex items-center justify-center"
              style={{ backgroundColor: `${item.color}15` }}
            >
              <ItemIcon size={64} style={{ color: item.color }} />
            </div>
            
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#081A33', marginBottom: '8px' }}>
              {item.name}
            </h2>
            
            <div 
              className="inline-block px-3 py-1 rounded-full"
              style={{ 
                fontSize: '12px', 
                backgroundColor: '#F8F9FA',
                color: '#6B7280'
              }}
            >
              {item.category}
            </div>
          </div>

          <div 
            className="border-t border-b py-4 mb-4"
            style={{ borderColor: 'rgba(8, 26, 51, 0.08)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                Value
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#081A33' }}>
                {item.value}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                Required Points
              </span>
              <div className="flex items-center gap-1">
                <img src={pointIcon} alt="Points" className="w-5 h-5" />
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#C9A227' }}>
                  {item.points.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span style={{ fontSize: '14px', color: '#6B7280' }}>
              Your Balance After Exchange
            </span>
            <div className="flex items-center gap-1">
              <img src={pointIcon} alt="Points" className="w-5 h-5" />
              <span style={{ fontSize: '18px', fontWeight: 600, color: '#5BA5A5' }}>
                {(userPoints - item.points).toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-50 rounded-xl p-4 mb-6"
        >
          <p style={{ fontSize: '13px', color: '#081A33', lineHeight: '1.6' }}>
            📧 Your reward will be sent to your registered email address within 24 hours.
            Please check your inbox and spam folder.
          </p>
        </motion.div>

        {/* Buttons */}
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleExchange}
            className="w-full py-4 rounded-xl text-white shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #C9A227 0%, #D4B847 100%)',
              fontSize: '15px',
              fontWeight: 500
            }}
          >
            Confirm Exchange
          </motion.button>

          <button
            onClick={() => navigate('/app/point/exchange-list')}
            className="w-full py-4 rounded-xl transition-all"
            style={{ 
              backgroundColor: '#F8F9FA',
              color: '#6B7280',
              fontSize: '15px',
              fontWeight: 500
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}