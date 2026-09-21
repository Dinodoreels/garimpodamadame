@@
   Search,
+  Workflow,
 } from 'lucide-react';
@@
 const menuItems: MenuItem[] = [
   { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
+  { icon: Workflow, label: 'Operacional', path: '/admin/operations' },
@@
-                  isExpanded ? "max-h-40" : "max-h-0"
+                  isExpanded ? "max-h-[44rem]" : "max-h-0"
import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Package, 
  Settings,
  ArrowLeft,
  MessageCircle,
  Menu,
  Gift,
  BarChart3,
  FileText,
  DollarSign,
  ClipboardCheck,
  PanelLeftClose,
  PanelLeftOpen,
  PenTool,
  Store as StoreIcon,
  Sun,
  Moon,
  Banknote,
  Tag,
  Boxes,
  Zap,
  ChevronRight,
  Calculator,
  CalendarClock,
  Wallet,
  Truck,
  ScanLine,
  MapPin,
  History,
  Search,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

function ThemeToggleButton({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  const btn = (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="text-background/70 hover:text-background hover:bg-background/10 h-8 w-8"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" className="bg-foreground text-background">
          Alternar Tema
        </TooltipContent>
      </Tooltip>
    );
  }

  return btn;
}

type MenuItem = {
  icon: React.ElementType;
  label: string;
  path?: string;
  children?: { icon: React.ElementType; label: string; path: string }[];
};

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: ShoppingBag, label: 'Pedidos', path: '/admin/orders' },
  { icon: Users, label: 'Usuários', path: '/admin/customers' },
  { 
    icon: Package, label: 'Catálogo',
    children: [
      { icon: Package, label: 'Produtos', path: '/admin/products' },
      { icon: Boxes, label: 'Kits', path: '/admin/kits' },
      { icon: Tag, label: 'Etiquetas', path: '/admin/labels' },
      { icon: Boxes, label: 'Consignação', path: '/admin/consignment' },
      { icon: Calculator, label: 'Precificação', path: '/admin/pricing' },
      { icon: CalendarClock, label: 'Validade', path: '/admin/expiry' },
    ]
  },
  {
    icon: Gift, label: 'Vendas',
    children: [
      { icon: Gift, label: 'Promoções', path: '/admin/promotions' },
      { icon: Zap, label: 'Promoções+', path: '/admin/promotions-advanced' },
    ]
  },
  {
    icon: DollarSign, label: 'Contabilidade',
    children: [
      { icon: DollarSign, label: 'Visão Geral', path: '/admin/accounting?tab=overview' },
      { icon: Banknote, label: 'Caixa Diário', path: '/admin/accounting?tab=cash' },
      { icon: ClipboardCheck, label: 'Fechamentos', path: '/admin/accounting?tab=closing' },
      { icon: Boxes, label: 'Estoque Mensal', path: '/admin/accounting?tab=inventory' },
      { icon: Wallet, label: 'Despesas', path: '/admin/accounting?tab=expenses' },
      { icon: DollarSign, label: 'DRE & Dashboard', path: '/admin/accounting?tab=finance' },
    ]
  },
  {
    icon: Truck, label: 'Inbound',
    children: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/inbound' },
      { icon: Truck, label: 'Recebimentos', path: '/admin/inbound/receipts' },
      { icon: Boxes, label: 'Lotes', path: '/admin/inbound/lots' },
      { icon: ScanLine, label: 'Garimpo Scan', path: '/admin/inbound/scan' },
      { icon: ClipboardCheck, label: 'Triagem', path: '/admin/inbound/triage' },
      { icon: ClipboardCheck, label: 'QC', path: '/admin/inbound/qc' },
      { icon: Package, label: 'Produtos identificados', path: '/admin/inbound/identified' },
      { icon: FileText, label: 'Pendências', path: '/admin/inbound/pending' },
      { icon: Boxes, label: 'Estoque', path: '/admin/inbound/stock' },
      { icon: MapPin, label: 'Endereçamento', path: '/admin/inbound/locations' },
      { icon: Tag, label: 'Etiquetas', path: '/admin/inbound/labels' },
      { icon: History, label: 'Histórico', path: '/admin/inbound/history' },
      { icon: Users, label: 'Equipe do galpão', path: '/admin/inbound/team' },
    ]
  },
  { icon: StoreIcon, label: 'Lojas', path: '/admin/stores' },
  { icon: FileText, label: 'Conteúdo', path: '/admin/content' },
  { icon: Search, label: 'SEO', path: '/admin/seo' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: Settings, label: 'Configurações', path: '/admin/settings' },
];

interface AdminSidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  inboundOnly?: boolean;
}

function basePathOf(p: string) {
  const i = p.indexOf('?');
  return i === -1 ? p : p.slice(0, i);
}
function isChildActive(childPath: string, pathname: string, search: string) {
  const base = basePathOf(childPath);
  if (!pathname.startsWith(base)) return false;
  const qIdx = childPath.indexOf('?');
  if (qIdx === -1) return true;
  const childParams = new URLSearchParams(childPath.slice(qIdx + 1));
  const cur = new URLSearchParams(search);
  for (const [k, v] of childParams) {
    if (cur.get(k) !== v) return false;
  }
  return true;
}
function isGroupActive(item: MenuItem, pathname: string) {
  if (item.path) {
    const base = basePathOf(item.path);
    return base === '/admin' ? pathname === '/admin' : pathname.startsWith(base);
  }
  return item.children?.some(c => pathname.startsWith(basePathOf(c.path))) ?? false;
}

function SidebarContent({ onItemClick, collapsed, inboundOnly }: { onItemClick?: () => void; collapsed?: boolean; inboundOnly?: boolean }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState<string[]>(() => {
    // Auto-expand group containing current route
    return menuItems
      .filter(item => item.children && item.children.some(c => location.pathname.startsWith(basePathOf(c.path))))
      .map(item => item.label);
  });

  const toggleGroup = (label: string) => {
    setExpanded(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  return (
    <>
      <nav className={cn("flex-1", collapsed ? "p-2" : "p-4")}>
        <ul className={cn("space-y-0.5", collapsed && "space-y-1")}>
          {(inboundOnly ? menuItems.filter(item => item.label === 'Inbound') : menuItems).map((item) => {
            const active = isGroupActive(item, location.pathname);

            // Simple link (no children)
            if (!item.children && item.path) {
              const linkContent = (
                <NavLink
                  to={item.path}
                  onClick={onItemClick}
                  className={cn(
                    "flex items-center gap-3 text-sm tracking-wide transition-colors",
                    collapsed ? "px-2 py-2.5 justify-center" : "px-4 py-2.5",
                    active
                      ? "bg-background text-foreground"
                      : "text-background/70 hover:text-background hover:bg-background/10"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  {!collapsed && <span className="font-light">{item.label}</span>}
                </NavLink>
              );

              if (collapsed) {
                return (
                  <li key={item.label}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="bg-foreground text-background">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }
              return <li key={item.label}>{linkContent}</li>;
            }

            // Group with children
            const isExpanded = expanded.includes(item.label);

            if (collapsed) {
              return (
                <li key={item.label}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center justify-center w-full px-2 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-background/20 text-background"
                            : "text-background/70 hover:text-background hover:bg-background/10"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-44 p-1 bg-foreground border-background/10">
                      <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-background/50 font-light">
                        {item.label}
                      </p>
                      {item.children!.map(child => {
                        const childActive = isChildActive(child.path, location.pathname, location.search);
                        return (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={onItemClick}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors",
                              childActive
                                ? "bg-background text-foreground"
                                : "text-background/70 hover:text-background hover:bg-background/10"
                            )}
                          >
                            <child.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                            <span className="font-light">{child.label}</span>
                          </NavLink>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                </li>
              );
            }

            return (
              <li key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-2.5 text-sm tracking-wide transition-colors",
                    active
                      ? "text-background"
                      : "text-background/70 hover:text-background hover:bg-background/10"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="font-light flex-1 text-left">{item.label}</span>
                  <ChevronRight className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    isExpanded && "rotate-90"
                  )} />
                </button>
                <div className={cn(
                  "overflow-hidden transition-all duration-200",
                  isExpanded ? "max-h-40" : "max-h-0"
                )}>
                  {item.children!.map(child => {
                    const childActive = isChildActive(child.path, location.pathname, location.search);
                    return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onItemClick}
                        className={cn(
                          "flex items-center gap-3 text-sm tracking-wide transition-colors pl-11 pr-4 py-2",
                          childActive
                            ? "bg-background text-foreground"
                            : "text-background/50 hover:text-background hover:bg-background/10"
                        )}
                      >
                        <child.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                        <span className="font-light">{child.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        {!collapsed && (
          <div className="mt-4 mx-4 p-3 bg-background/5 rounded-md">
            <div className="flex items-center gap-2 text-background/70 text-xs">
              <MessageCircle className="h-3 w-3" />
              <span>Chat IA disponível no canto inferior direito</span>
            </div>
          </div>
        )}
      </nav>

      <div className={cn("border-t border-background/10", collapsed ? "p-2" : "p-4")}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to="/"
                onClick={onItemClick}
                className="flex items-center justify-center px-2 py-2.5 text-sm text-background/70 hover:text-background transition-colors"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-foreground text-background">
              Voltar à Loja
            </TooltipContent>
          </Tooltip>
        ) : (
          <NavLink
            to="/"
            onClick={onItemClick}
            className="flex items-center gap-3 px-4 py-3 text-sm tracking-wide text-background/70 hover:text-background transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span className="font-light">Voltar à Loja</span>
          </NavLink>
        )}
      </div>
    </>
  );
}

export function AdminSidebar({ open, onOpenChange, collapsed, onCollapsedChange, inboundOnly }: AdminSidebarProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-64 p-0 bg-foreground text-background border-none">
          <div className="p-6 border-b border-background/10 flex items-center justify-between">
            <h1 className="text-lg font-light tracking-[0.2em] uppercase">Admin</h1>
          </div>
          <SidebarContent onItemClick={() => onOpenChange?.(false)} inboundOnly={inboundOnly} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className={cn(
      "min-h-screen bg-foreground text-background flex flex-col shrink-0 transition-all duration-300",
      collapsed ? "w-14" : "w-60"
    )}>
      <div className={cn(
        "border-b border-background/10 flex items-center",
        collapsed ? "p-2 flex-col gap-2 justify-center" : "p-4 justify-between"
      )}>
        {!collapsed && (
          <h1 className="text-base font-light tracking-[0.2em] uppercase">Admin</h1>
        )}
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-1")}>
          <ThemeToggleButton collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange?.(!collapsed)}
            className="text-background/70 hover:text-background hover:bg-background/10 h-8 w-8"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <SidebarContent collapsed={collapsed} inboundOnly={inboundOnly} />
    </aside>
  );
}

export function AdminMobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
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
        <span className="text-sm font-light tracking-[0.2em] uppercase">Admin</span>
      </div>
      <div className="flex items-center gap-1">
        <NotificationCenter />
        <ThemeToggleButton />
        <NavLink
          to="/"
          className="flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors px-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-light">Loja</span>
        </NavLink>
      </div>
    </header>
  );
}
