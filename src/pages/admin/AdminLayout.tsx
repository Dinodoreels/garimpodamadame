import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar, AdminMobileHeader } from '@/components/admin/AdminSidebar';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { AdminAIChat } from '@/components/admin/AdminAIChat';
import { useAdminData } from '@/hooks/useAdminData';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileActionsFAB } from '@/components/admin/MobileActionsFAB';
import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { useRealtimeInvalidator } from '@/hooks/useRealtimeInvalidator';

export default function AdminLayout() {
  const { stats } = useAdminData();
  const isMobile = useIsMobile();

  // Mantém DRE, Contabilidade e demais painéis sincronizados em tempo real
  useRealtimeInvalidator(
    ['orders', 'order_items', 'expenses', 'product_variants'],
    [
      'accounting-overview',
      'finance-summary',
      'finance-monthly',
      'finance-payment-methods',
      'finance-expenses-by-category',
      'finance-revenue-by-source',
      'product-profitability',
      'cash-flow-projection',
    ],
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin-sidebar-collapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <AdminRoute>
      <div className="flex min-h-screen bg-muted/30 w-full">
        {/* Mobile Header */}
        {isMobile && (
          <AdminMobileHeader onMenuClick={() => setSidebarOpen(true)} />
        )}

        {/* Sidebar */}
        <AdminSidebar 
          open={sidebarOpen} 
          onOpenChange={setSidebarOpen}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        {/* Main Content */}
        <main className={`flex-1 overflow-x-hidden max-w-full ${isMobile ? 'pt-16' : ''}`}>
          {/* Top bar with notifications (desktop only) */}
          {!isMobile && (
            <div className="flex items-center justify-end px-8 pt-4 pb-0">
              <NotificationCenter />
            </div>
          )}
          <div className="p-3 md:px-8 md:pb-8 md:pt-4">
            <Outlet />
          </div>
        </main>

        {/* Mobile FAB */}
        <MobileActionsFAB />

        {/* AI Chat */}
        <AdminAIChat 
          stats={stats} 
          productCount={0} 
        />
      </div>
    </AdminRoute>
  );
}
