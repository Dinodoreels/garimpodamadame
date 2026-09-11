import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

const ACTIONS: Record<string,string> = { scan_pending:'Scan pendente',scan_identified:'Produto identificado',pending_resolved:'Pendência resolvida',qc_approved:'QC aprovado',qc_quarantine:'Enviado à quarentena',qc_rejected:'Reprovado no QC',price_approved:'Preço aprovado',addressed:'Endereçado',stocked:'Guardado no CD',released_to_catalog:'Liberado para venda',role_assigned:'Perfil atribuído',location_created:'Endereço criado' };

export default function InboundHistory() {
  const [search,setSearch]=useState('');
  const {data=[],isLoading}=useQuery({queryKey:['inbound','history'],queryFn:async()=>{const {data,error}=await supabase.from('inbound_events').select('*').order('created_at',{ascending:false}).limit(500);if(error)throw error;return data??[];}});
  const rows=data.filter(row=>JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6"><AdminPageHeader title="Histórico" subtitle="Registro completo e imutável das operações do Inbound"/><div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar ação, origem ou item"/></div>{isLoading?<div className="space-y-2">{[1,2,3].map(i=><Skeleton className="h-20" key={i}/>)}</div>:rows.length===0?<Card><CardContent className="py-14 text-center text-muted-foreground"><History className="mx-auto mb-3 h-10 w-10 opacity-30"/>Nenhum registro encontrado.</CardContent></Card>:<div className="space-y-2">{rows.map(row=><Card key={row.id}><CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{ACTIONS[row.action]??row.action}</p><p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString('pt-BR')} · {row.source}</p></div><div className="flex flex-wrap gap-2"><Badge variant="outline">{row.entity_type}</Badge>{row.entity_id&&<code className="text-xs text-muted-foreground">{row.entity_id.slice(0,8)}</code>}</div></CardContent></Card>)}</div>}</div>;
}