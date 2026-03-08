import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock, UserPlus, Clock, LogOut } from 'lucide-react';
import RectangleVectorized from '../../imports/RectangleVectorized';
import { useAuth } from '../components/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, signOut, session, activeMembership, initialized, pendingApproval } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupName, setSignupName] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  // If already authenticated with valid membership, redirect
  useEffect(() => {
    if (initialized && session && activeMembership) {
      const path = activeMembership.member_role === 'manager' ? '/manager' : '/staff';
      navigate(path, { replace: true });
    }
  }, [initialized, session, activeMembership, navigate]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Show loading while checking existing session
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#081A33] via-[#0A1F3D] to-[#0D2850]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-[#C9A227] mx-auto mb-4" />
          <p className="text-sm text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!validateEmail(email)) { setError('Please enter a valid email address.'); return; }
    if (!password) { setError('Please enter your password.'); return; }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // signIn succeeded — AuthContext now has membership info
    // We need to re-read from auth context. Since state updated, this component will re-render
    // and the redirect at the top will trigger. But let's also navigate explicitly.
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!validateEmail(email)) { setError('Please enter a valid email address.'); return; }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    const result = await signUp(email, password, signupName);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSignupSuccess(true);
    setTimeout(() => {
      setMode('login');
      setSignupSuccess(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#081A33] via-[#0A1F3D] to-[#0D2850]">
      <div className="w-full max-w-md px-8">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div className="w-20 h-20">
            <RectangleVectorized />
          </div>
        </div>

        {/* Pending Approval Screen */}
        {pendingApproval ? (
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#C9A227]/10 flex items-center justify-center mx-auto mb-4">
                <Clock size={32} className="text-[#C9A227]" />
              </div>
              <h1 className="text-2xl font-semibold text-[#081A33] mb-2">Pending Approval</h1>
              <p className="text-[#6B7280] text-sm mb-6 leading-relaxed">
                Your account has been created, but you need to be approved by a manager before you can access the admin portal.
                Please submit an affiliation request via the Heartel app.
              </p>
              <button
                onClick={signOut}
                className="w-full bg-[#081A33] text-white py-3 rounded-lg hover:bg-[#0A2240] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
        /* Login Card */
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-[#081A33] mb-2">Heartel</h1>
            <p className="text-[#6B7280]">
              {mode === 'login' ? 'Admin Portal' : 'Create Account'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 flex items-start gap-2 p-3 bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 rounded-lg">
              <AlertCircle size={16} className="text-[#FF6B6B] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#FF6B6B]">{error}</p>
            </div>
          )}

          {/* Signup Success */}
          {signupSuccess && (
            <div className="mb-6 flex items-start gap-2 p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg">
              <UserPlus size={16} className="text-[#10B981] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#10B981]">Account created! You can now sign in.</p>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm mb-2 text-[#081A33] font-medium">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] bg-white text-[#081A33] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent transition-all"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm mb-2 text-[#081A33] font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 rounded-lg border border-[#E5E7EB] bg-white text-[#081A33] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent transition-all"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#081A33] text-white py-3 rounded-lg hover:bg-[#0A2240] transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label htmlFor="signup-name" className="block text-sm mb-2 text-[#081A33] font-medium">
                  Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] bg-white text-[#081A33] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-sm mb-2 text-[#081A33] font-medium">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E5E7EB] bg-white text-[#081A33] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent transition-all"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-sm mb-2 text-[#081A33] font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-12 py-3 rounded-lg border border-[#E5E7EB] bg-white text-[#081A33] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent transition-all"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C9A227] text-white py-3 rounded-lg hover:bg-[#B8921F] transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Create Account
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
            {mode === 'login' ? (
              <p className="text-sm text-center text-[#6B7280]">
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="text-[#C9A227] font-medium hover:underline"
                >
                  Create one
                </button>
              </p>
            ) : (
              <p className="text-sm text-center text-[#6B7280]">
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('login'); setError(null); setSignupSuccess(false); }}
                  className="text-[#C9A227] font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-white/60">
            &copy; 2026 Heartel. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}