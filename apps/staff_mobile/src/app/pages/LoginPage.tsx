import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { supabase, serverUrl } from '../lib/supabase';
import { publicAnonKey } from '/utils/supabase/info';
import logoImg from 'figma:asset/10ceb6a2b0a27dff785a9f631a508e43f0bf119d.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Check for existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/app', { replace: true });
      } else {
        setIsCheckingSession(false);
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.log(`Sign-in error: ${authError.message}`);
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (data?.session?.access_token) {
        console.log('Login successful');
        navigate('/app');
      }
    } catch (err) {
      console.log(`Unexpected login error: ${err}`);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${serverUrl}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password, name: email.split('@')[0] }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.log(`Signup API error: ${result.error}`);
        setError(result.error || 'Signup failed');
        setIsLoading(false);
        return;
      }

      // Auto-login after signup
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.log(`Auto-login after signup error: ${authError.message}`);
        setError('Account created! Please sign in.');
        setMode('login');
        setIsLoading(false);
        return;
      }

      if (data?.session?.access_token) {
        console.log('Signup and auto-login successful');
        navigate('/app');
      }
    } catch (err) {
      console.log(`Unexpected signup error: ${err}`);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'linear-gradient(135deg, #081A33 0%, #0A2545 50%, #081A33 100%)' }}>
        <div className="animate-spin w-8 h-8 border-3 border-t-transparent rounded-full" 
             style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #081A33 0%, #0A2545 50%, #081A33 100%)' }}>
      
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 right-10 w-32 h-32 rounded-full opacity-10"
          style={{ background: '#C9A227' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-32 left-10 w-40 h-40 rounded-full opacity-10"
          style={{ background: '#5BA5A5' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 relative z-10 text-center"
      >
        <img src={logoImg} alt="Heartel" className="w-20 h-20 mx-auto mb-4" />
        <h1 className="text-white tracking-wider" style={{ fontSize: '32px', fontWeight: 600 }}>
          Heartel
        </h1>
        <p className="text-white/60 mt-2" style={{ fontSize: '13px' }}>
          Hospitality Excellence Platform
        </p>
      </motion.div>

      {/* Login Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="bg-white rounded-3xl shadow-2xl px-8 py-10">
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-5">
            <div>
              <label htmlFor="email" className="block mb-2" style={{ fontSize: '13px', fontWeight: 500, color: '#081A33' }}>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2"
                style={{ backgroundColor: '#F8F9FA', color: '#081A33', fontSize: '14px' }}
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block mb-2" style={{ fontSize: '13px', fontWeight: 500, color: '#081A33' }}>
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2"
                style={{ backgroundColor: '#F8F9FA', color: '#081A33', fontSize: '14px' }}
                placeholder="••••••••"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'rgba(255, 107, 107, 0.08)' }}
              >
                <p style={{ fontSize: '12px', color: '#FF6B6B', lineHeight: '1.4' }}>
                  {error}
                </p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 text-white rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] mt-6 flex items-center justify-center gap-2"
              style={{ 
                background: isLoading
                  ? '#6B7280'
                  : 'linear-gradient(135deg, #081A33 0%, #0F2D52 100%)',
                fontSize: '15px',
                fontWeight: 600,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle login/signup */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              disabled={isLoading}
              style={{ fontSize: '13px', color: '#6B7280' }}
              className="transition-colors hover:text-[#081A33]"
            >
              {mode === 'login' ? (
                <>Don&apos;t have an account? <span style={{ fontWeight: 600, color: '#5BA5A5' }}>Sign Up</span></>
              ) : (
                <>Already have an account? <span style={{ fontWeight: 600, color: '#5BA5A5' }}>Sign In</span></>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-8 text-center relative z-10"
      >
        <p className="text-white/40" style={{ fontSize: '11px' }}>
          © 2026 Heartel. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}