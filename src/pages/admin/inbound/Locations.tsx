import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { workflowService } from '@/services/inbound/workflowService';

export default function InboundLocations() {
  const qc = useQueryClient();
  const emptyForm = { code:'', zone:'', aisle:'', rack:'', shelf:'', bin:'', capacity:'', description:'' };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data = [] } = useQuery({ queryKey:['inbound','locations'], queryFn: workflowService.locations });
  const save = useMutation({ mutationFn: () => editingId ? workflowService.updateLocation(editingId, form) : workflowService.createLocation(form), onSuccess: () => { qc.invalidateQueries({queryKey:['inbound','locations']}); setForm(emptyForm); setEditingId(null); toast.success(editingId ? 'Posição atualizada' : 'Posição criada'); }, onError: (e:Error) => toast.error(e.message) });
  const toggle = useMutation({ mutationFn: ({id,isActive}:{id:string;isActive:boolean}) => workflowService.toggleLocation(id,isActive), onSuccess: () => qc.invalidateQueries({queryKey:['inbound','locations']}), onError: (e:Error) => toast.error(e.message) });
  return <div className="space-y-6"><AdminPageHeader title="Endereçamento" subtitle="Posições reais do estoque no centro de distribuição"/>
    <Card><CardContent className="grid gap-3 pt-6 sm:grid-cols-3 lg:grid-cols-4 lg:items-end">{Object.entries({code:'Código',zone:'Zona',aisle:'Corredor',rack:'Estante',shelf:'Prateleira',bin:'Posição'}).map(([key,label]) => <div className="space-y-2" key={key}><Label>{label}</Label><Input value={form[key as keyof typeof form]} onChange={e=>setForm(v=>({...v,[key]:e.target.value.toUpperCase()}))}/></div>)}<div className="space-y-2"><Label>Capacidade (unidades)</Label><Input type="number" min="1" value={form.capacity} onChange={e=>setForm(v=>({...v,capacity:e.target.value}))}/></div><div className="space-y-2 lg:col-span-3"><Label>Descrição</Label><Textarea value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))}/></div><div className="flex gap-2"><Button onClick={()=>save.mutate()} disabled={!form.code||save.isPending}><Plus className="mr-2 h-4 w-4"/>{editingId?'Salvar':'Criar'}</Button>{editingId&&<Button variant="outline" onClick={()=>{setEditingId(null);setForm(emptyForm);}}>Cancelar</Button>}</div></CardContent></Card>
    {data.length===0 ? <Card><CardContent className="py-14 text-center text-muted-foreground"><MapPin className="mx-auto mb-3 h-10 w-10 opacity-30"/>Nenhuma posição cadastrada.</CardContent></Card> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.map(location=><Card key={location.id} className={!location.is_active?'opacity-60':undefined}><CardContent className="space-y-3 pt-5"><div className="flex items-center justify-between"><p className="font-medium">{location.code}</p><Switch checked={location.is_active} onCheckedChange={checked=>toggle.mutate({id:location.id,isActive:checked})}/></div><p className="text-sm text-muted-foreground">{[location.zone,location.aisle,location.rack,location.shelf,location.bin].filter(Boolean).join(' · ') || 'Sem detalhes'}</p><p className="text-sm">Ocupação: <strong>{location.occupancy}</strong>{location.capacity ? ` de ${location.capacity} un.` : ' un. · sem limite cadastrado'}</p>{location.description&&<p className="text-xs text-muted-foreground">{location.description}</p>}<Button size="sm" variant="outline" onClick={()=>{setEditingId(location.id);setForm({code:location.code,zone:location.zone||'',aisle:location.aisle||'',rack:location.rack||'',shelf:location.shelf||'',bin:location.bin||'',capacity:location.capacity?String(location.capacity):'',description:location.description||''});}}><Pencil className="mr-2 h-4 w-4"/>Editar</Button></CardContent></Card>)}</div>}
  </div>;
}