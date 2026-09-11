import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, PackageSearch } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ItemStateBadge } from '@/components/admin/inbound/ItemStateBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { workflowService } from '@/services/inbound/workflowService';

export default function InboundItems({ states, title = 'Produtos identificados', subtitle = 'SKUs processados no centro de distribuição' }: { states?: string[]; title?: string; subtitle?: string }) {
  const [search, setSearch] = useState('');
  const { data: items = [], isLoading } = useQuery({ queryKey: ['inbound','items',states], queryFn: () => workflowService.list(states) });
  const visible = items.filter(item => [item.title,item.sku,item.barcode,item.lots?.code].some(value => value?.toLowerCase().includes(search.toLowerCase())));
  return <div className="space-y-6">
    <AdminPageHeader title={title} subtitle={subtitle} />
    <div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por produto, SKU, EAN ou lote"/></div>
    {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24"/>)}</div> : visible.length === 0 ? <Card><CardContent className="py-16 text-center text-muted-foreground"><PackageSearch className="mx-auto mb-3 h-10 w-10 opacity-30"/><p>Nenhum SKU nesta etapa.</p></CardContent></Card> :
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map(item => <Link key={item.id} to={`/admin/inbound/items/${item.id}`}><Card className="h-full transition-colors hover:bg-muted/40"><CardContent className="space-y-3 pt-5"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{item.title || 'Produto sem nome'}</p><p className="text-xs text-muted-foreground">{item.sku || item.barcode || 'Sem código'} · {item.quantity} un.</p></div><ItemStateBadge state={item.state}/></div><div className="flex justify-between text-xs text-muted-foreground"><span>{item.lots?.code || 'Sem lote'}</span><span>{item.warehouse_locations?.code || 'Sem endereço'}</span></div></CardContent></Card></Link>)}</div>}
  </div>;
}