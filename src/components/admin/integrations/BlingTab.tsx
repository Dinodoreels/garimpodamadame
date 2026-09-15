import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Link2, RefreshCw, Plug, Download, Upload, CheckCircle2, XCircle, Copy, Building2, Search, Store, ExternalLink, ImageOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProviderSetupGuide } from './ProviderSetupGuide';
import { BLING_GUIDE } from './providerGuides';
import { useRealtimeRefetch } from '@/hooks/useRealtimeInvalidator';

type Authority = 'bling' | 'store' | 'notify';

type Config = {
  id: string;
  client_id: string | null;
  client_secret: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  oauth_state: string | null;
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
type ImportRun = { id: string; status: string; decision: 'pending' | 'approved' | 'rejected'; decision_reason: string | null; decided_at: string | null; totals: Record<string, number>; orders_result: Record<string, number> | null; created_at: string; error_message: string | null };
type ImportItem = { id: string; bling_product_id: string; bling_sku: string | null; classification: 'new' | 'linked' | 'different' | 'conflict'; selected: boolean; local_product_id: string | null; bling_data: { name?: string; price?: number; stock?: number | null; images?: string[]; auto_sku_generated?: boolean; auto_sku_error?: string | null }; differences: Record<string, unknown>; apply_status: string; error_message: string | null };
type ImportDecision = { id: string; decision: 'approved' | 'rejected'; reason: string; created_at: string };

const AUTHORITY_LABEL: Record<Authority, string> = {
  bling: 'O Bling manda',
  store: 'A loja manda',
  notify: 'Só me avisar',
};

const CALLBACK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bling-oauth-callback`;
const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bling-webhook`;

const hasAuthorizationError = (message: string | null | undefined) =>
  !!message && /invalid_grant|invalid refresh token|client_id.*inv[aá]lido|invalid_client|autoriza[cç][aã]o anterior.*expirou/i.test(message);

const friendlyBlingError = (message: string | null | undefined) => {
  if (!message) return 'O Bling não informou o motivo da falha.';
  if (/invalid_grant|invalid refresh token|autoriza[cç][aã]o anterior.*expirou/i.test(message)) {
    return 'A autorização anterior expirou ou foi cancelada. Confira as credenciais e conecte novamente.';
  }
  if (/client_id.*inv[aá]lido|invalid_client/i.test(message)) {
    return 'O Client ID foi recusado pelo Bling. Copie novamente o Client ID e o Client Secret do mesmo aplicativo cadastrado no Bling.';
  }
  return message;
};

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
  const [replacingCredentials, setReplacingCredentials] = useState(false);
  const [importRun, setImportRun] = useState<ImportRun | null>(null);
  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [importSearch, setImportSearch] = useState('');
  const [importFilter, setImportFilter] = useState('all');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionHistory, setDecisionHistory] = useState<ImportDecision[]>([]);
  const oauthWindow = useRef<Window | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    let { data } = await supabase.from('bling_config').select('*').limit(1).maybeSingle();
    if (!data) {
      const created = await supabase.from('bling_config').insert({}).select('*').single();
      data = created.data;
    }
    setConfig(data as Config | null);
    setClientId((data as any)?.client_id || '');
    setClientSecret((data as any)?.client_secret || '');

    const [{ data: logRows }, { data: linkRows }, { data: queueRows }, { data: latestRun }] = await Promise.all([
      supabase.from('bling_sync_log').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('bling_product_links').select('id, bling_sku, bling_product_id, status, last_error').order('updated_at', { ascending: false }).limit(50),
      supabase.from('bling_sync_queue').select('status'),
      supabase.from('bling_import_runs').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setLogs((logRows || []) as LogRow[]);
    setLinks((linkRows || []) as LinkRow[]);
    const q = { pending: 0, failed: 0, done: 0 };
    (queueRows || []).forEach((r: any) => { if (r.status in q) (q as any)[r.status]++; });
    setQueue(q);
    setImportRun(latestRun as ImportRun | null);
    if (latestRun) {
      const [{ data: importedRows }, { data: decisions }] = await Promise.all([
        supabase.from('bling_import_items').select('*').eq('run_id', latestRun.id).order('created_at').limit(1000),
        supabase.from('bling_import_run_decisions').select('id, decision, reason, created_at').eq('run_id', latestRun.id).order('created_at', { ascending: false }),
      ]);
      setImportItems((importedRows || []) as ImportItem[]);
      setDecisionHistory((decisions || []) as ImportDecision[]);
    } else {
      setImportItems([]);
    }
    if (!silent) setLoading(false);
    return data as Config | null;
  };

  useEffect(() => { load(); }, []);
  useRealtimeRefetch(['bling_import_runs', 'bling_import_items', 'bling_import_run_decisions'], () => load(true));

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
      else toast.error('Não foi possível conectar', { description: friendlyBlingError(msg) });

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
      if (e.data.result === 'ok') {
        const tested = await call('bling-test');
        const loaded = await load();
        if (tested?.ok) {
          setReplacingCredentials(false);
          toast.success('Nova conta do Bling conectada', { description: tested.company || loaded?.company_name ? `Empresa: ${tested.company || loaded?.company_name}` : 'A nova empresa foi autorizada e testada.' });
        }
      } else {
        await load();
        toast.error('Não foi possível conectar', { description: friendlyBlingError(e.data.message) });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!oauthPending) return;
    const timer = window.setInterval(async () => {
      if (oauthWindow.current?.closed) {
        window.clearInterval(timer);
        oauthWindow.current = null;
        setOauthPending(false);
        await load(true);
        return;
      }

      const loaded = await load(true);
      const authorizationFinished = !!loaded?.access_token && !!loaded?.refresh_token && !loaded?.oauth_state && !hasAuthorizationError(loaded?.last_error);
      if (authorizationFinished) {
        window.clearInterval(timer);
        oauthWindow.current?.close();
        oauthWindow.current = null;
        setOauthPending(false);
      }
    }, 1500);
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
      toast.error('Erro', { description: friendlyBlingError((data as any)?.error || error?.message) });
      return null;
    }
    return data as any;
  };

  const connect = async () => {
    const nextClientId = clientId.trim();
    const nextClientSecret = clientSecret.trim();
    if (!nextClientId || !nextClientSecret) {
      toast.error('Preencha o Client ID e o Client Secret do aplicativo Bling.');
      return;
    }

    const credentialsChanged = nextClientId !== config?.client_id || nextClientSecret !== config?.client_secret;
    if (connected && !credentialsChanged) {
      const tested = await call('bling-test');
      if (tested?.ok) {
        await supabase.from('bling_config').update({ oauth_state: null }).eq('id', config?.id ?? '');
        oauthWindow.current?.close();
        oauthWindow.current = null;
        setOauthPending(false);
        await load(true);
        toast.success('O Bling já está conectado', { description: tested.company ? `Empresa: ${tested.company}` : 'Não é necessário autorizar novamente.' });
      }
      return;
    }
    if (connected && credentialsChanged && !window.confirm('As credenciais foram alteradas. Deseja trocar a conta conectada ao Bling?')) return;
    const values: Partial<Config> = {
      client_id: nextClientId,
      client_secret: nextClientSecret,
    };
    if (credentialsChanged) {
      Object.assign(values, {
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        company_name: null,
        is_active: false,
        last_error: null,
      });
    }

    const { data: saved, error: saveError } = await supabase
      .from('bling_config')
      .update(values)
      .eq('id', config?.id ?? '')
      .select('*')
      .single();
    if (saveError || !saved) {
      toast.error('Não foi possível salvar as credenciais', { description: saveError?.message });
      return;
    }
    setConfig(saved as Config);
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

  const startCredentialReplacement = () => {
    setReplacingCredentials(true);
    setClientId('');
    setClientSecret('');
  };

  const cancelCredentialReplacement = () => {
    setReplacingCredentials(false);
    setClientId(config?.client_id || '');
    setClientSecret(config?.client_secret || '');
  };

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copiado');
  };

  const fetchEverything = async () => {
    if (!config?.deposito_id) {
      const options = await call('bling-list-depositos');
      if (options) {
        setDepositos(options.depositos || []);
        setCanais(options.canais || []);
      }
      toast.error('Escolha o depósito do Bling', { description: 'O estoque será buscado no depósito selecionado.' });
      return;
    }
    const preview = await call('bling-import-preview');
    if (!preview?.run_id) return;
    const { data: automaticItems } = await supabase.from('bling_import_items').select('id').eq('run_id', preview.run_id).eq('selected', true).neq('classification', 'conflict');
    if (automaticItems?.length) {
      await call('bling-import-decide', { run_id: preview.run_id, decision: 'approved', reason: 'Importação automática de produtos completos do Bling' });
      for (let index = 0; index < automaticItems.length; index += 50) {
        await call('bling-import-apply', { run_id: preview.run_id, item_ids: automaticItems.slice(index, index + 50).map((item) => item.id) });
      }
    }
    const orders = config?.pull_marketplace_orders ? await call('bling-pull-orders') : null;
    if (orders) await supabase.from('bling_import_runs').update({ orders_result: orders }).eq('id', preview.run_id);
    await load(true);
    toast.success('Dados do Bling sincronizados', { description: `${preview.totals?.total ?? 0} produtos encontrados${automaticItems?.length ? ` · ${automaticItems.length} processados automaticamente` : ''}${preview.totals?.auto_sku_generated ? ` · ${preview.totals.auto_sku_generated} SKUs criados` : ''}${orders ? ` · ${orders.imported ?? 0} pedidos novos · ${orders.updated ?? 0} atualizados${orders.errors ? ` · ${orders.errors} com erro` : ''}` : ''}.` });
  };

  const toggleImportItem = async (item: ImportItem, selected: boolean) => {
    const { error } = await supabase.from('bling_import_items').update({ selected }).eq('id', item.id);
    if (error) return toast.error('Não foi possível alterar a seleção', { description: error.message });
    setImportItems((rows) => rows.map((row) => row.id === item.id ? { ...row, selected } : row));
  };

  const applySelected = async () => {
    if (!importRun) return;
    const pendingIds = importItems.filter((item) => item.selected && item.classification !== 'conflict' && !['created', 'linked', 'updated'].includes(item.apply_status)).map((item) => item.id);
    if (!pendingIds.length) return toast.info('Nenhum produto pendente foi selecionado.');
    let processed = 0;
    let failed = 0;
    for (let index = 0; index < pendingIds.length; index += 50) {
      const result = await call('bling-import-apply', { run_id: importRun.id, item_ids: pendingIds.slice(index, index + 50) });
      if (!result) break;
      processed += Number(result.processed ?? 0);
      failed += Number(result.failed ?? 0);
    }
    await load(true);
    toast.success(`${processed - failed} produto(s) aplicados`, { description: failed ? `${failed} item(ns) precisam de revisão.` : 'O lote foi concluído sem erros.' });
  };

  const decideRun = async (decision: 'approved' | 'rejected') => {
    if (!importRun) return;
    if (decisionReason.trim().length < 3) return toast.error('Informe o motivo da decisão.');
    const result = await call('bling-import-decide', { run_id: importRun.id, decision, reason: decisionReason.trim() });
    if (!result) return;
    setDecisionReason('');
    await load(true);
    toast.success(decision === 'approved' ? 'Lote aprovado' : 'Lote reprovado');
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const connected = !!config?.refresh_token && !hasAuthorizationError(config?.last_error);
  const hasStoredAuthorization = !!config?.refresh_token && !!config?.access_token;
  const visibleImportItems = importItems.filter((item) => {
    const matchesFilter = importFilter === 'all' || item.classification === importFilter;
    const term = importSearch.trim().toLocaleLowerCase('pt-BR');
    return matchesFilter && (!term || item.bling_sku?.toLocaleLowerCase('pt-BR').includes(term) || item.bling_data?.name?.toLocaleLowerCase('pt-BR').includes(term));
  });

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

          {config?.refresh_token && hasAuthorizationError(config?.last_error) && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Conexão expirada.</strong> {friendlyBlingError(config.last_error)}
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

          {replacingCredentials && (
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                Informe o Client ID e o Client Secret do novo aplicativo. A conta atual só será desligada quando você confirmar a troca.
              </AlertDescription>
            </Alert>
          )}

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

          {config?.last_error && !hasAuthorizationError(config.last_error) && (
            <Alert variant="destructive"><AlertDescription className="text-xs">{friendlyBlingError(config.last_error)}</AlertDescription></Alert>
          )}

          <div className="flex flex-wrap gap-2">
            {!connected && (
              <Button onClick={connect} disabled={busy === 'bling-oauth-start' || oauthPending}>
                {busy === 'bling-oauth-start' || oauthPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                {oauthPending ? 'Aguardando autorização' : 'Conectar com o Bling'}
              </Button>
            )}
            {connected && replacingCredentials && (
              <>
                <Button onClick={connect} disabled={busy === 'bling-oauth-start' || oauthPending || !clientId.trim() || !clientSecret.trim()}>
                  {busy === 'bling-oauth-start' || oauthPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                  {oauthPending ? 'Aguardando autorização' : 'Salvar e conectar nova conta'}
                </Button>
                <Button variant="outline" onClick={cancelCredentialReplacement} disabled={busy === 'bling-oauth-start' || oauthPending}>
                  Cancelar troca
                </Button>
              </>
            )}
            <Button onClick={async () => {
              const r = await call('bling-test');
              if (r?.ok) toast.success('Conexão com o Bling funcionando', { description: r.company ? `Empresa: ${r.company}` : undefined });
              await load();
            }} disabled={!hasStoredAuthorization || busy === 'bling-test'}>
              {busy === 'bling-test' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Testar conexão
            </Button>
            {connected && !replacingCredentials && (
              <Button variant="outline" onClick={startCredentialReplacement} disabled={busy === 'bling-oauth-start' || oauthPending}>
                <Building2 className="h-4 w-4 mr-2" />
                Trocar credenciais e conta
              </Button>
            )}
            <Button variant="outline" onClick={() => load()}><RefreshCw className="h-4 w-4 mr-2" />Atualizar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Importar dados do Bling</CardTitle>
          <CardDescription>Busque catálogo, estoque e pedidos. Revise os produtos antes de trazê-los para a loja.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={fetchEverything} disabled={!connected || busy === 'bling-import-preview' || busy === 'bling-pull-orders'}>
              {busy === 'bling-import-preview' || busy === 'bling-pull-orders' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Buscar tudo do Bling
            </Button>
            {importRun && <Badge variant="secondary">Prévia de {new Date(importRun.created_at).toLocaleString('pt-BR')}</Badge>}
            {importRun && <Badge variant={importRun.decision === 'rejected' ? 'destructive' : 'outline'}>{importRun.decision === 'approved' ? 'Lote aprovado' : importRun.decision === 'rejected' ? 'Lote reprovado' : 'Aguardando aprovação'}</Badge>}
          </div>

          {!config?.deposito_id && (
            <Alert>
              <AlertDescription>Escolha o depósito do Bling em <strong>O que sincronizar</strong> para trazer o saldo correto.</AlertDescription>
            </Alert>
          )}

          {importRun?.error_message && <Alert variant="destructive"><AlertDescription>{importRun.error_message}</AlertDescription></Alert>}

          {importRun && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  ['Todos', importRun.totals?.total ?? importItems.length],
                  ['Novos', importRun.totals?.new ?? 0],
                  ['Vinculados', importRun.totals?.linked ?? 0],
                  ['Diferentes', importRun.totals?.different ?? 0],
                  ['Conflitos', importRun.totals?.conflict ?? 0],
                ].map(([label, value]) => <div key={String(label)} className="rounded-md border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value}</p></div>)}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={importSearch} onChange={(event) => setImportSearch(event.target.value)} placeholder="Buscar por produto ou SKU" className="pl-9" /></div>
                <Select value={importFilter} onValueChange={setImportFilter}>
                  <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="new">Novos</SelectItem><SelectItem value="linked">Vinculados</SelectItem><SelectItem value="different">Com diferenças</SelectItem><SelectItem value="conflict">Conflitos</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-10">Trazer</TableHead><TableHead>Produto</TableHead><TableHead>SKU</TableHead><TableHead>Bling</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {visibleImportItems.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum produto nesta seleção.</TableCell></TableRow>}
                    {visibleImportItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell><Checkbox checked={item.selected} disabled={item.classification === 'conflict' || ['created', 'linked', 'updated'].includes(item.apply_status)} onCheckedChange={(value) => toggleImportItem(item, value === true)} aria-label={`Selecionar ${item.bling_data?.name ?? item.bling_sku ?? 'produto'}`} /></TableCell>
                        <TableCell><div className="flex items-center gap-3">{item.bling_data?.images?.[0] ? <img src={item.bling_data.images[0]} alt={item.bling_data?.name || 'Produto do Bling'} className="h-10 w-10 shrink-0 rounded-sm object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted"><ImageOff className="h-4 w-4 text-muted-foreground" /></div>}<div><p className="font-medium">{item.bling_data?.name || 'Sem nome'}</p>{item.error_message && <p className="text-xs text-destructive">{item.error_message}</p>}{item.local_product_id && <a href={`/admin/products?product=${item.local_product_id}`} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">Abrir em Produtos <ExternalLink className="h-3 w-3" /></a>}</div></div></TableCell>
                         <TableCell className="font-mono text-xs"><span>{item.bling_sku || 'Sem SKU'}</span>{item.bling_data?.auto_sku_generated && <Badge variant="outline" className="ml-2 font-sans">Automático</Badge>}</TableCell>
                        <TableCell><p>{Number(item.bling_data?.price ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p><p className="text-xs text-muted-foreground">Estoque: {item.bling_data?.stock ?? 'não informado'} · Fotos: {item.bling_data?.images?.length ?? 0}</p>{!(item.bling_data?.images?.length) && <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><ImageOff className="h-3 w-3" />Sem foto no Bling</span>}</TableCell>
                         <TableCell><Badge variant={item.classification === 'conflict' ? 'destructive' : 'secondary'}>{item.apply_status !== 'pending' ? item.apply_status : item.bling_data?.auto_sku_generated ? 'SKU criado no Bling' : ({ new: 'Novo rascunho', linked: 'Já vinculado', different: 'Com diferenças', conflict: 'Revisar conflito' } as const)[item.classification]}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 border-t pt-4">
                <Label htmlFor="bling-decision-reason">Motivo da decisão</Label>
                <Textarea id="bling-decision-reason" value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder="Ex.: cadastros e saldos conferidos no depósito selecionado" maxLength={1000} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => decideRun('approved')} disabled={!!busy || decisionReason.trim().length < 3}><CheckCircle2 className="mr-2 h-4 w-4" />Aprovar lote</Button>
                  <Button variant="destructive" onClick={() => decideRun('rejected')} disabled={!!busy || decisionReason.trim().length < 3}><XCircle className="mr-2 h-4 w-4" />Reprovar lote</Button>
                </div>
                {decisionHistory.length > 0 && <div className="space-y-2"><p className="text-sm font-medium">Histórico de decisões</p>{decisionHistory.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"><div><Badge variant={entry.decision === 'approved' ? 'secondary' : 'destructive'}>{entry.decision === 'approved' ? 'Aprovado' : 'Reprovado'}</Badge><p className="mt-1 text-muted-foreground">{entry.reason}</p></div><time className="shrink-0 text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString('pt-BR')}</time></div>)}</div>}
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Produtos com foto, preço e SKU são publicados automaticamente. Itens sem estoque aparecem como ESGOTADO; itens sem foto, preço ou SKU ficam como rascunho.</p>
                <Button onClick={applySelected} disabled={importRun.decision !== 'approved' || busy === 'bling-import-apply' || !importItems.some((item) => item.selected && item.classification !== 'conflict' && !['created', 'linked', 'updated'].includes(item.apply_status))}>
                  {busy === 'bling-import-apply' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Aplicar selecionados
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>O que sincronizar</CardTitle>
          <CardDescription>Ligue e desligue cada parte quando quiser.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['TikTok Shop', 'Mercado Livre', 'Shopee', 'Amazon'].map((channel) => (
              <div key={channel} className="flex min-h-24 flex-col justify-between rounded-md border p-3">
                <div className="flex items-center gap-2"><Store className="h-4 w-4" /><p className="font-medium">{channel}</p></div>
                <div><Badge variant={connected && config?.pull_marketplace_orders ? 'secondary' : 'outline'}>{connected && config?.pull_marketplace_orders ? 'Automático via Bling' : 'Aguardando configuração'}</Badge></div>
              </div>
            ))}
          </div>
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
          <Button variant="outline" onClick={async () => { const r = await call('bling-pull-orders'); if (r) toast.success(`${r.imported ?? 0} pedidos novos`, { description: `${r.updated ?? 0} atualizados${r.errors ? ` · ${r.errors} com erro` : ''}` }); await load(); }} disabled={!connected || busy === 'bling-pull-orders'}>
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
