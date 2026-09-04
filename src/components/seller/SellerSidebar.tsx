import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Plus,
  ArrowLeft,
  Menu,
  Banknote,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { type StoreRole } from '@/hooks/useStores';

const allMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/seller', roles: ['gerente', 'vendedor', 'vendedor_externo'] },
  { icon: ShoppingBag, label: 'Pedidos', path: '/seller/orders', roles: ['gerente', 'vendedor', 'vendedor_externo'] },
  { icon: Plus, label: 'Novo Pedido', path: '/seller/orders/new', roles: ['gerente', 'vendedor', 'vendedor_externo'] },
  { icon: Package, label: 'Produtos', path: '/seller/products', roles: ['gerente', 'vendedor'] },
  { icon: Banknote, label: 'Caixa', path: '/seller/cash-register', roles: ['gerente', 'vendedor'] },
];

interface SellerSidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  storeRole?: StoreRole;
  storeName?: string;
}

function SidebarContent({ onItemClick, storeRole, storeName }: { onItemClick?: () => void; storeRole?: StoreRole; storeName?: string }) {
  const location = useLocation();
  const role = storeRole || 'vendedor';
  const menuItems = allMenuItems.filter(item => item.roles.includes(role));

  return (
    <>
      {/* Store name */}
      {storeName && (
        <div className="px-6 py-2 border-b border-background/10">
          <p className="text-xs text-background/50 uppercase tracking-wider">Loja</p>
          <p className="text-sm text-background/90 font-light truncate">{storeName}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/seller' && location.pathname.startsWith(item.path));
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onItemClick}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm tracking-wide transition-colors",
                    isActive 
                      ? "bg-background text-foreground" 
                      : "text-background/70 hover:text-background hover:bg-background/10"
                  )}
                >
                  <item.icon className="h-4 w-4" strokeWidth={1.5} />
                  <span className="font-light">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Back to Store */}
      <div className="p-4 border-t border-background/10">
        <NavLink
          to="/"
          onClick={onItemClick}
          className="flex items-center gap-3 px-4 py-3 text-sm tracking-wide text-background/70 hover:text-background transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          <span className="font-light">Voltar à Loja</span>
        </NavLink>
      </div>
    </>
  );
}

export function SellerSidebar({ open, onOpenChange, storeRole, storeName }: SellerSidebarProps) {
  const isMobile = useIsMobile();

  const roleLabel = storeRole === 'gerente' ? 'Gerente' : storeRole === 'vendedor_externo' ? 'Vendedor Externo' : 'Vendedor';

  // Mobile: Drawer
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-64 p-0 bg-foreground text-background border-none">
          {/* Header */}
          <div className="p-6 border-b border-background/10 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-light tracking-[0.2em] uppercase">
                {roleLabel}
              </h1>
            </div>
          </div>
          <SidebarContent onItemClick={() => onOpenChange?.(false)} storeRole={storeRole} storeName={storeName} />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside className="w-64 min-h-screen bg-foreground text-background flex flex-col shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-background/10">
        <h1 className="text-lg font-light tracking-[0.2em] uppercase">
          {roleLabel}
        </h1>
      </div>
      <SidebarContent storeRole={storeRole} storeName={storeName} />
    </aside>
  );
}

// Mobile Header component
export function SellerMobileHeader({ onMenuClick, storeName }: { onMenuClick: () => void; storeName?: string }) {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-foreground text-background h-14 flex items-center justify-between px-4 border-b border-background/10">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="text-background hover:bg-background/10"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <span className="text-sm font-light tracking-[0.2em] uppercase">Painel</span>
          {storeName && <span className="text-[10px] text-background/50 truncate max-w-[150px]">{storeName}</span>}
        </div>
      </div>
      <NavLink
        to="/"
        className="flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="font-light">Loja</span>
      </NavLink>
    </header>
  );
}
