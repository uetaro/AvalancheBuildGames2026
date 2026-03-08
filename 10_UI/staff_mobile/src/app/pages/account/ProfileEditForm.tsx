import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, UserCircle, Check, Loader2, AlertCircle, ChevronDown, Globe, Users, Building2, Camera, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase, serverUrl, authHeaders, authHeadersWithJson } from '../../lib/supabase';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

interface CompanyMemberProfile {
  company_member_id: string;
  company_id: string;
  company_name: string | null;
  member_role: string;
  display_name_override: string;
  job_title: string;
  public_profile_json: {
    languages?: string[];
    certs?: string[];
    bio?: string;
  };
  visibility_scope: string;
  version: number;
  updated_at: string;
}

interface ProfileResponse {
  user_id: string;
  email: string;
  display_name: string;
  auth_name: string | null;
  avatar_url: string | null;
  has_company: boolean;
  company_member: CompanyMemberProfile | null;
}

interface Toast {
  type: 'success' | 'error' | 'info';
  message: string;
}

const VISIBILITY_OPTIONS = [
  { value: 'company', label: 'Company Only', desc: 'Visible to your company members', icon: Building2 },
  { value: 'group', label: 'Group', desc: 'Visible across affiliated companies', icon: Users },
  { value: 'platform', label: 'Platform', desc: 'Visible to all Heartel users', icon: Globe },
];

export default function ProfileEditForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  // Original data from server
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Editable fields
  const [displayNameOverride, setDisplayNameOverride] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [languages, setLanguages] = useState('');
  const [certs, setCerts] = useState('');
  const [bio, setBio] = useState('');
  const [visibilityScope, setVisibilityScope] = useState('company');

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    loadProfile();
  }, []);

  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadProfile = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        navigate('/');
        return;
      }

      const res = await fetch(`${serverUrl}/my-profile`, {
        headers: authHeaders(token),
      });
      const data: ProfileResponse = await res.json();
      console.log('Profile load response:', data);

      if (!res.ok) {
        setToast({ type: 'error', message: (data as any).message || 'Failed to load profile' });
        setIsLoading(false);
        return;
      }

      setProfileData(data);
      setAvatarUrl(data.avatar_url);

      if (data.company_member) {
        const cm = data.company_member;
        setDisplayNameOverride(cm.display_name_override || '');
        setJobTitle(cm.job_title || '');
        setLanguages((cm.public_profile_json?.languages || []).join(', '));
        setCerts((cm.public_profile_json?.certs || []).join(', '));
        setBio(cm.public_profile_json?.bio || '');
        setVisibilityScope(cm.visibility_scope || 'company');
      }
    } catch (err) {
      console.log('Failed to load profile:', err);
      setToast({ type: 'error', message: `Network error: ${err}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setToast({ type: 'error', message: 'Only JPEG, PNG, WebP, and GIF images are allowed' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', message: 'File size must be under 5MB' });
      return;
    }

    // Show local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setAvatarMenuOpen(false);

    // Upload
    setIsUploadingAvatar(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setToast({ type: 'error', message: 'Session expired' });
        setAvatarPreview(null);
        return;
      }

      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${serverUrl}/my-profile/avatar`, {
        method: 'POST',
        headers: authHeaders(token),
        body: formData,
      });

      const data = await res.json();
      console.log('Avatar upload response:', res.status, data);

      if (!res.ok) {
        setToast({ type: 'error', message: data.message || 'Failed to upload avatar' });
        setAvatarPreview(null);
        return;
      }

      setAvatarUrl(data.avatar_url);
      setAvatarPreview(null);
      setToast({ type: 'success', message: 'Profile photo updated' });

    } catch (err) {
      console.log('Avatar upload error:', err);
      setToast({ type: 'error', message: `Upload failed: ${err}` });
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarMenuOpen(false);
    setIsUploadingAvatar(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setToast({ type: 'error', message: 'Session expired' });
        return;
      }

      const res = await fetch(`${serverUrl}/my-profile/avatar`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });

      const data = await res.json();
      console.log('Avatar delete response:', res.status, data);

      if (!res.ok) {
        setToast({ type: 'error', message: data.message || 'Failed to remove photo' });
        return;
      }

      setAvatarUrl(null);
      setAvatarPreview(null);
      setToast({ type: 'success', message: 'Profile photo removed' });

    } catch (err) {
      console.log('Avatar delete error:', err);
      setToast({ type: 'error', message: `Delete failed: ${err}` });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!profileData?.company_member) {
      setToast({ type: 'error', message: 'No company membership to edit' });
      return;
    }

    setIsSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setToast({ type: 'error', message: 'Session expired. Please sign in again.' });
        setIsSaving(false);
        return;
      }

      const publicProfileJson: Record<string, any> = {};
      const langArr = languages.split(',').map(s => s.trim()).filter(Boolean);
      const certArr = certs.split(',').map(s => s.trim()).filter(Boolean);
      if (langArr.length > 0) publicProfileJson.languages = langArr;
      if (certArr.length > 0) publicProfileJson.certs = certArr;
      if (bio.trim()) publicProfileJson.bio = bio.trim();

      const requestBody = {
        expected_version: profileData.company_member.version,
        display_name_override: displayNameOverride.trim() || '',
        job_title: jobTitle.trim() || '',
        public_profile_json: publicProfileJson,
        visibility_scope: visibilityScope,
        client_request_id: `profile-${Date.now()}`,
      };

      console.log('Profile update request:', requestBody);

      const res = await fetch(`${serverUrl}/my-profile`, {
        method: 'PUT',
        headers: authHeadersWithJson(token),
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      console.log('Profile update response:', res.status, data);

      if (!res.ok) {
        if (data.error_code === 'VERSION_CONFLICT') {
          setToast({ type: 'error', message: 'Profile was modified elsewhere. Reloading...' });
          setTimeout(() => loadProfile(), 1500);
        } else {
          setToast({ type: 'error', message: data.message || 'Failed to save profile' });
        }
        setIsSaving(false);
        return;
      }

      setToast({ type: 'success', message: 'Profile updated successfully' });
      setTimeout(() => navigate('/app/account'), 1200);

    } catch (err) {
      console.log('Profile save error:', err);
      setToast({ type: 'error', message: `Network error: ${err}` });
    } finally {
      setIsSaving(false);
    }
  };

  const displayAvatarSrc = avatarPreview || avatarUrl;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="animate-spin w-8 h-8 border-3 border-t-transparent rounded-full"
             style={{ borderColor: '#5BA5A5', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const hasCompany = profileData?.has_company && profileData?.company_member;
  const selectedVisibility = VISIBILITY_OPTIONS.find(v => v.value === visibilityScope) || VISIBILITY_OPTIONS[0];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarSelect}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-0 left-0 right-0 z-50 px-4 pt-4"
            style={{ maxWidth: '480px', margin: '0 auto' }}
          >
            <div
              className="flex items-center gap-3 px-5 py-4 rounded-2xl shadow-lg"
              style={{ backgroundColor: '#ffffff', boxShadow: '0 8px 32px rgba(8, 26, 51, 0.12)' }}
            >
              {toast.type === 'success' && <Check size={18} style={{ color: '#5BA5A5', flexShrink: 0 }} />}
              {toast.type === 'error' && <AlertCircle size={18} style={{ color: '#FF6B6B', flexShrink: 0 }} />}
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#081A33' }}>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Menu Overlay */}
      <AnimatePresence>
        {avatarMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(8, 26, 51, 0.4)' }}
            onClick={() => setAvatarMenuOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-10"
              style={{ maxWidth: '480px', margin: '0 auto', boxShadow: '0 -8px 32px rgba(8, 26, 51, 0.12)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#081A33' }}>
                  Profile Photo
                </h3>
                <button
                  onClick={() => setAvatarMenuOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(8, 26, 51, 0.05)' }}
                >
                  <X size={16} style={{ color: '#6B7280' }} />
                </button>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => { setAvatarMenuOpen(false); fileInputRef.current?.click(); }}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(91, 165, 165, 0.06)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(91, 165, 165, 0.12)' }}
                  >
                    <Camera size={18} style={{ color: '#5BA5A5' }} />
                  </div>
                  <div className="text-left">
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#081A33' }}>
                      {displayAvatarSrc ? 'Change Photo' : 'Upload Photo'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      JPEG, PNG, WebP or GIF (max 5MB)
                    </div>
                  </div>
                </button>
                {displayAvatarSrc && (
                  <button
                    onClick={handleAvatarDelete}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]"
                    style={{ backgroundColor: 'rgba(255, 107, 107, 0.06)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(255, 107, 107, 0.12)' }}
                    >
                      <Trash2 size={18} style={{ color: '#FF6B6B' }} />
                    </div>
                    <div className="text-left">
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#FF6B6B' }}>
                        Remove Photo
                      </div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                        Reset to default avatar
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div
        className="px-6 pt-12 pb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(165deg, #081A33 0%, #0F2847 50%, #14335B 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.8) 1px, transparent 1px),
                             radial-gradient(circle at 80% 80%, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/app/account')}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div className="flex-1">
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 500 }}>
                Account
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
                Edit Profile
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-4 pb-32">
        {/* Avatar + Name Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl mb-4 p-6"
          style={{ boxShadow: '0 8px 32px rgba(8, 26, 51, 0.08)' }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar with edit button */}
            <button
              onClick={() => setAvatarMenuOpen(true)}
              disabled={isUploadingAvatar}
              className="relative flex-shrink-0 group"
            >
              <div
                className="flex items-center justify-center rounded-full overflow-hidden"
                style={{
                  width: '72px',
                  height: '72px',
                  background: displayAvatarSrc ? 'transparent' : 'linear-gradient(135deg, #D4A574 0%, #C9995E 100%)',
                }}
              >
                {displayAvatarSrc ? (
                  <ImageWithFallback
                    src={displayAvatarSrc}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    style={{ display: 'block' }}
                  />
                ) : (
                  <UserCircle size={40} className="text-white" />
                )}
              </div>
              {/* Camera overlay */}
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center transition-opacity"
                style={{
                  backgroundColor: 'rgba(8, 26, 51, 0.35)',
                  opacity: isUploadingAvatar ? 1 : 0,
                }}
              >
                {isUploadingAvatar && (
                  <Loader2 size={22} className="text-white animate-spin" />
                )}
              </div>
              {/* Camera badge */}
              {!isUploadingAvatar && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white"
                  style={{ backgroundColor: '#081A33' }}
                >
                  <Camera size={12} className="text-white" />
                </div>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#081A33', marginBottom: '2px' }}>
                {displayNameOverride || profileData?.display_name || '(No Name)'}
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>
                {profileData?.email}
              </div>
              {profileData?.company_member?.company_name && (
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                  {profileData.company_member.company_name} · {profileData.company_member.member_role}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* No Company Warning */}
        {!hasCompany && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-3xl mb-4 p-5 flex items-start gap-3"
            style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)', border: '1.5px solid rgba(201, 162, 39, 0.2)' }}
          >
            <AlertCircle size={18} style={{ color: '#C9A227', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#081A33', marginBottom: '4px' }}>
                No Company Affiliation
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.5 }}>
                Profile editing requires an active company membership. Please submit an affiliation request first.
              </div>
            </div>
          </motion.div>
        )}

        {/* Form Fields */}
        {hasCompany && (
          <>
            {/* Basic Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl overflow-hidden mb-4"
              style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}
            >
              <div className="px-6 pt-5 pb-1">
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#081A33' }}>
                  Basic Information
                </h3>
              </div>
              <div className="p-6 pt-4 space-y-5">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayNameOverride}
                    onChange={(e) => setDisplayNameOverride(e.target.value)}
                    placeholder={profileData?.auth_name || 'Enter display name'}
                    maxLength={50}
                    className="w-full rounded-xl px-4 py-3 outline-none transition-all"
                    style={{ fontSize: '15px', color: '#081A33', backgroundColor: '#F8F9FA', border: '1.5px solid transparent' }}
                    onFocus={(e) => { e.target.style.borderColor = '#5BA5A5'; e.target.style.backgroundColor = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = '#F8F9FA'; }}
                  />
                  <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                    Overrides your account name within this company. Leave empty to use default.
                  </p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Front Desk Manager"
                    maxLength={50}
                    className="w-full rounded-xl px-4 py-3 outline-none transition-all"
                    style={{ fontSize: '15px', color: '#081A33', backgroundColor: '#F8F9FA', border: '1.5px solid transparent' }}
                    onFocus={(e) => { e.target.style.borderColor = '#5BA5A5'; e.target.style.backgroundColor = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = '#F8F9FA'; }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Public Profile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-3xl overflow-hidden mb-4"
              style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}
            >
              <div className="px-6 pt-5 pb-1">
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#081A33' }}>
                  Public Profile
                </h3>
              </div>
              <div className="p-6 pt-4 space-y-5">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                    Languages
                  </label>
                  <input
                    type="text"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    placeholder="e.g. ja, en, zh"
                    className="w-full rounded-xl px-4 py-3 outline-none transition-all"
                    style={{ fontSize: '15px', color: '#081A33', backgroundColor: '#F8F9FA', border: '1.5px solid transparent' }}
                    onFocus={(e) => { e.target.style.borderColor = '#5BA5A5'; e.target.style.backgroundColor = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = '#F8F9FA'; }}
                  />
                  <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                    Separate multiple languages with commas
                  </p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                    Certifications
                  </label>
                  <input
                    type="text"
                    value={certs}
                    onChange={(e) => setCerts(e.target.value)}
                    placeholder="e.g. Sommelier, TOEIC 900"
                    className="w-full rounded-xl px-4 py-3 outline-none transition-all"
                    style={{ fontSize: '15px', color: '#081A33', backgroundColor: '#F8F9FA', border: '1.5px solid transparent' }}
                    onFocus={(e) => { e.target.style.borderColor = '#5BA5A5'; e.target.style.backgroundColor = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = '#F8F9FA'; }}
                  />
                  <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                    Separate multiple certifications with commas
                  </p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 outline-none transition-all resize-none"
                    style={{ fontSize: '15px', color: '#081A33', backgroundColor: '#F8F9FA', border: '1.5px solid transparent' }}
                    onFocus={(e) => { e.target.style.borderColor = '#5BA5A5'; e.target.style.backgroundColor = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = '#F8F9FA'; }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Visibility Scope */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl overflow-hidden mb-6"
              style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}
            >
              <div className="px-6 pt-5 pb-1">
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#081A33' }}>
                  Visibility
                </h3>
              </div>
              <div className="p-6 pt-4">
                <button
                  onClick={() => setVisibilityOpen(!visibilityOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                  style={{ backgroundColor: '#F8F9FA', border: '1.5px solid transparent' }}
                >
                  <div className="flex items-center gap-3">
                    <selectedVisibility.icon size={16} style={{ color: '#5BA5A5' }} />
                    <div className="text-left">
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#081A33' }}>
                        {selectedVisibility.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                        {selectedVisibility.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    size={16}
                    style={{ color: '#9CA3AF', transition: 'transform 0.2s', transform: visibilityOpen ? 'rotate(180deg)' : 'none' }}
                  />
                </button>
                <AnimatePresence>
                  {visibilityOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-1">
                        {VISIBILITY_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const isSelected = visibilityScope === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => { setVisibilityScope(opt.value); setVisibilityOpen(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                              style={{
                                backgroundColor: isSelected ? 'rgba(91, 165, 165, 0.08)' : 'transparent',
                                border: isSelected ? '1.5px solid #5BA5A5' : '1.5px solid transparent',
                              }}
                            >
                              <Icon size={16} style={{ color: isSelected ? '#5BA5A5' : '#9CA3AF' }} />
                              <div className="text-left flex-1">
                                <div style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#081A33' : '#6B7280' }}>
                                  {opt.label}
                                </div>
                                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                  {opt.desc}
                                </div>
                              </div>
                              {isSelected && <Check size={16} style={{ color: '#5BA5A5' }} />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Save Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-4 rounded-3xl text-white font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                background: isSaving ? '#9CA3AF' : 'linear-gradient(135deg, #081A33 0%, #0F2847 100%)',
                fontSize: '15px',
                fontWeight: 600,
                boxShadow: isSaving ? 'none' : '0 8px 32px rgba(8, 26, 51, 0.2)',
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Save Changes
                </>
              )}
            </motion.button>

            {profileData?.company_member && (
              <p className="text-center mt-4" style={{ fontSize: '11px', color: '#D1D5DB' }}>
                Version {profileData.company_member.version} · Last updated {new Date(profileData.company_member.updated_at).toLocaleDateString()}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
