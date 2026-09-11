import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, canAccessInbound, loading: adminLoading } = useAdmin();
  const location = useLocation();

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-light tracking-wide">
            Verificando permissões...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isInboundRoute = location.pathname === '/admin/inbound'
    || location.pathname.startsWith('/admin/inbound/');

  if (!isAdmin && !(isInboundRoute && canAccessInbound)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
