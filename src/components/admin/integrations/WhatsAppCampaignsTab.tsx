import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Eye, Loader2, Megaphone, Pencil, Plus, Send, Trash2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminProducts } from '@/hooks/useProductAdmin';
import { useDiscounts } from '@/hooks/useDiscounts';
import { MediaPicker } from '@/components/cms/MediaPicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type Group = { id: string; name: string; group_identifier: string; provider: string; description: string | null; is_active: boolean };
type Campaign = { id: string; title: string; message_body: string; link_url: string | null; media_url: string | null; media_type: string | null; status: string; scheduled_for: string | null; sent_at: string | null; last_error: string | null; created_at: string; whatsapp_campaign_targets: { id: string; status: string; last_error: string | null; whatsapp_groups: { name: string } | null }[] };

const STATUS: Record<string, string> = { draft: 'Rascunho', scheduled: 'Agendada', processing: 'Enviando', sent: 'Enviada', partial: 'Parcial', failed: 'Falhou', cancelled: 'Cancelada' };
const blankGroup = { name: '', group_identifier: '', provider: 'evolution', description: '', is_active: true };
const blankCampaign = { title: '', message_body: '', link_url: '', media_url: '', media_type: 'image', discount_code_id: '', scheduled_for: '', group_ids: [] as string[], product_ids: [] as string[] };

export function WhatsAppCampaignsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: products = [] } = useAdminProducts();
  const { discounts } = useDiscounts();
  const [groupForm, setGroupForm] = useState(blankGroup);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState(blankCampaign);
  const [preview, setPreview] = useState<{ message: string; media_url?: string | null; media_type?: string | null } | null>(null);
  const [confirmCampaignId, setConfirmCampaignId] = useState<string | 'new' | null>(null);

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['whatsapp-groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('whatsapp_groups').select('*').order('name');
      if (error) throw error;
      return data as Group[];
    },
  });
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['whatsapp-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('whatsapp_campaigns').select('*,whatsapp_campaign_targets(id,status,last_error,whatsapp_groups(name))').order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const activeProducts = useMemo(() => products.filter((product) => product.status === 'active' && product.is_available), [products]);
  const activeDiscounts = useMemo(() => {
    const now = Date.now();
    return discounts.filter((discount) => discount.is_active && (!discount.starts_at || Date.parse(discount.starts_at) <= now) && (!discount.expires_at || Date.parse(discount.expires_at) >= now));
  }, [discounts]);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['whatsapp-groups'] });
    queryClient.invalidateQueries({ queryKey: ['whatsapp-campaigns'] });
  };

  const saveGroup = useMutation({
    mutationFn: async () => {
      const payload = { ...groupForm, name: groupForm.name.trim(), group_identifier: groupForm.group_identifier.trim(), description: groupForm.description.trim() || null };
      const result = editingGroupId ? await supabase.from('whatsapp_groups').update(payload).eq('id', editingGroupId) : await supabase.from('whatsapp_groups').insert(payload);
      if (result.error) throw result.error;
    },
    onSuccess: () => { setGroupForm(blankGroup); setEditingGroupId(null); refresh(); toast({ title: 'Grupo salvo' }); },
    onError: (error: Error) => toast({ variant: 'destructive', title: 'Não foi possível salvar o grupo', description: error.message }),
  });
  const deleteGroup = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('whatsapp_groups').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { refresh(); toast({ title: 'Grupo removido' }); },
    onError: (error: Error) => toast({ variant: 'destructive', title: 'Não foi possível remover', description: error.message }),
  });

  const saveCampaign = useMutation({
    mutationFn: async (mode: 'draft' | 'preview' | 'schedule' | 'send') => {
      if (!campaignForm.title.trim() || !campaignForm.message_body.trim()) throw new Error('Informe o nome interno e a mensagem.');
      if (!campaignForm.group_ids.length) throw new Error('Selecione pelo menos um grupo.');
      if (mode === 'schedule' && !campaignForm.scheduled_for) throw new Error('Informe a data e o horário do envio.');
      const status = mode === 'schedule' ? 'scheduled' : 'draft';
      const { data: campaign, error } = await supabase.from('whatsapp_campaigns').insert({
        title: campaignForm.title.trim(), message_body: campaignForm.message_body.trim(), link_url: campaignForm.link_url.trim() || null,
        media_url: campaignForm.media_url || null, media_type: campaignForm.media_url ? campaignForm.media_type : null,
        discount_code_id: campaignForm.discount_code_id || null, status,
        scheduled_for: mode === 'schedule' ? new Date(campaignForm.scheduled_for).toISOString() : null,
      }).select('id').single();
      if (error) throw error;
      const [targetsResult, productsResult] = await Promise.all([
        supabase.from('whatsapp_campaign_targets').insert(campaignForm.group_ids.map((group_id) => ({ campaign_id: campaign.id, group_id }))),
        campaignForm.product_ids.length ? supabase.from('whatsapp_campaign_products').insert(campaignForm.product_ids.map((product_id) => ({ campaign_id: campaign.id, product_id }))) : Promise.resolve({ error: null }),
      ]);
      if (targetsResult.error) throw targetsResult.error;
      if (productsResult.error) throw productsResult.error;
      if (mode === 'preview' || mode === 'send') {
        const { data, error: invokeError } = await supabase.functions.invoke('whatsapp-campaign-dispatch', { body: { campaign_id: campaign.id, preview: mode === 'preview' } });
        if (invokeError) throw invokeError;
        if (data?.error) throw new Error(data.error);
        if (mode === 'preview') return { campaignId: campaign.id, preview: data.preview };
      }
      return { campaignId: campaign.id, preview: null };
    },
    onSuccess: (result, mode) => {
      refresh();
      if (mode === 'preview') setPreview(result.preview);
      else {
        setConfirmCampaignId(null);
        setCampaignForm(blankCampaign);
        setPreview(null);
        toast({ title: mode === 'send' ? 'Campanha enviada' : mode === 'schedule' ? 'Campanha agendada' : 'Rascunho salvo' });
      }
    },
    onError: (error: Error) => toast({ variant: 'destructive', title: 'Campanha não concluída', description: error.message }),
  });

  const dispatchExisting = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-campaign-dispatch', { body: { campaign_id: campaignId, preview: false } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => { setConfirmCampaignId(null); refresh(); toast({ title: 'Campanha enviada' }); },
    onError: (error: Error) => toast({ variant: 'destructive', title: 'O envio falhou', description: error.message }),
  });
  const cancelCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whatsapp_campaigns').update({ status: 'cancelled' }).eq('id', id).in('status', ['draft', 'scheduled']);
      if (error) throw error;
      await supabase.from('whatsapp_campaign_targets').update({ status: 'cancelled' }).eq('campaign_id', id).eq('status', 'pending');
    },
    onSuccess: () => { refresh(); toast({ title: 'Campanha cancelada' }); },
  });

  const toggleSelection = (key: 'group_ids' | 'product_ids', id: string) => setCampaignForm((current) => ({
    ...current,
    [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id],
  }));

  if (groupsLoading || campaignsLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Campanhas para grupos</CardTitle><CardDescription>Divulgue lives, eventos, promoções e produtos em grupos reais do WhatsApp.</CardDescription></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Nome do grupo</Label><Input value={groupForm.name} onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))} /></div>
        <div className="space-y-2"><Label>Código real do grupo</Label><Input value={groupForm.group_identifier} onChange={(event) => setGroupForm((current) => ({ ...current, group_identifier: event.target.value }))} placeholder="Ex.: 120363...@g.us" /></div>
        <div className="space-y-2"><Label>Provedor</Label><Select value={groupForm.provider} onValueChange={(provider) => setGroupForm((current) => ({ ...current, provider }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="evolution">Evolution API</SelectItem><SelectItem value="wppconnect">WPPConnect</SelectItem><SelectItem value="uazapi">UAZAPI</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>Observação</Label><Input value={groupForm.description} onChange={(event) => setGroupForm((current) => ({ ...current, description: event.target.value }))} /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Switch checked={groupForm.is_active} onCheckedChange={(is_active) => setGroupForm((current) => ({ ...current, is_active }))} /><Label>Grupo ativo</Label></div><div className="flex gap-2">{editingGroupId && <Button variant="outline" onClick={() => { setEditingGroupId(null); setGroupForm(blankGroup); }}>Cancelar</Button>}<Button disabled={!groupForm.name.trim() || !groupForm.group_identifier.trim() || saveGroup.isPending} onClick={() => saveGroup.mutate()}><Plus className="mr-2 h-4 w-4" />{editingGroupId ? 'Salvar grupo' : 'Adicionar grupo'}</Button></div></div>
      <div className="grid gap-2 md:grid-cols-2">{groups.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum grupo cadastrado.</p> : groups.map((group) => <div key={group.id} className="flex items-center justify-between gap-3 rounded-md border p-3"><div className="min-w-0"><p className="font-medium">{group.name}</p><p className="truncate text-xs text-muted-foreground">{group.group_identifier} · {group.provider}</p></div><div className="flex items-center gap-1"><Badge variant={group.is_active ? 'secondary' : 'outline'}>{group.is_active ? 'Ativo' : 'Inativo'}</Badge><Button size="icon" variant="ghost" aria-label={`Editar ${group.name}`} onClick={() => { setEditingGroupId(group.id); setGroupForm({ name: group.name, group_identifier: group.group_identifier, provider: group.provider, description: group.description ?? '', is_active: group.is_active }); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" aria-label={`Remover ${group.name}`} onClick={() => deleteGroup.mutate(group.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Nova campanha</CardTitle><CardDescription>Monte a mensagem e confira a prévia antes de enviar ou agendar.</CardDescription></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Nome interno</Label><Input value={campaignForm.title} onChange={(event) => setCampaignForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: Live de novidades" /></div><div className="space-y-2"><Label>Link opcional</Label><Input type="url" value={campaignForm.link_url} onChange={(event) => setCampaignForm((current) => ({ ...current, link_url: event.target.value }))} placeholder="https://..." /></div></div>
      <div className="space-y-2"><Label>Mensagem</Label><Textarea className="min-h-36" maxLength={4000} value={campaignForm.message_body} onChange={(event) => setCampaignForm((current) => ({ ...current, message_body: event.target.value }))} placeholder="Escreva o anúncio da live, evento ou promoção." /><p className="text-xs text-muted-foreground">{campaignForm.message_body.length}/4000 caracteres</p></div>
      <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Tipo da mídia</Label><Select value={campaignForm.media_type} onValueChange={(media_type) => setCampaignForm((current) => ({ ...current, media_type }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="image">Imagem</SelectItem><SelectItem value="video">Vídeo</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Cupom existente</Label><Select value={campaignForm.discount_code_id || 'none'} onValueChange={(value) => setCampaignForm((current) => ({ ...current, discount_code_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue placeholder="Sem cupom" /></SelectTrigger><SelectContent><SelectItem value="none">Sem cupom</SelectItem>{activeDiscounts.map((discount) => <SelectItem key={discount.id} value={discount.id}>{discount.code} · {discount.type === 'percentage' ? `${discount.value}%` : `R$ ${discount.value}`}</SelectItem>)}</SelectContent></Select></div></div>
      <MediaPicker value={campaignForm.media_url} onChange={(media_url) => setCampaignForm((current) => ({ ...current, media_url }))} label="Selecionar imagem ou vídeo" accept="image/*,video/*" />
      <div className="grid gap-5 lg:grid-cols-2"><div className="space-y-2"><Label>Grupos</Label><div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">{groups.filter((group) => group.is_active).map((group) => <label key={group.id} className="flex items-center gap-2 text-sm"><Checkbox checked={campaignForm.group_ids.includes(group.id)} onCheckedChange={() => toggleSelection('group_ids', group.id)} />{group.name}<span className="text-xs text-muted-foreground">({group.provider})</span></label>)}{groups.every((group) => !group.is_active) && <p className="text-sm text-muted-foreground">Cadastre ou ative um grupo primeiro.</p>}</div></div><div className="space-y-2"><Label>Produtos opcionais</Label><div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">{activeProducts.map((product) => <label key={product.id} className="flex items-center gap-2 text-sm"><Checkbox checked={campaignForm.product_ids.includes(product.id)} onCheckedChange={() => toggleSelection('product_ids', product.id)} /><span className="truncate">{product.title}</span></label>)}</div></div></div>
      <div className="space-y-2"><Label>Data e horário para agendar</Label><Input type="datetime-local" value={campaignForm.scheduled_for} onChange={(event) => setCampaignForm((current) => ({ ...current, scheduled_for: event.target.value }))} /></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={saveCampaign.isPending} onClick={() => saveCampaign.mutate('preview')}><Eye className="mr-2 h-4 w-4" />Visualizar</Button><Button variant="secondary" disabled={saveCampaign.isPending} onClick={() => saveCampaign.mutate('draft')}>Salvar rascunho</Button><Button variant="outline" disabled={!campaignForm.scheduled_for || saveCampaign.isPending} onClick={() => saveCampaign.mutate('schedule')}><CalendarClock className="mr-2 h-4 w-4" />Agendar</Button><Button disabled={saveCampaign.isPending} onClick={() => setConfirmCampaignId('new')}><Send className="mr-2 h-4 w-4" />Enviar agora</Button></div>
      {preview && <div className="rounded-md border bg-muted/30 p-4">{preview.media_url && (preview.media_type === 'video' ? <video src={preview.media_url} controls className="mb-3 max-h-56 w-full rounded-md object-contain" /> : <img src={preview.media_url} alt="Mídia da campanha" className="mb-3 max-h-56 w-full rounded-md object-contain" />)}<p className="whitespace-pre-wrap text-sm">{preview.message}</p></div>}
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Histórico</CardTitle></CardHeader><CardContent className="space-y-3">{campaigns.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma campanha criada.</p> : campaigns.map((campaign) => <div key={campaign.id} className="space-y-2 border-b pb-4 last:border-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{campaign.title}</p><p className="text-xs text-muted-foreground">{campaign.scheduled_for ? `Programada para ${new Date(campaign.scheduled_for).toLocaleString('pt-BR')}` : new Date(campaign.created_at).toLocaleString('pt-BR')}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{STATUS[campaign.status] ?? campaign.status}</Badge>{['draft', 'scheduled', 'failed', 'partial'].includes(campaign.status) && <Button size="sm" variant="outline" onClick={() => setConfirmCampaignId(campaign.id)}>Enviar</Button>}{['draft', 'scheduled'].includes(campaign.status) && <Button size="icon" variant="ghost" aria-label={`Cancelar ${campaign.title}`} onClick={() => cancelCampaign.mutate(campaign.id)}><XCircle className="h-4 w-4" /></Button>}</div></div><div className="flex flex-wrap gap-2">{campaign.whatsapp_campaign_targets.map((target) => <Badge key={target.id} variant={target.status === 'sent' ? 'secondary' : 'outline'} title={target.last_error ?? undefined}>{target.whatsapp_groups?.name ?? 'Grupo'}: {target.status === 'sent' ? 'enviado' : target.status === 'failed' ? 'falhou' : target.status === 'cancelled' ? 'cancelado' : 'aguardando'}</Badge>)}</div>{campaign.last_error && <p className="text-xs text-destructive">{campaign.last_error}</p>}</div>)}</CardContent></Card>

    <AlertDialog open={Boolean(confirmCampaignId)} onOpenChange={(open) => !open && setConfirmCampaignId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar envio da campanha?</AlertDialogTitle><AlertDialogDescription>A mensagem será disparada agora para os grupos selecionados. Confira o conteúdo e os destinos antes de continuar.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction disabled={dispatchExisting.isPending || saveCampaign.isPending} onClick={() => { if (confirmCampaignId === 'new') saveCampaign.mutate('send'); else if (confirmCampaignId) dispatchExisting.mutate(confirmCampaignId); }}>{dispatchExisting.isPending || saveCampaign.isPending ? 'Enviando...' : 'Confirmar envio'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}