import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface SellerRouteProps {
  children: React.ReactNode;
}

export function SellerRoute({ children }: SellerRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isVendedor, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isVendedor) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
