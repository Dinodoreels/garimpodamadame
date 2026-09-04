import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, DollarSign, ArrowLeft, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const items = [
  { icon: LayoutDashboard, label: 'Resumo', path: '/consignor' },
  { icon: Package, label: 'Minhas Peças', path: '/consignor/items' },
  { icon: ShoppingBag, label: 'Vendas', path: '/consignor/sales' },
  { icon: DollarSign, label: 'Acerto', path: '/consignor/settlement' },
];

function Content({ onItemClick, supplierName }: { onItemClick?: () => void; supplierName?: string }) {
  return (
    <>
      {supplierName && (
        <div className="px-6 py-2 border-b border-background/10">
          <p className="text-xs text-background/50 uppercase tracking-wider">Fornecedor</p>
          <p className="text-sm text-background/90 font-light truncate">{supplierName}</p>
        </div>
      )}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {items.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/consignor'}
                onClick={onItemClick}
                className={({ isActive }) => cn(
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
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-background/10">
        <NavLink to="/" onClick={onItemClick} className="flex items-center gap-3 px-4 py-3 text-sm tracking-wide text-background/70 hover:text-background transition-colors">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          <span className="font-light">Voltar à Loja</span>
        </NavLink>
      </div>
    </>
  );
}

export function ConsignorSidebar({ open, onOpenChange, supplierName }: { open?: boolean; onOpenChange?: (v: boolean) => void; supplierName?: string }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-64 p-0 bg-foreground text-background border-none">
          <div className="p-6 border-b border-background/10">
            <h1 className="text-lg font-light tracking-[0.2em] uppercase">Consignador</h1>
          </div>
          <Content onItemClick={() => onOpenChange?.(false)} supplierName={supplierName} />
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <aside className="w-64 min-h-screen bg-foreground text-background flex flex-col shrink-0">
      <div className="p-6 border-b border-background/10">
        <h1 className="text-lg font-light tracking-[0.2em] uppercase">Consignador</h1>
      </div>
      <Content supplierName={supplierName} />
    </aside>
  );
}

export function ConsignorMobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-foreground text-background h-14 flex items-center justify-between px-4 border-b border-background/10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="text-background hover:bg-background/10">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-sm font-light tracking-[0.2em] uppercase">Consignador</span>
      </div>
      <NavLink to="/" className="flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span className="font-light">Loja</span>
      </NavLink>
    </header>
  );
}
