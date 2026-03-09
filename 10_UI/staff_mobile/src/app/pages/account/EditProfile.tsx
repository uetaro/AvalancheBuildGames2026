import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Bell, Lock, Globe, LogOut, UserCircle, Mail, Briefcase, Calendar, ArrowUpRight, Pencil, Building2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase, serverUrl, authHeaders } from '../../lib/supabase';

interface ProfileData {
  display_name: string;
  email: string;
  job_title: string;
  company_name: string | null;
  member_role: string | null;
  has_company: boolean;
  avatar_url: string | null;
}

export default function EditProfile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '',
    email: '',
    job_title: '',
    company_name: null,
    member_role: null,
    has_company: false,
    avatar_url: null,
  });

  const loadProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }

      const res = await fetch(`${serverUrl}/my-profile`, {
        headers: authHeaders(session.access_token),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Account profile loaded:', data);
        setProfile({
          display_name: data.display_name || '(No Name)',
          email: data.email || '',
          job_title: data.company_member?.job_title || '',
          company_name: data.company_member?.company_name || null,
          member_role: data.company_member?.member_role || null,
          has_company: data.has_company,
          avatar_url: data.avatar_url || null,
        });
      } else {
        // Fallback to auth user data
        const user = session.user;
        setProfile({
          display_name: user.user_metadata?.name || user.email?.split('@')[0] || '(No Name)',
          email: user.email || '',
          job_title: '',
          company_name: null,
          member_role: null,
          has_company: false,
          avatar_url: user.user_metadata?.avatar_url || null,
        });
      }
    } catch (err) {
      console.log('Failed to load profile:', err);
      // Fallback
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setProfile({
          display_name: session.user.user_metadata?.name || '(No Name)',
          email: session.user.email || '',
          job_title: '',
          company_name: null,
          member_role: null,
          has_company: false,
          avatar_url: session.user.user_metadata?.avatar_url || null,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const menuItems = [
    { 
      id: 'career-history', 
      label: 'Career History & Verification', 
      icon: ShieldCheck, 
      color: '#5BA5A5',
      action: () => navigate('/app/account/career')
    },
    { 
      id: 'privacy', 
      label: 'Privacy Settings', 
      icon: Lock, 
      color: '#081A33',
      action: () => navigate('/app/account/publication')
    },
    { 
      id: 'shared-url', 
      label: 'Shared Profile URL', 
      icon: Globe, 
      color: '#C9A227',
      action: () => navigate('/app/account/shared-url')
    },
    { 
      id: 'affiliation', 
      label: 'Affiliation Application', 
      icon: Bell, 
      color: '#FF6B6B',
      action: () => navigate('/app/account/affiliation')
    }
  ];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="animate-spin w-8 h-8 border-3 border-t-transparent rounded-full"
             style={{ borderColor: '#5BA5A5', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const roleLabel = profile.member_role
    ? profile.member_role.charAt(0).toUpperCase() + profile.member_role.slice(1)
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <div 
        className="px-6 pt-12 pb-8 relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(165deg, #081A33 0%, #0F2847 50%, #14335B 100%)'
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 500 }}>
                Your Account
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
                Profile
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-4 pb-24">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg relative overflow-hidden mb-4"
          style={{
            boxShadow: '0 8px 32px rgba(8, 26, 51, 0.08)'
          }}
        >
          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-5">
              <div 
                className="flex items-center justify-center rounded-full flex-shrink-0 overflow-hidden"
                style={{ 
                  width: '64px', 
                  height: '64px', 
                  background: profile.avatar_url ? 'transparent' : 'linear-gradient(135deg, #D4A574 0%, #C9995E 100%)'
                }}
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.style.background = 'linear-gradient(135deg, #D4A574 0%, #C9995E 100%)'; }}
                  />
                ) : (
                  <UserCircle size={36} className="text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#081A33', marginBottom: '4px', letterSpacing: '-0.5px' }}>
                  {profile.display_name}
                </h3>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>
                  {profile.job_title || roleLabel || 'No title set'}
                </p>
              </div>
              <button
                onClick={() => navigate('/app/account/profile/edit')}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                style={{ backgroundColor: 'rgba(8, 26, 51, 0.05)' }}
              >
                <Pencil size={16} style={{ color: '#081A33' }} />
              </button>
            </div>

            <div 
              className="space-y-3 pt-5 border-t" 
              style={{ borderColor: 'rgba(8, 26, 51, 0.06)' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(156, 163, 175, 0.1)' }}
                >
                  <Mail size={14} style={{ color: '#9CA3AF' }} />
                </div>
                <span style={{ fontSize: '14px', color: '#6B7280' }}>
                  {profile.email}
                </span>
              </div>
              {profile.company_name && (
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(156, 163, 175, 0.1)' }}
                  >
                    <Building2 size={14} style={{ color: '#9CA3AF' }} />
                  </div>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>
                    {profile.company_name}
                  </span>
                </div>
              )}
              {profile.job_title && (
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(156, 163, 175, 0.1)' }}
                  >
                    <Briefcase size={14} style={{ color: '#9CA3AF' }} />
                  </div>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>
                    {profile.job_title}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Settings Menu */}
        <div className="mb-4">
          <div className="mb-3 px-1">
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#081A33' }}>
              Settings & Preferences
            </h3>
          </div>
          <div className="space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + (index * 0.05) }}
                  onClick={item.action}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-white rounded-3xl p-5 transition-all flex items-center gap-4 group"
                  style={{
                    boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)'
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-active:scale-95"
                    style={{ backgroundColor: `${item.color}0D` }}
                  >
                    <Icon size={18} style={{ color: item.color }} />
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#081A33', flex: 1, textAlign: 'left' }}>
                    {item.label}
                  </span>
                  <ArrowUpRight 
                    size={16} 
                    style={{ color: '#D1D5DB' }} 
                    className="transition-all group-active:translate-x-0.5 group-active:-translate-y-0.5"
                  />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Logout Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.98 }}
          onClick={async () => {
            await supabase.auth.signOut();
            navigate('/');
          }}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl transition-all"
          style={{ 
            border: '2px solid #FF6B6B',
            color: '#FF6B6B',
            backgroundColor: 'transparent',
            fontSize: '15px',
            fontWeight: 600
          }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </motion.button>

        <p className="text-center mt-6" style={{ fontSize: '11px', color: '#9CA3AF' }}>
          Version 1.0.0 · Heartel 2026
        </p>
      </div>
    </div>
  );
}