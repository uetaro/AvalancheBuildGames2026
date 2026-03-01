import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function PublicationRangeSetting() {
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState({
    profile: true,
    kudos: true,
    points: false,
    workHistory: true,
    email: false
  });

  const privacyItems = [
    { 
      id: 'profile', 
      label: 'Profile Information', 
      description: 'Name, photo, and job title'
    },
    { 
      id: 'kudos', 
      label: 'Kudos Activity', 
      description: 'Received and given kudos'
    },
    { 
      id: 'points', 
      label: 'Point Balance', 
      description: 'Total points and history'
    },
    { 
      id: 'workHistory', 
      label: 'Work History', 
      description: 'Attendance and performance'
    },
    { 
      id: 'email', 
      label: 'Email Address', 
      description: 'Contact information'
    }
  ];

  const toggleSetting = (id: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFBFC' }}>
      {/* Header */}
      <div 
        className="px-6 pt-12 pb-6"
        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid rgba(8, 26, 51, 0.08)' }}
      >
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => navigate('/app/account')}
            className="p-2 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
          >
            <ArrowLeft size={24} style={{ color: '#081A33' }} />
          </button>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#081A33' }}>
            Privacy Settings
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
          Control what information is visible to other users in your organization.
        </p>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <div className="space-y-3">
          {privacyItems.map((item, index) => {
            const isEnabled = settings[item.id as keyof typeof settings];
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-sm border"
                style={{ borderColor: 'rgba(8, 26, 51, 0.08)' }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: '15px', fontWeight: 500, color: '#081A33', marginBottom: '4px' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.4' }}>
                      {item.description}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleSetting(item.id as keyof typeof settings)}
                    className="flex-shrink-0 relative transition-all active:scale-95"
                    style={{ width: '52px', height: '30px' }}
                  >
                    <div 
                      className="absolute inset-0 rounded-full transition-all"
                      style={{ 
                        backgroundColor: isEnabled ? '#5BA5A5' : '#E5E7EB'
                      }}
                    />
                    <motion.div
                      animate={{ x: isEnabled ? 22 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 left-1 w-[22px] h-[22px] bg-white rounded-full shadow-md flex items-center justify-center"
                    >
                      {isEnabled ? (
                        <Eye size={12} style={{ color: '#5BA5A5' }} />
                      ) : (
                        <EyeOff size={12} style={{ color: '#9CA3AF' }} />
                      )}
                    </motion.div>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-blue-50 rounded-xl p-4"
        >
          <p style={{ fontSize: '12px', color: '#081A33', lineHeight: '1.6' }}>
            💡 <strong>Note:</strong> Your manager and HR department will always have access to your work-related information regardless of these settings.
          </p>
        </motion.div>

        {/* Save Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          className="w-full mt-6 py-4 rounded-xl text-white shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, #5BA5A5 0%, #6CB5B5 100%)',
            fontSize: '15px',
            fontWeight: 500
          }}
        >
          Save Changes
        </motion.button>
      </div>
    </div>
  );
}
