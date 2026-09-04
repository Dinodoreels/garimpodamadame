import { lazy, Suspense, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { LayoutDashboard, Banknote, ClipboardCheck, Boxes, Wallet, DollarSign, Loader2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AccountingOverview } from '@/components/admin/accounting/AccountingOverview';

const Finance = lazy(() => import('./Finance'));
const CashRegister = lazy(() => import('./CashRegister'));
const Closing = lazy(() => import('./Closing'));
const InventoryClosing = lazy(() => import('./InventoryClosing'));
const Expenses = lazy(() => import('./Expenses'));

const TABS = [
  { value: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { value: 'cash', label: 'Caixa Diário', icon: Banknote },
  { value: 'closing', label: 'Fechamentos', icon: ClipboardCheck },
  { value: 'inventory', label: 'Estoque Mensal', icon: Boxes },
  { value: 'expenses', label: 'Despesas', icon: Wallet },
  { value: 'finance', label: 'DRE & Dashboard', icon: DollarSign },
] as const;

const Fallback = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

export default function Accounting() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = useMemo(() => {
    const t = searchParams.get('tab');
    return TABS.find(x => x.value === t)?.value || 'overview';
  }, [searchParams]);

  const handleTabChange = (v: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', v);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Contabilidade"
        subtitle="Caixa, fechamentos, despesas e dashboards em um só lugar"
      />

      <Tabs value={active} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto p-1 gap-1">
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.icon className="h-3.5 w-3.5" />
              <span className="text-xs">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <AccountingOverview onNavigateTab={handleTabChange} />
        </TabsContent>
        <TabsContent value="cash" className="mt-0">
          <Suspense fallback={<Fallback />}><CashRegister /></Suspense>
        </TabsContent>
        <TabsContent value="closing" className="mt-0">
          <Suspense fallback={<Fallback />}><Closing /></Suspense>
        </TabsContent>
        <TabsContent value="inventory" className="mt-0">
          <Suspense fallback={<Fallback />}><InventoryClosing /></Suspense>
        </TabsContent>
        <TabsContent value="expenses" className="mt-0">
          <Suspense fallback={<Fallback />}><Expenses /></Suspense>
        </TabsContent>
        <TabsContent value="finance" className="mt-0">
          <Suspense fallback={<Fallback />}><Finance /></Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}