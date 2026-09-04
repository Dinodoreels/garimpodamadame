import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ConsignorSidebar, ConsignorMobileHeader } from '@/components/consignor/ConsignorSidebar';
import { ConsignorRoute } from '@/components/consignor/ConsignorRoute';
import { useIsMobile } from '@/hooks/use-mobile';
import { useConsignorSupplier } from '@/hooks/useConsignorData';

export default function ConsignorLayout() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: supplier } = useConsignorSupplier();

  return (
    <ConsignorRoute>
      <div className="flex min-h-screen bg-muted/30 w-full">
        {isMobile && <ConsignorMobileHeader onMenuClick={() => setSidebarOpen(true)} />}
        <ConsignorSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} supplierName={supplier?.name} />
        <main className={`flex-1 p-3 md:p-8 ${isMobile ? 'pt-16' : ''}`}>
          {!supplier ? (
            <div className="max-w-md mx-auto mt-12 text-center space-y-3">
              <h1 className="text-xl font-light">Conta não vinculada</h1>
              <p className="text-sm text-muted-foreground">
                Sua conta de consignador ainda não está vinculada a um fornecedor. Entre em contato com o administrador.
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </ConsignorRoute>
  );
}
