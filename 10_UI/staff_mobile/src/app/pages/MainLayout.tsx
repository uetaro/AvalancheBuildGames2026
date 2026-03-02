import { Outlet, useNavigate, useLocation } from 'react-router';
import { useState, useEffect } from 'react';
import { Heart, Briefcase, Coins, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import kudosIcon from 'figma:asset/d13c169a55630b616ca2bbf29b05b5269d82cbb9.png';
import pointIcon from 'figma:asset/5560785a34694df91ca800dfb17c52f6abbe5399.png';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/', { replace: true });
      } else {
        setAuthChecked(true);
      }
    });
  }, [navigate]);

  // Listen for auth state changes (e.g. sign out)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#FAFBFC' }}>
        <div className="animate-spin w-8 h-8 border-3 border-t-transparent rounded-full" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const tabs = [
    { 
      id: 'kudos', 
      label: 'Kudos', 
      icon: Heart,
      color: '#FF6B6B',
      path: '/app/kudos',
      customIcon: kudosIcon
    },
    { 
      id: 'work', 
      label: 'Work', 
      icon: Briefcase,
      color: '#5BA5A5',
      path: '/app/work'
    },
    { 
      id: 'point', 
      label: 'Point', 
      icon: Coins,
      color: '#C9A227',
      path: '/app/point',
      customIcon: pointIcon
    },
    { 
      id: 'account', 
      label: 'Account', 
      icon: User,
      color: '#D4A574',
      path: '/app/account'
    }
  ];

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#FAFBFC', maxWidth: '480px', margin: '0 auto' }}>
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      {/* Bottom Tab Navigation */}
      <div 
        className="fixed bottom-0 left-0 right-0 border-t shadow-2xl"
        style={{ 
          backgroundColor: '#ffffff',
          borderTopColor: 'rgba(8, 26, 51, 0.08)',
          maxWidth: '480px',
          margin: '0 auto'
        }}
      >
        <div className="flex items-center justify-around px-4 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center py-2 px-3 transition-all relative"
                style={{ minWidth: '70px' }}
              >
                {/* Active Indicator */}
                {active && (
                  <div 
                    className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-12 h-1 rounded-full"
                    style={{ backgroundColor: tab.color }}
                  />
                )}
                
                {/* Icon */}
                <div className="mb-1 relative">
                  {tab.customIcon ? (
                    <img 
                      src={tab.customIcon} 
                      alt={tab.label}
                      className="w-7 h-7 transition-all object-contain"
                      style={{ 
                        opacity: active ? 1 : 0.5,
                        filter: active ? 'none' : 'grayscale(50%)'
                      }}
                    />
                  ) : (
                    <Icon 
                      size={26} 
                      style={{ 
                        color: active ? tab.color : '#9CA3AF',
                        strokeWidth: active ? 2.5 : 2
                      }}
                    />
                  )}
                </div>
                
                {/* Label */}
                <span 
                  className="transition-all"
                  style={{ 
                    fontSize: '11px',
                    fontWeight: active ? 500 : 400,
                    color: active ? tab.color : '#9CA3AF'
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}