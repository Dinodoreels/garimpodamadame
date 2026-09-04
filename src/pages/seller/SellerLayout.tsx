import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SellerSidebar, SellerMobileHeader } from '@/components/seller/SellerSidebar';
import { SellerRoute } from '@/components/seller/SellerRoute';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMyStoreRole } from '@/hooks/useStores';

export default function SellerLayout() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: storeInfo } = useMyStoreRole();

  return (
    <SellerRoute>
      <div className="flex min-h-screen bg-muted/30 w-full">
        {/* Mobile Header */}
        {isMobile && (
          <SellerMobileHeader onMenuClick={() => setSidebarOpen(true)} storeName={storeInfo?.storeName} />
        )}

        {/* Sidebar */}
        <SellerSidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          storeRole={storeInfo?.role}
          storeName={storeInfo?.storeName}
        />

        {/* Main Content */}
        <main className={`flex-1 p-3 md:p-8 ${isMobile ? 'pt-16' : ''}`}>
          <Outlet context={{ storeInfo }} />
        </main>
      </div>
    </SellerRoute>
  );
}
