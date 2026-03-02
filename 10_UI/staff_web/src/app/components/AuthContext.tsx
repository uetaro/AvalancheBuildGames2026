import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/api/make-server-20781d19`;

const supabase: SupabaseClient = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
);

export interface Membership {
  company_member_id: string;
  company_id: string;
  company_name: string;
  member_role: 'staff' | 'manager';
}

interface AuthState {
  session: Session | null;
  memberships: Membership[];
  activeMembership: Membership | null;
  loading: boolean;
  initialized: boolean;
  pendingApproval: boolean;
}

interface AuthContextValue extends AuthState {
  supabase: SupabaseClient;
  signIn: (email: string, password: string) => Promise<{ error?: string; pendingApproval?: boolean }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  selectMembership: (membership: Membership) => void;
  checkMembership: (accessToken: string) => Promise<{ memberships?: Membership[]; error?: string; error_code?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    memberships: [],
    activeMembership: null,
    loading: true,
    initialized: false,
    pendingApproval: false,
  });

  const checkMembership = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/check-membership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[auth] check-membership failed:', data);
        return { error: data.message, error_code: data.error_code };
      }
      return { memberships: data.memberships as Membership[] };
    } catch (err) {
      console.error('[auth] check-membership network error:', err);
      return { error: 'Network error while checking membership' };
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const result = await checkMembership(session.access_token);
          const savedCompanyId = localStorage.getItem('heartel_active_company_id');

          let active: Membership | null = null;
          const isPending = result.error_code === 'NO_MEMBERSHIP';
          if (result.memberships && result.memberships.length > 0) {
            active = result.memberships.find(m => m.company_id === savedCompanyId) || result.memberships[0];
          }

          setState({
            session,
            memberships: result.memberships || [],
            activeMembership: active,
            loading: false,
            initialized: true,
            pendingApproval: isPending,
          });
        } else {
          setState(prev => ({ ...prev, loading: false, initialized: true }));
        }
      } catch (err) {
        console.error('[auth] restore session error:', err);
        setState(prev => ({ ...prev, loading: false, initialized: true }));
      }
    };

    restoreSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({ ...prev, session }));
    });

    return () => subscription.unsubscribe();
  }, [checkMembership]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[auth] signIn error:', error.message);
        return { error: 'Invalid email or password. Please try again.' };
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        return { error: 'Failed to obtain session token' };
      }

      // Check membership
      const result = await checkMembership(accessToken);
      if (result.error) {
        // If NO_MEMBERSHIP, user exists but not yet approved — show pending state
        if (result.error_code === 'NO_MEMBERSHIP') {
          setState(prev => ({
            ...prev,
            session: data.session,
            memberships: [],
            activeMembership: null,
            pendingApproval: true,
          }));
          return { pendingApproval: true };
        }
        // Other errors (e.g. COMPANY_SUSPENDED) — sign out
        await supabase.auth.signOut();
        return { error: result.error };
      }

      const memberships = result.memberships || [];
      const savedCompanyId = localStorage.getItem('heartel_active_company_id');
      let active: Membership | null = null;
      if (memberships.length > 0) {
        active = memberships.find(m => m.company_id === savedCompanyId) || memberships[0];
        localStorage.setItem('heartel_active_company_id', active.company_id);
      }

      setState(prev => ({
        ...prev,
        session: data.session,
        memberships,
        activeMembership: active,
      }));

      return {};
    } catch (err) {
      console.error('[auth] signIn unexpected error:', err);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }, [checkMembership]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.message || 'Signup failed' };
      }
      return {};
    } catch (err) {
      console.error('[auth] signUp error:', err);
      return { error: 'Network error during signup' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('heartel_active_company_id');
    setState({
      session: null,
      memberships: [],
      activeMembership: null,
      loading: false,
      initialized: true,
      pendingApproval: false,
    });
  }, []);

  const selectMembership = useCallback((membership: Membership) => {
    localStorage.setItem('heartel_active_company_id', membership.company_id);
    setState(prev => ({ ...prev, activeMembership: membership }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        supabase,
        signIn,
        signUp,
        signOut,
        selectMembership,
        checkMembership,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}