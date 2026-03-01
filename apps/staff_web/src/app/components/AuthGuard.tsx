import { Navigate } from 'react-router';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'staff' | 'manager';
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { session, activeMembership, loading, initialized } = useAuth();

  // Show loading spinner while restoring session
  if (!initialized || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FAFBFC]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-[#C9A227] mx-auto mb-4" />
          <p className="text-sm text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  // No session → redirect to login
  if (!session) {
    return <Navigate to="/" replace />;
  }

  // No valid membership → redirect to login with reason
  if (!activeMembership) {
    return <Navigate to="/?reason=no_membership" replace />;
  }

  // Role check: staff can access /staff, manager can access both /staff and /manager
  if (requiredRole === 'manager' && activeMembership.member_role !== 'manager') {
    return <Navigate to="/staff" replace />;
  }

  return <>{children}</>;
}