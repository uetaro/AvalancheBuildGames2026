import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';

export default function WorkActivity() {
  const navigate = useNavigate();

  const recentActivity = [
    { date: '2026-02-28', dayOfWeek: 'Friday', checkIn: '09:00', checkOut: '18:00', duration: '9h 00m', isToday: true },
    { date: '2026-02-27', dayOfWeek: 'Thursday', checkIn: '09:00', checkOut: '18:00', duration: '9h 00m', isToday: false },
    { date: '2026-02-26', dayOfWeek: 'Wednesday', checkIn: '08:45', checkOut: '17:30', duration: '8h 45m', isToday: false },
    { date: '2026-02-25', dayOfWeek: 'Tuesday', checkIn: '09:15', checkOut: '18:15', duration: '9h 00m', isToday: false },
    { date: '2026-02-24', dayOfWeek: 'Monday', checkIn: '09:00', checkOut: '18:30', duration: '9h 30m', isToday: false },
    { date: '2026-02-21', dayOfWeek: 'Friday', checkIn: '08:50', checkOut: '18:00', duration: '9h 10m', isToday: false },
    { date: '2026-02-20', dayOfWeek: 'Thursday', checkIn: '09:05', checkOut: '17:45', duration: '8h 40m', isToday: false },
  ];

  // Calculate total hours this week
  const totalHoursThisWeek = recentActivity.slice(0, 5).reduce((acc, activity) => {
    const [hours, minutes] = activity.duration.split(' ');
    return acc + parseInt(hours.replace('h', '')) + parseInt(minutes.replace('m', '')) / 60;
  }, 0);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#FAFBFC' }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-4 transition-all active:scale-95"
        >
          <ChevronLeft size={20} style={{ color: '#081A33' }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#081A33' }}>
            Back
          </span>
        </button>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#081A33', marginBottom: '4px' }}>
          Recent Activity
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          Your work history and hours
        </p>
      </div>

      {/* Stats Card */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '4px' }}>
                This Week
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#5BA5A5' }}>
                {Math.floor(totalHoursThisWeek)}h {Math.round((totalHoursThisWeek % 1) * 60)}m
              </div>
            </div>
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#F0F9FF' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5BA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-3">
          {recentActivity.map((activity, index) => {
            const activityDate = new Date(activity.date);
            const monthDay = activityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            return (
              <motion.div
                key={activity.date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#081A33' }}>
                        {activity.dayOfWeek}
                      </div>
                      {activity.isToday && (
                        <div 
                          className="px-2 py-0.5 rounded"
                          style={{ backgroundColor: '#FFF5F5' }}
                        >
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#FF6B6B' }}>
                            TODAY
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {monthDay}
                    </div>
                  </div>
                  <div 
                    className="px-3 py-1.5 rounded-xl"
                    style={{ backgroundColor: '#F0F9FF' }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#5BA5A5' }}>
                      {activity.duration}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: '#5BA5A5' }}
                    />
                    <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>
                      {activity.checkIn}
                    </span>
                  </div>
                  <div 
                    style={{ 
                      flex: 1, 
                      height: '1px', 
                      backgroundColor: '#E5E7EB',
                      position: 'relative'
                    }}
                  >
                    <div 
                      className="absolute"
                      style={{ 
                        left: '50%', 
                        top: '50%', 
                        transform: 'translate(-50%, -50%)',
                        width: '20px',
                        height: '2px',
                        backgroundColor: '#D1D5DB'
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>
                      {activity.checkOut}
                    </span>
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: '#FF6B6B' }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
