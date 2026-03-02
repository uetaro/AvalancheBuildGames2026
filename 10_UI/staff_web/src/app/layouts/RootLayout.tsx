import { Outlet } from 'react-router';
import { AuthProvider } from '../components/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
