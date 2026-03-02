import { AuthGuard } from '../components/AuthGuard';
import StaffLayout from './StaffLayout';

export default function GuardedStaffLayout() {
  return (
    <AuthGuard requiredRole="staff">
      <StaffLayout />
    </AuthGuard>
  );
}
