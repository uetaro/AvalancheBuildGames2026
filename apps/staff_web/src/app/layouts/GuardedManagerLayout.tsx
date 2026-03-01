import { AuthGuard } from '../components/AuthGuard';
import ManagerLayout from './ManagerLayout';

export default function GuardedManagerLayout() {
  return (
    <AuthGuard requiredRole="manager">
      <ManagerLayout />
    </AuthGuard>
  );
}
