import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Link2, RefreshCw, Plug, Download, Upload, CheckCircle2, XCircle, Copy, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProviderSetupGuide } from './ProviderSetupGuide';
import { BLING_GUIDE } from './providerGuides';

type Authority = 'bling' | 'store' | 'notify';

type Config = {
  id: string;
  client_id: string | null;
  client_secret: string | null;
  refresh_token: string | null;
  company_name: string | null;
  is_active: boolean;
  sync_products: boolean;
  sync_stock: boolean;
  sync_prices: boolean;
  push_orders: boolean;
  pull_marketplace_orders: boolean;
  stock_authority: Authority;
  price_authority: Authority;
  order_pull_interval_minutes: number;
  deposito_id: string | null;
  deposito_name: string | null;
  loja_id: string | null;
  loja_name: string | null;
  last_order_pull_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
};

type LogRow = { id: string; entity_type: string; action: string; status: string; error_message: string | null; created_at: string };
type LinkRow = { id: string; bling_sku: string | null; bling_product_id: string | null; status: string; last_error: string | null };

const AUTHORITY_LABEL: Record<Authority, string> = {
  bling: 'O Bling manda',
  store: 'A loja manda',
  notify: 'Só me avisar',
};

const CALLBACK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bling-oauth-callback`;
const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bling-webhook`;

export function BlingTab() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [depositos, setDepositos] = useState<{ id: string; name: string }[]>([]);
  const [canais, setCanais] = useState<{ id: string; name: string }[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [queue, setQueue] = useState({ pending: 0, failed: 0, done: 0 });
  const [oauthPending, setOauthPending] = useState(false);
  const oauthWindow = useRef<Window | null>(null);

  const load = async () => {
    setLoading(true);
    let { data } = await supabase.from('bling_config').select('*').limit(1).maybeSingle();
    if (!data) {
      const created = await supabase.from('bling_config').insert({}).select('*').single();
      data = created.data;
    }
    setConfig(data as Config | null);
    setClientId((data as any)?.client_id || '');
    setClientSecret((data as any)?.client_secret || '');

    const [{ data: logRows }, { data: linkRows }, { data: queueRows }] = await Promise.all([
      supabase.from('bling_sync_log').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('bling_product_links').select('id, bling_sku, bling_product_id, status, last_error').order('updated_at', { ascending: false }).limit(50),
      supabase.from('bling_sync_queue').select('status'),
    ]);
    setLogs((logRows || []) as LogRow[]);
    setLinks((linkRows || []) as LinkRow[]);
    const q = { pending: 0, failed: 0, done: 0 };
    (queueRows || []).forEach((r: any) => { if (r.status in q) (q as any)[r.status]++; });
    setQueue(q);
    setLoading(false);
    return data as Config | null;
  };

  useEffect(() => { load(); }, []);

  // Handle the return from the Bling authorization window.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('bling');
    if (!result) return;

    const msg = params.get('bling_msg');

    // If this is the popup, hand the result to the panel behind it and close.
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage({ type: 'bling-oauth', result, message: msg }, window.location.origin);
      } catch { /* ignore */ }
      window.close();
      return;
    }

    const finish = async () => {
      const loaded = await load();
      if (result === 'ok') toast.success('Bling conectado com sucesso', { description: loaded?.company_name ? `Empresa: ${loaded.company_name}` : undefined });
      else toast.error('Não foi possível conectar', { description: msg || undefined });

      params.delete('bling');
      params.delete('bling_msg');
      const query = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
    };
    finish();
  }, []);

  // Listen for the result coming from the popup.
  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'bling-oauth') return;
      setOauthPending(false);
      oauthWindow.current = null;
      const loaded = await load();
      if (e.data.result === 'ok') toast.success('Bling conectado com sucesso', { description: loaded?.company_name ? `Empresa: ${loaded.company_name}` : 'A empresa autorizada já está ativa no painel.' });
      else toast.error('Não foi possível conectar', { description: e.data.message || undefined });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!oauthPending) return;
    const timer = window.setInterval(() => {
      if (oauthWindow.current?.closed) {
        window.clearInterval(timer);
        oauthWindow.current = null;
        setOauthPending(false);
        load();
      }
    }, 700);
    return () => window.clearInterval(timer);
  }, [oauthPending]);

  const patch = async (values: Partial<Config>) => {
    if (!config) return;
    const { data, error } = await supabase.from('bling_config').update(values).eq('id', config.id).select('*').single();
    if (error) { toast.error('Não foi possível salvar', { description: error.message }); return; }
    setConfig(data as Config);
    toast.success('Salvo');
  };

  const call = async (name: string, body: any = {}) => {
    setBusy(name);
    const { data, error } = await supabase.functions.invoke(name, { body });
    setBusy(null);
    if (error || (data as any)?.error) {
      toast.error('Erro', { description: (data as any)?.error || error?.message });
      return null;
    }
    return data as any;
  };

  const connect = async () => {
    if (connected && !window.confirm('Deseja trocar a conta do Bling ou autorizar novamente a empresa atual?')) return;
    await patch({ client_id: clientId.trim(), client_secret: clientSecret.trim() });
    const res = await call('bling-oauth-start');
    if (res?.url) {
      const popup = window.open(res.url, 'bling-oauth', 'width=620,height=760');
      if (!popup) {
        toast.error('A janela do Bling foi bloqueada', { description: 'Permita janelas neste site e tente novamente.' });
        return;
      }
      oauthWindow.current = popup;
      setOauthPending(true);
      toast.info('Autorize a empresa na janela do Bling.');
    }
  };

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copiado');
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const connected = !!config?.refresh_token;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" /> Bling (ERP)
              </CardTitle>
              <CardDescription>
                O Bling faz a ponte da loja com Mercado Livre, Shopee, Magalu, Amazon e TikTok Shop.
              </CardDescription>
            </div>
            <Badge variant={connected ? 'default' : 'secondary'}>
              {connected ? `Conectado${config?.company_name ? ` — ${config.company_name}` : ''}` : 'Não conectado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProviderSetupGuide guide={BLING_GUIDE} />

          {connected && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <strong>Bling conectado</strong>
                  {config?.company_name ? ` — ${config.company_name}` : ''}
                </span>
                {config?.last_sync_at && (
                  <span className="text-xs text-muted-foreground">
                    Última atividade: {new Date(config.last_sync_at).toLocaleString('pt-BR')}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {oauthPending && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                <strong>Aguardando autorização no Bling.</strong> Conclua na janela aberta; esta tela será atualizada automaticamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Client ID do aplicativo</Label>
              <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Cole aqui" />
            </div>
            <div className="space-y-2">
              <Label>Client Secret do aplicativo</Label>
              <Input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Cole aqui" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">URL de retorno (cole no cadastro do aplicativo no Bling)</Label>
            <div className="flex gap-2">
              <Input readOnly value={CALLBACK_URL} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(CALLBACK_URL)}><Copy className="h-4 w-4" /></Button>
            </div>
            <Label className="text-xs text-muted-foreground">URL de avisos / callback (opcional, para o Bling avisar mudanças na hora)</Label>
            <div className="flex gap-2">
              <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(WEBHOOK_URL)}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>

          {config?.last_error && (
            <Alert variant="destructive"><AlertDescription className="text-xs">{config.last_error}</AlertDescription></Alert>
          )}

          <div className="flex flex-wrap gap-2">
            {!connected && (
              <Button onClick={connect} disabled={busy === 'bling-oauth-start' || oauthPending}>
                {busy === 'bling-oauth-start' || oauthPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                {oauthPending ? 'Aguardando autorização' : 'Conectar com o Bling'}
              </Button>
            )}
            <Button onClick={async () => {
              const r = await call('bling-test');
              if (r?.ok) toast.success('Conexão com o Bling funcionando', { description: r.company ? `Empresa: ${r.company}` : undefined });
              await load();
            }} disabled={!connected || busy === 'bling-test'}>
              {busy === 'bling-test' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Testar conexão
            </Button>
            {connected && (
              <Button variant="outline" onClick={connect} disabled={busy === 'bling-oauth-start' || oauthPending}>
                {busy === 'bling-oauth-start' || oauthPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Building2 className="h-4 w-4 mr-2" />}
                Trocar ou autorizar novamente a conta
              </Button>
            )}
            <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Atualizar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>O que sincronizar</CardTitle>
          <CardDescription>Ligue e desligue cada parte quando quiser.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Integração ligada</p>
              <p className="text-xs text-muted-foreground">Desligue para pausar tudo sem perder as configurações.</p>
            </div>
            <Switch checked={!!config?.is_active} onCheckedChange={(v) => patch({ is_active: v })} disabled={!connected} />
          </div>

          {([
            ['sync_products', 'Produtos', 'Envia o cadastro dos produtos da loja para o Bling.'],
            ['sync_stock', 'Estoque', 'Mantém a quantidade igual nos dois lados.'],
            ['sync_prices', 'Preços', 'Mantém o preço igual nos dois lados.'],
            ['push_orders', 'Vendas da loja para o Bling', 'Cada venda paga do site vira pedido no Bling.'],
            ['pull_marketplace_orders', 'Pedidos dos marketplaces', 'Traz para o painel as vendas de Mercado Livre, Shopee, Magalu, Amazon e TikTok.'],
          ] as const).map(([key, title, desc]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch checked={!!config?.[key]} onCheckedChange={(v) => patch({ [key]: v } as any)} />
            </div>
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Se o estoque estiver diferente</Label>
              <Select value={config?.stock_authority} onValueChange={(v) => patch({ stock_authority: v as Authority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AUTHORITY_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Se o preço estiver diferente</Label>
              <Select value={config?.price_authority} onValueChange={(v) => patch({ price_authority: v as Authority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AUTHORITY_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Depósito do Bling</Label>
                <Button variant="ghost" size="sm" onClick={async () => {
                  const r = await call('bling-list-depositos');
                  if (r) { setDepositos(r.depositos || []); setCanais(r.canais || []); toast.success('Lista atualizada'); }
                }} disabled={!connected || busy === 'bling-list-depositos'}>Buscar</Button>
              </div>
              <Select value={config?.deposito_id ?? undefined} onValueChange={(v) => {
                const d = depositos.find((x) => x.id === v);
                patch({ deposito_id: v, deposito_name: d?.name ?? null });
              }}>
                <SelectTrigger><SelectValue placeholder={config?.deposito_name || 'Escolha o depósito'} /></SelectTrigger>
                <SelectContent>
                  {depositos.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Canal de venda usado nos pedidos do site</Label>
              <Select value={config?.loja_id ?? undefined} onValueChange={(v) => {
                const c = canais.find((x) => x.id === v);
                patch({ loja_id: v, loja_name: c?.name ?? null });
              }}>
                <SelectTrigger><SelectValue placeholder={config?.loja_name || 'Padrão do Bling'} /></SelectTrigger>
                <SelectContent>
                  {canais.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ações</CardTitle>
          <CardDescription>Fila: {queue.pending} na espera · {queue.failed} com erro · {queue.done} concluídas.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={async () => { const r = await call('bling-link-products'); if (r) toast.success(`${r.linked} produtos vinculados`, { description: `${r.unmatched_count} sem par no Bling` }); await load(); }} disabled={!connected || busy === 'bling-link-products'}>
            {busy === 'bling-link-products' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
            Vincular pelo código (SKU)
          </Button>
          <Button variant="outline" onClick={async () => { const r = await call('bling-sync-all-products'); if (r) toast.success(`${r.queued} produtos na fila`); await load(); }} disabled={!connected || busy === 'bling-sync-all-products'}>
            {busy === 'bling-sync-all-products' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Enviar todos os produtos
          </Button>
          <Button variant="outline" onClick={async () => { const r = await call('bling-flush-queue'); if (r) toast.success(`${r.processed ?? 0} itens processados`); await load(); }} disabled={!connected || busy === 'bling-flush-queue'}>
            {busy === 'bling-flush-queue' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Processar fila agora
          </Button>
          <Button variant="outline" onClick={async () => { const r = await call('bling-pull-orders'); if (r) toast.success(`${r.imported ?? 0} pedidos importados`); await load(); }} disabled={!connected || busy === 'bling-pull-orders'}>
            {busy === 'bling-pull-orders' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Buscar pedidos agora
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos vinculados</CardTitle>
          <CardDescription>Últimos 50 vínculos entre a loja e o Bling.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código (SKU)</TableHead>
                <TableHead>ID no Bling</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum produto vinculado ainda.</TableCell></TableRow>
              )}
              {links.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.bling_sku || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{l.bling_product_id || '—'}</TableCell>
                  <TableCell>
                    {l.status === 'synced'
                      ? <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />Vinculado</Badge>
                      : <Badge variant="destructive" className="gap-1" title={l.last_error || ''}><XCircle className="h-3 w-3" />Com erro</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>Últimas 20 sincronizações, com o motivo exato quando algo falha.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nada por aqui ainda.</p>}
          {logs.map((l) => (
            <div key={l.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
              {l.status === 'error'
                ? <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                : <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium">{l.entity_type} · {l.action}</p>
                {l.error_message && <p className="text-xs text-destructive break-words">{l.error_message}</p>}
                <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
