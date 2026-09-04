import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Upload, Download, Webhook, ShoppingBag, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Config = {
  id: string;
  is_enabled: boolean;
  store_domain: string | null;
  sync_direction: 'push_only' | 'pull_only' | 'bidirectional';
  auto_sync: boolean;
  primary_source: 'system' | 'shopify';
  last_full_sync_at: string | null;
};

type QueueStat = { pending: number; error: number; done: number };

export function ShopifyTab() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [domain, setDomain] = useState('');
  const [stats, setStats] = useState<QueueStat>({ pending: 0, error: 0, done: 0 });
  const [action, setAction] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('shopify_config').select('*').limit(1).maybeSingle();
    setConfig(data as Config | null);
    setDomain((data as any)?.store_domain || '');

    const { data: queue } = await supabase.from('shopify_sync_queue').select('status');
    const s: QueueStat = { pending: 0, error: 0, done: 0 };
    (queue || []).forEach((q: any) => { if (q.status in s) (s as any)[q.status]++; });
    setStats(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const callToggle = async (patch: Partial<Config>) => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('shopify-toggle', { body: patch });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast.error('Erro', { description: (data as any)?.error || error?.message });
      return;
    }
    setConfig((data as any).config);
    toast.success('Configuração salva');
  };

  const callFunction = async (name: string, body: any = {}) => {
    setAction(name);
    const { data, error } = await supabase.functions.invoke(name, { body });
    setAction(null);
    if (error || (data as any)?.error) {
      toast.error('Erro', { description: (data as any)?.error || error?.message });
      return null;
    }
    return data;
  };

  if (loading) return <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</div>;

  const enabled = !!config?.is_enabled;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Shopify</CardTitle>
              <CardDescription>
                Sincronização opcional. Com a chave desligada, o sistema funciona 100% no banco próprio.
              </CardDescription>
            </div>
            <Badge variant={enabled ? 'default' : 'secondary'}>{enabled ? 'Ativa' : 'Desligada'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Ativar sincronização com Shopify</p>
              <p className="text-sm text-muted-foreground">Quando desligada, nada é enviado nem importado.</p>
            </div>
            <Switch checked={enabled} disabled={saving} onCheckedChange={(v) => callToggle({ is_enabled: v })} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Domínio da loja (.myshopify.com)</Label>
              <div className="flex gap-2 mt-1">
                <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="minha-loja.myshopify.com" />
                <Button variant="outline" disabled={saving} onClick={() => callToggle({ store_domain: domain })}>Salvar</Button>
              </div>
            </div>
            <div>
              <Label>Direção da sincronização</Label>
              <Select value={config?.sync_direction} onValueChange={(v) => callToggle({ sync_direction: v as any })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bidirectional">Bidirecional</SelectItem>
                  <SelectItem value="push_only">Só enviar (sistema → Shopify)</SelectItem>
                  <SelectItem value="pull_only">Só importar (Shopify → sistema)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fonte primária em caso de conflito</Label>
              <Select value={config?.primary_source} onValueChange={(v) => callToggle({ primary_source: v as any })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Sistema (recomendado)</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Sincronização automática</p>
                <p className="text-xs text-muted-foreground">Replica alterações em tempo real.</p>
              </div>
              <Switch checked={!!config?.auto_sync} onCheckedChange={(v) => callToggle({ auto_sync: v })} />
            </div>
          </div>

          {!enabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                A integração está desligada. O sistema continua funcionando normalmente com o banco próprio.
                Para ativar, é preciso configurar o secret <code>SHOPIFY_ACCESS_TOKEN</code> (Custom App da Shopify
                com permissões de produtos e estoque).
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>
              Última sincronização completa: {config?.last_full_sync_at ? new Date(config.last_full_sync_at).toLocaleString('pt-BR') : 'nunca'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={async () => { const r = await callFunction('shopify-bulk-export'); if (r) { toast.success(r.message); load(); } }}
                disabled={!!action}>
                {action === 'shopify-bulk-export' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Enviar todos os produtos
              </Button>
              <Button variant="outline" onClick={async () => { const r = await callFunction('shopify-pull-product', { all: true }); if (r) { toast.success(`${r.imported} importados`); load(); } }}
                disabled={!!action}>
                {action === 'shopify-pull-product' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Importar tudo da Shopify
              </Button>
              <Button variant="outline" onClick={async () => { const r = await callFunction('shopify-register-webhooks'); if (r) toast.success(`Webhooks: ${r.created?.length || 0} novos, ${r.already?.length || 0} já existiam`); }}
                disabled={!!action}>
                <Webhook className="h-4 w-4 mr-2" />Registrar webhooks
              </Button>
              <Button variant="ghost" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Atualizar status</Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Stat label="Pendentes" value={stats.pending} />
              <Stat label="Concluídos" value={stats.done} />
              <Stat label="Com erro" value={stats.error} variant={stats.error > 0 ? 'destructive' : 'default'} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, variant = 'default' }: { label: string; value: number; variant?: 'default' | 'destructive' }) {
  return (
    <div className={`rounded-lg border p-3 ${variant === 'destructive' && value > 0 ? 'border-destructive/50 bg-destructive/5' : ''}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}