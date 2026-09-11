import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { workflowService } from '@/services/inbound/workflowService';

export default function InboundLocations() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ code:'', zone:'', aisle:'', rack:'', shelf:'', bin:'' });
  const { data = [] } = useQuery({ queryKey:['inbound','locations'], queryFn: workflowService.locations });
  const create = useMutation({ mutationFn: () => workflowService.createLocation(form), onSuccess: () => { qc.invalidateQueries({queryKey:['inbound','locations']}); setForm({code:'',zone:'',aisle:'',rack:'',shelf:'',bin:''}); toast.success('Endereço criado'); }, onError: (e:Error) => toast.error(e.message) });
  return <div className="space-y-6"><AdminPageHeader title="Endereçamento" subtitle="Posições reais do estoque no centro de distribuição"/>
    <Card><CardContent className="grid gap-3 pt-6 sm:grid-cols-3 lg:grid-cols-7 lg:items-end">{Object.entries({code:'Código',zone:'Zona',aisle:'Corredor',rack:'Estante',shelf:'Prateleira',bin:'Posição'}).map(([key,label]) => <div className="space-y-2" key={key}><Label>{label}</Label><Input value={form[key as keyof typeof form]} onChange={e=>setForm(v=>({...v,[key]:e.target.value.toUpperCase()}))}/></div>)}<Button onClick={()=>create.mutate()} disabled={!form.code||create.isPending}><Plus className="mr-2 h-4 w-4"/>Criar</Button></CardContent></Card>
    {data.length===0 ? <Card><CardContent className="py-14 text-center text-muted-foreground"><MapPin className="mx-auto mb-3 h-10 w-10 opacity-30"/>Nenhum endereço cadastrado.</CardContent></Card> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.map(location=><Card key={location.id}><CardContent className="pt-5"><p className="font-medium">{location.code}</p><p className="mt-1 text-sm text-muted-foreground">{[location.zone,location.aisle,location.rack,location.shelf,location.bin].filter(Boolean).join(' · ') || 'Sem detalhes'}</p></CardContent></Card>)}</div>}
  </div>;
}