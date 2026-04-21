import { Navigate } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected, hasOnboarded } = useAuth();

  if (!isConnected) return <Navigate to="/auth" replace />;
  if (!hasOnboarded) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
