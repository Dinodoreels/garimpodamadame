import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageCircle, PackageCheck, Save, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminProducts } from '@/hooks/useProductAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_TEMPLATE = '✨ OFERTA VIP ✨\n\n{{produto}}\nDe {{preco_original}} por {{preco_vip}}\nEstoque: {{estoque}} unidade(s)\nCupom: {{cupom}}\n\nCompre aqui: {{link}}';

export function VipSalesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: products = [], isLoading: productsLoading } = useAdminProducts();
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['vip-sales-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vip_sales_config').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ['vip-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vip_product_campaigns').select('id,status,discount_percent,last_known_stock,sent_at,created_at,products(title),product_variants(sku)').order('created_at', { ascending: false }).limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });
  const [active, setActive] = useState(false);
  const [provider, setProvider] = useState('evolution');
  const [groupId, setGroupId] = useState('');
  const [discount, setDiscount] = useState('10');
  const [prefix, setPrefix] = useState('VIP');
  const [expiresDays, setExpiresDays] = useState('7');
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [variantId, setVariantId] = useState('');
  const [preview, setPreview] = useState<{ message: string; image_url: string } | null>(null);

  useEffect(() => {
    if (!config) return;
    setActive(config.is_active);
    setProvider(config.provider || 'evolution');
    setGroupId(config.group_id || '');
    setDiscount(String(config.default_discount_percent ?? 10));
    setPrefix(config.coupon_prefix || 'VIP');
    setExpiresDays(String(config.coupon_expires_days ?? 7));
    setTemplate(config.message_template || DEFAULT_TEMPLATE);
  }, [config]);

  const variants = useMemo(() => products.flatMap((product) => (product.variants ?? []).map((variant) => ({ product, variant }))).filter(({ variant }) => variant.sku), [products]);
  const saveConfig = useMutation({
    mutationFn: async () => {
      const payload = { is_active: active, provider, group_id: groupId.trim() || null, default_discount_percent: Number(discount), coupon_prefix: prefix.trim().toUpperCase() || 'VIP', coupon_expires_days: Number(expiresDays), message_template: template };
      const result = config
        ? await supabase.from('vip_sales_config').update(payload).eq('id', config.id)
        : await supabase.from('vip_sales_config').insert(payload);
      if (result.error) throw result.error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vip-sales-config'] }); toast({ title: 'Configuração VIP salva' }); },
    onError: (error: Error) => toast({ variant: 'destructive', title: 'Não foi possível salvar', description: error.message }),
  });
  const campaign = useMutation({
    mutationFn: async (send: boolean) => {
      const { data, error } = await supabase.functions.invoke('vip-campaign', { body: { variant_id: variantId, discount_percent: Number(discount), send } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, send) => {
      if (send) { setPreview(null); queryClient.invalidateQueries({ queryKey: ['vip-campaigns'] }); toast({ title: 'Oferta enviada ao grupo VIP' }); }
      else setPreview(data.preview);
    },
    onError: (error: Error) => toast({ variant: 'destructive', title: 'Campanha não concluída', description: error.message }),
  });

  if (productsLoading || configLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return <div className="space-y-6">
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Grupo VIP</CardTitle><CardDescription>Divulgue produtos com estoque real, cupom e link direto para a loja.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4"><div><Label>Envio ao grupo</Label><p className="text-sm text-muted-foreground">Ative somente depois de configurar o provedor e o grupo.</p></div><Switch checked={active} onCheckedChange={setActive} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Provedor do grupo</Label><Select value={provider} onValueChange={setProvider}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="evolution">Evolution API</SelectItem><SelectItem value="wppconnect">WPPConnect</SelectItem><SelectItem value="uazapi">UAZAPI</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Código do grupo VIP</Label><Input value={groupId} onChange={(event) => setGroupId(event.target.value)} placeholder="Ex.: 120363...@g.us" /></div>
          <div className="space-y-2"><Label>Desconto padrão (%)</Label><Input type="number" min="1" max="90" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div>
          <div className="space-y-2"><Label>Validade do cupom (dias)</Label><Input type="number" min="1" max="365" value={expiresDays} onChange={(event) => setExpiresDays(event.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Prefixo do cupom</Label><Input value={prefix} onChange={(event) => setPrefix(event.target.value)} maxLength={12} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Mensagem</Label><Textarea className="min-h-40" value={template} onChange={(event) => setTemplate(event.target.value)} /><p className="text-xs text-muted-foreground">Campos disponíveis: {'{{produto}}'}, {'{{preco_original}}'}, {'{{preco_vip}}'}, {'{{estoque}}'}, {'{{cupom}}'} e {'{{link}}'}.</p></div>
        </div>
        <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}><Save className="mr-2 h-4 w-4" />Salvar configuração</Button>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Nova oferta</CardTitle><CardDescription>Somente produtos completos e disponíveis podem ser enviados.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <Select value={variantId} onValueChange={(value) => { setVariantId(value); setPreview(null); }}><SelectTrigger><SelectValue placeholder="Escolha um produto pelo SKU" /></SelectTrigger><SelectContent>{variants.map(({ product, variant }) => <SelectItem key={variant.id} value={variant.id}>{variant.sku} · {product.title} · estoque {variant.inventory_quantity}</SelectItem>)}</SelectContent></Select>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!variantId || campaign.isPending} onClick={() => campaign.mutate(false)}><PackageCheck className="mr-2 h-4 w-4" />Visualizar oferta</Button><Button disabled={!variantId || !preview || campaign.isPending || !active || !groupId} onClick={() => campaign.mutate(true)}><Send className="mr-2 h-4 w-4" />Enviar ao grupo</Button></div>
        {preview && <div className="rounded-md border border-border bg-muted/30 p-4"><img src={preview.image_url} alt="Produto da oferta" className="mb-3 h-28 w-28 rounded-md object-cover" /><p className="whitespace-pre-wrap text-sm">{preview.message}</p></div>}
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle>Histórico recente</CardTitle></CardHeader><CardContent className="space-y-3">{campaigns.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma oferta enviada.</p> : campaigns.map((item: any) => <div key={item.id} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0"><div><p className="font-medium">{item.products?.title}</p><p className="text-xs text-muted-foreground">{item.product_variants?.sku} · desconto {item.discount_percent}% · estoque {item.last_known_stock}</p></div><Badge variant="outline">{item.status === 'sent' ? 'Enviada' : item.status === 'sold_out' ? 'Esgotada' : item.status === 'failed' ? 'Falhou' : 'Pronta'}</Badge></div>)}</CardContent></Card>
  </div>;
}