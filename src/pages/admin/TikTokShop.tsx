import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import {
  Eye, EyeOff, Copy, Check, Music2, ExternalLink, Loader2, Plug, Unplug,
  RefreshCw, Tag, Package, FileText, AlertCircle, CheckCircle2, XCircle, Send, Ban, ShoppingBag,
} from 'lucide-react';

interface TikTokConfig {
  id: string;
  app_key: string | null;
  app_secret: string | null;
  shop_id: string | null;
  shop_name: string | null;
  is_active: boolean;
  access_token: string | null;
  token_expires_at: string | null;
  last_sync_at: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  auto_sync_products: boolean;
  auto_sync_orders: boolean;
  last_order_pull_at: string | null;
}

interface TikTokCategory {
  id: string;
  parent_id: string;
  local_name: string;
  is_leaf: boolean;
}

export default function TikTokShop() {
  const [config, setConfig] = useState<TikTokConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const callbackUrl = `https://tcwmjnyqwdeuknysciau.supabase.co/functions/v1/tiktok-oauth-callback`;

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('tiktok_shop_config').select('*').limit(1).maybeSingle();
    if (data) {
      setConfig(data as TikTokConfig);
      setAppKey(data.app_key || '');
      setAppSecret(data.app_secret || '');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaveCredentials = async () => {
    if (!appKey.trim() || !appSecret.trim()) {
      toast({ title: 'Preencha App Key e App Secret', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('tiktok_shop_config')
      .update({ app_key: appKey.trim(), app_secret: appSecret.trim() })
      .eq('id', config!.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Credenciais salvas' });
    load();
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-oauth-start');
      if (error) throw error;
      if (data?.authorizeUrl) {
        window.open(data.authorizeUrl, '_blank', 'width=720,height=820');
        toast({ title: 'Autorize no TikTok', description: 'Conclua o login na janela aberta. Depois recarregue esta página.' });
      } else if (data?.error) throw new Error(data.error);
    } catch (e: any) {
      toast({ title: 'Falha ao iniciar conexão', description: e.message, variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Desconectar a loja do TikTok?')) return;
    await supabase.from('tiktok_shop_config').update({
      access_token: null, refresh_token: null, token_expires_at: null,
      refresh_expires_at: null, shop_id: null, shop_name: null, is_active: false,
    }).eq('id', config!.id);
    toast({ title: 'Loja desconectada' });
    load();
  };

  const copyCallback = async () => {
    await navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateConfigField = async (field: keyof TikTokConfig, value: any) => {
    if (!config) return;
    const { error } = await supabase.from('tiktok_shop_config').update({ [field]: value }).eq('id', config.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setConfig({ ...config, [field]: value });
  };

  const hasCredentials = !!(config?.app_key && config?.app_secret);
  const isConnected = !!config?.is_active && !!config?.access_token;
  const credentialsChanged = appKey !== (config?.app_key || '') || appSecret !== (config?.app_secret || '');

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Music2 className="h-6 w-6" /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">TikTok Shop</h1>
          <p className="text-sm text-muted-foreground">Conecte e sincronize produtos, estoque e pedidos.</p>
        </div>
        {isConnected ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600">Conectado</Badge>
        ) : (
          <Badge variant="secondary">Desconectado</Badge>
        )}
      </div>

      <Tabs defaultValue="connection">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="connection">Conexão</TabsTrigger>
          <TabsTrigger value="config" disabled={!isConnected}>Configuração</TabsTrigger>
          <TabsTrigger value="categories" disabled={!isConnected}><Tag className="h-3.5 w-3.5 mr-1" />Categorias</TabsTrigger>
          <TabsTrigger value="products" disabled={!isConnected}><Package className="h-3.5 w-3.5 mr-1" />Produtos</TabsTrigger>
          <TabsTrigger value="orders" disabled={!isConnected}><ShoppingBag className="h-3.5 w-3.5 mr-1" />Pedidos</TabsTrigger>
          <TabsTrigger value="logs"><FileText className="h-3.5 w-3.5 mr-1" />Logs</TabsTrigger>
        </TabsList>

        {/* CONEXÃO */}
        <TabsContent value="connection" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Credenciais da App</CardTitle>
              <CardDescription>
                Cole sua App Key e App Secret obtidas no{' '}
                <a href="https://partner.tiktokshop.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                  TikTok Partner Center <ExternalLink className="h-3 w-3" />
                </a>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="app_key">App Key</Label>
                <Input id="app_key" value={appKey} onChange={(e) => setAppKey(e.target.value)} placeholder="6abc1234..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app_secret">App Secret</Label>
                <div className="relative">
                  <Input id="app_secret" type={showSecret ? 'text' : 'password'} value={appSecret} onChange={(e) => setAppSecret(e.target.value)} placeholder="••••••••" className="pr-10" />
                  <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Redirect URL (cole no Partner Center)</Label>
                <div className="flex gap-2">
                  <Input value={callbackUrl} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={copyCallback}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button onClick={handleSaveCredentials} disabled={saving || !credentialsChanged}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar credenciais
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Conexão da Loja</CardTitle>
              <CardDescription>Autorize sua loja TikTok Shop a se comunicar com o ERP.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnected && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><div className="text-muted-foreground">Loja</div><div className="font-medium">{config?.shop_name || config?.shop_id || '—'}</div></div>
                  <div><div className="text-muted-foreground">Token válido até</div><div className="font-medium">{config?.token_expires_at ? new Date(config.token_expires_at).toLocaleString('pt-BR') : '—'}</div></div>
                </div>
              )}
              {!hasCredentials && (
                <div className="text-sm text-muted-foreground p-3 rounded-md border border-dashed">Salve as credenciais acima antes de conectar.</div>
              )}
              <div className="flex gap-2">
                {!isConnected ? (
                  <Button onClick={handleConnect} disabled={!hasCredentials || connecting}>
                    {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />}
                    Conectar TikTok Shop
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleConnect} disabled={connecting}>Reautorizar</Button>
                    <Button variant="destructive" onClick={handleDisconnect}><Unplug className="h-4 w-4 mr-2" />Desconectar</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONFIGURAÇÃO */}
        <TabsContent value="config" className="space-y-6 mt-6">
          <WarehouseConfig config={config!} onChange={(field, value) => updateConfigField(field as any, value)} />
        </TabsContent>

        {/* CATEGORIAS */}
        <TabsContent value="categories" className="mt-6">
          <CategoryMapping />
        </TabsContent>

        {/* PRODUTOS */}
        <TabsContent value="products" className="mt-6">
          <ProductsSync />
        </TabsContent>

        {/* PEDIDOS */}
        <TabsContent value="orders" className="mt-6">
          <OrdersSync config={config!} onChange={(field, value) => updateConfigField(field as any, value)} />
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs" className="mt-6">
          <LogsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ WAREHOUSE / CONFIG ============
function WarehouseConfig({ config, onChange }: { config: TikTokConfig; onChange: (field: string, value: any) => void }) {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-list-warehouses');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setWarehouses(data?.warehouses ?? []);
    } catch (e: any) {
      toast({ title: 'Erro ao buscar warehouses', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWarehouses(); }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configuração de envio e sincronização</CardTitle>
        <CardDescription>Escolha o depósito padrão e ative a sincronização automática.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Depósito (Warehouse)</Label>
            <Button variant="ghost" size="sm" onClick={loadWarehouses} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />Recarregar
            </Button>
          </div>
          <select
            value={config.warehouse_id ?? ''}
            onChange={(e) => {
              const w = warehouses.find((x) => x.id === e.target.value || x.warehouse_id === e.target.value);
              const id = e.target.value;
              const name = w?.name ?? w?.warehouse_name ?? '';
              onChange('warehouse_id', id || null);
              onChange('warehouse_name', name || null);
            }}
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">— Selecione —</option>
            {warehouses.map((w: any) => (
              <option key={w.id ?? w.warehouse_id} value={w.id ?? w.warehouse_id}>
                {w.name ?? w.warehouse_name} ({w.id ?? w.warehouse_id})
              </option>
            ))}
          </select>
          {!warehouses.length && !loading && (
            <p className="text-xs text-muted-foreground">Nenhum warehouse retornado. Verifique sua conta TikTok Shop.</p>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label>Sincronização automática</Label>
            <p className="text-xs text-muted-foreground">Ao editar um produto, ele é reenviado ao TikTok em até 5 minutos.</p>
          </div>
          <Switch checked={config.auto_sync_products} onCheckedChange={(v) => onChange('auto_sync_products', v)} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Importar pedidos automaticamente</Label>
            <p className="text-xs text-muted-foreground">Busca novos pedidos do TikTok Shop a cada 5 minutos.</p>
          </div>
          <Switch checked={config.auto_sync_orders} onCheckedChange={(v) => onChange('auto_sync_orders', v)} />
        </div>
      </CardContent>
    </Card>
  );
}

// ============ CATEGORY MAPPING ============
function CategoryMapping() {
  const [localCats, setLocalCats] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, any>>({});
  const [ttTree, setTtTree] = useState<TikTokCategory[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [search, setSearch] = useState('');
  const [editingCat, setEditingCat] = useState<any | null>(null);

  const load = async () => {
    const [{ data: cats }, { data: maps }] = await Promise.all([
      supabase.from('product_categories').select('id, label, value').order('position'),
      supabase.from('tiktok_category_map').select('*'),
    ]);
    setLocalCats(cats ?? []);
    const m: Record<string, any> = {};
    (maps ?? []).forEach((x: any) => { m[x.local_category_id] = x; });
    setMappings(m);
  };

  const loadTree = async () => {
    setLoadingTree(true);
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-list-categories');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTtTree(data?.categories ?? []);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar categorias TikTok', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openMap = async (cat: any) => {
    setEditingCat(cat);
    if (!ttTree.length) await loadTree();
  };

  const saveMapping = async (ttId: string, ttName: string) => {
    if (!editingCat) return;
    const { error } = await supabase.from('tiktok_category_map').upsert({
      local_category_id: editingCat.id,
      tiktok_category_id: ttId,
      tiktok_category_name: ttName,
    }, { onConflict: 'local_category_id' });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Categoria mapeada' });
    setEditingCat(null);
    load();
  };

  const removeMapping = async (cat: any) => {
    await supabase.from('tiktok_category_map').delete().eq('local_category_id', cat.id);
    load();
  };

  const leafs = ttTree.filter((c) => c.is_leaf && (!search || c.local_name.toLowerCase().includes(search.toLowerCase())));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mapeamento de Categorias</CardTitle>
        <CardDescription>Para cada categoria do ERP, escolha a categoria correspondente no TikTok Shop.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md divide-y">
          {localCats.map((cat) => {
            const m = mappings[cat.id];
            return (
              <div key={cat.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{cat.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {m ? <>TikTok: <span className="font-mono">{m.tiktok_category_name}</span></> : 'Não mapeada'}
                  </div>
                </div>
                <div className="flex gap-2">
                  {m && <Button variant="ghost" size="sm" onClick={() => removeMapping(cat)}>Remover</Button>}
                  <Button variant="outline" size="sm" onClick={() => openMap(cat)}>{m ? 'Trocar' : 'Mapear'}</Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <Dialog open={!!editingCat} onOpenChange={(o) => !o && setEditingCat(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Mapear "{editingCat?.label}"</DialogTitle>
            <DialogDescription>Escolha a categoria-folha do TikTok Shop.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Buscar categoria..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex-1 overflow-auto border rounded-md">
            {loadingTree ? (
              <div className="flex items-center justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : leafs.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Nenhuma categoria. Use "Buscar" ou recarregue.</div>
            ) : (
              <div className="divide-y">
                {leafs.slice(0, 200).map((c) => (
                  <button key={c.id} className="w-full text-left p-3 hover:bg-muted text-sm flex items-center justify-between" onClick={() => saveMapping(c.id, c.local_name)}>
                    <span>{c.local_name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{c.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={loadTree}><RefreshCw className="h-3.5 w-3.5 mr-1" />Recarregar árvore</Button>
            <Button variant="ghost" onClick={() => setEditingCat(null)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============ PRODUCTS SYNC ============
function ProductsSync() {
  const [products, setProducts] = useState<any[]>([]);
  const [links, setLinks] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'synced' | 'not_synced' | 'error'>('all');
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: prods }, { data: lks }] = await Promise.all([
      supabase.from('products').select('id, title, status, product_type, price').eq('status', 'active').order('updated_at', { ascending: false }).limit(500),
      supabase.from('tiktok_product_links').select('*').is('variant_id', null),
    ]);
    setProducts(prods ?? []);
    const m: Record<string, any> = {};
    (lks ?? []).forEach((x: any) => { m[x.product_id] = x; });
    setLinks(m);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter((p) => {
    const l = links[p.id];
    if (filter === 'synced') return l?.status === 'synced';
    if (filter === 'error') return l?.status === 'error';
    if (filter === 'not_synced') return !l || (l.status !== 'synced' && l.status !== 'error');
    return true;
  });

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.id)));
  };

  const syncProduct = async (ids: string[]) => {
    if (!ids.length) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-sync-product', { body: { product_ids: ids } });
      if (error) throw error;
      const okCount = data?.results?.filter((r: any) => r.ok).length ?? 0;
      const errCount = (data?.results?.length ?? 0) - okCount;
      toast({
        title: `${okCount} sincronizado(s)${errCount ? `, ${errCount} com erro` : ''}`,
        variant: errCount ? 'destructive' : 'default',
      });
      setSelected(new Set());
      load();
    } catch (e: any) {
      toast({ title: 'Falha', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const unlistProduct = async (id: string) => {
    if (!confirm('Despublicar este produto no TikTok?')) return;
    const { error } = await supabase.functions.invoke('tiktok-unlist-product', { body: { product_id: id } });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Despublicado' }); load(); }
  };

  const statusBadge = (l: any) => {
    if (!l) return <Badge variant="secondary">Não enviado</Badge>;
    if (l.status === 'error') return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Erro</Badge>;
    if (l.status === 'synced') return <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" />{l.tiktok_status || 'Publicado'}</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Produtos</CardTitle>
            <CardDescription>{filtered.length} produto(s) — {selected.size} selecionado(s)</CardDescription>
          </div>
          <div className="flex gap-2">
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
              <option value="all">Todos</option>
              <option value="not_synced">Não enviados</option>
              <option value="synced">Publicados</option>
              <option value="error">Com erro</option>
            </select>
            <Button size="sm" onClick={() => syncProduct(Array.from(selected))} disabled={!selected.size || syncing}>
              {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Sincronizar selecionados
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="border rounded-md">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 p-3 border-b bg-muted/30 text-xs font-medium">
              <Checkbox checked={selected.size > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} />
              <div>Produto</div>
              <div>Status</div>
              <div>Última sync</div>
              <div>Ações</div>
            </div>
            <div className="divide-y max-h-[60vh] overflow-auto">
              {filtered.map((p) => {
                const l = links[p.id];
                return (
                  <div key={p.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 p-3 items-center text-sm">
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={(c) => {
                        const s = new Set(selected);
                        if (c) s.add(p.id); else s.delete(p.id);
                        setSelected(s);
                      }}
                    />
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.product_type || 'sem categoria'} · R$ {Number(p.price).toFixed(2)}</div>
                      {l?.last_error && (
                        <div className="text-xs text-destructive mt-0.5 flex items-start gap-1"><AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />{l.last_error}</div>
                      )}
                    </div>
                    <div>{statusBadge(l)}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{l?.last_pushed_at ? new Date(l.last_pushed_at).toLocaleString('pt-BR') : '—'}</div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => syncProduct([p.id])} disabled={syncing}>
                        <Send className="h-3 w-3 mr-1" />{l ? 'Atualizar' : 'Enviar'}
                      </Button>
                      {l?.tiktok_product_id && (
                        <Button size="sm" variant="ghost" onClick={() => unlistProduct(p.id)}>
                          <Ban className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {!filtered.length && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum produto.</div>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ LOGS ============
function LogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('tiktok_sync_log').select('*').order('created_at', { ascending: false }).limit(100);
    setLogs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Logs de sincronização</CardTitle>
            <CardDescription>Últimos 100 eventos.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />Recarregar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md divide-y max-h-[60vh] overflow-auto">
          {logs.map((l) => (
            <div key={l.id} className="p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {l.status === 'success' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                  <span className="font-medium">{l.entity_type} · {l.action}</span>
                  <Badge variant={l.status === 'success' ? 'default' : 'destructive'}>{l.status}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString('pt-BR')}</span>
              </div>
              {l.error_message && <div className="text-xs text-destructive mt-1">{l.error_message}</div>}
              {l.entity_id && <div className="text-xs text-muted-foreground mt-0.5">ID: <span className="font-mono">{l.entity_id}</span></div>}
            </div>
          ))}
          {!logs.length && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum log ainda.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ ORDERS SYNC ============
function OrdersSync({ config, onChange }: { config: TikTokConfig; onChange: (field: string, value: any) => void }) {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tiktok_order_links')
      .select('id, tiktok_order_id, tiktok_status, last_synced_at, imported_at, order_id, orders:order_id(order_number, total, status)')
      .order('imported_at', { ascending: false })
      .limit(100);
    setLinks(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pullNow = async () => {
    setPulling(true);
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-pull-orders');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Sincronização concluída', description: `${data?.imported ?? 0} novo(s), ${data?.updated ?? 0} atualizado(s)` });
      await load();
    } catch (e: any) {
      toast({ title: 'Erro ao puxar pedidos', description: e.message, variant: 'destructive' });
    } finally {
      setPulling(false);
    }
  };

  const webhookUrl = `https://tcwmjnyqwdeuknysciau.supabase.co/functions/v1/tiktok-webhook`;
  const [copiedWh, setCopiedWh] = useState(false);
  const copyWebhook = () => { navigator.clipboard.writeText(webhookUrl); setCopiedWh(true); setTimeout(() => setCopiedWh(false), 1500); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Pedidos importados do TikTok Shop</CardTitle>
              <CardDescription>
                Última importação: {config.last_order_pull_at ? new Date(config.last_order_pull_at).toLocaleString('pt-BR') : 'nunca'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load}><RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />Recarregar</Button>
              <Button size="sm" onClick={pullNow} disabled={pulling}>
                {pulling ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                Importar agora
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-3 bg-muted/40 text-xs space-y-2">
            <div className="font-medium">Webhook (opcional — colar no Partner Center → Webhooks)</div>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyWebhook}>
                {copiedWh ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-muted-foreground">Cadastre o evento <span className="font-mono">ORDER_STATUS_CHANGE</span> para importação em tempo real.</p>
          </div>

          <div className="border rounded-md divide-y max-h-[55vh] overflow-auto">
            {links.map((l) => (
              <div key={l.id} className="p-3 text-sm flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{l.orders?.order_number ?? '—'}</span>
                    <Badge variant="secondary">{l.tiktok_status}</Badge>
                    {l.orders?.status && <Badge>{l.orders.status}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    TikTok: <span className="font-mono">{l.tiktok_order_id}</span>
                    {l.orders?.total != null && <> · R$ {Number(l.orders.total).toFixed(2)}</>}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <div>Importado: {new Date(l.imported_at).toLocaleString('pt-BR')}</div>
                  {l.order_id && (
                    <a href={`/admin/orders/${l.order_id}`} className="text-primary inline-flex items-center gap-1 hover:underline">
                      Abrir pedido <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {!links.length && !loading && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum pedido importado ainda. Clique em "Importar agora" para buscar os pedidos das últimas 24h.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
