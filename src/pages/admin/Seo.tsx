import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, Save, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaPicker } from '@/components/cms/MediaPicker';
import { useSaveSeo, useSaveStaticSeo, useSeoItems, type SeoItem, type StaticSeoEntry } from '@/hooks/useSeoAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function Preview({ title, description, image, path }: { title: string; description: string; image: string; path: string }) {
  return <div className="space-y-4">
    <div className="rounded-md border bg-background p-4">
      <p className="text-sm text-emerald-700">ogarimpodigital.com.br{path}</p>
      <p className="mt-1 text-xl text-primary">{title || 'Título da página'}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description || 'Descrição da página'}</p>
    </div>
    <div className="overflow-hidden rounded-md border bg-background">
      {image ? <img src={image} alt="Prévia social" className="aspect-[1.91/1] w-full object-cover" /> : <div className="flex aspect-[1.91/1] items-center justify-center bg-muted text-sm text-muted-foreground">Imagem padrão da loja</div>}
      <div className="p-4"><p className="font-medium">{title || 'Título da página'}</p><p className="line-clamp-2 text-sm text-muted-foreground">{description || 'Descrição da página'}</p></div>
    </div>
  </div>;
}

function SeoEditor({ item, onSave, saving }: { item: SeoItem; onSave: (item: SeoItem) => void; saving: boolean }) {
  const [draft, setDraft] = useState(item);
  useEffect(() => setDraft(item), [item]);
  const title = draft.title || draft.fallbackTitle;
  const description = draft.description || draft.fallbackDescription;
  const image = draft.image || draft.fallbackImage;
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
    <Card><CardHeader><CardTitle className="flex items-center justify-between gap-3"><span>{item.name}</span><Badge variant={item.published ? 'secondary' : 'outline'}>{item.published ? 'Publicado' : 'Não publicado'}</Badge></CardTitle></CardHeader><CardContent className="space-y-5">
      <div className="space-y-2"><Label>Título para o Google</Label><Input value={draft.title} maxLength={70} placeholder={draft.fallbackTitle} onChange={(e) => setDraft({ ...draft, title: e.target.value })}/><p className="text-xs text-muted-foreground">{draft.title.length}/70</p></div>
      <div className="space-y-2"><Label>Descrição</Label><Textarea value={draft.description} maxLength={170} rows={4} placeholder={draft.fallbackDescription} onChange={(e) => setDraft({ ...draft, description: e.target.value })}/><p className="text-xs text-muted-foreground">{draft.description.length}/170</p></div>
      <MediaPicker value={draft.image} onChange={(image) => setDraft({ ...draft, image })} label="Escolher imagem da prévia social" />
      <Button onClick={() => onSave(draft)} disabled={saving} className="gap-2"><Save className="h-4 w-4" />Salvar</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Prévia</CardTitle></CardHeader><CardContent><Preview title={title} description={description} image={image} path={item.path}/></CardContent></Card>
  </div>;
}

export default function Seo() {
  const { data, isLoading } = useSeoItems();
  const saveItem = useSaveSeo();
  const saveStatic = useSaveStaticSeo();
  const [kind, setKind] = useState('product');
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [route, setRoute] = useState<StaticSeoEntry | null>(null);
  const [checking, setChecking] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{ indexed: boolean; message: string; lastCrawl?: string } | null>(null);
  const items = useMemo(() => (data?.items || []).filter((item) => item.kind === kind && item.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [data, kind, query]);
  const selected = items.find((item) => item.id === selectedId) || items[0];
  useEffect(() => { if (selected && selected.id !== selectedId) setSelectedId(selected.id); }, [selected, selectedId]);
  useEffect(() => { if (!route && data?.routes?.[0]) setRoute(data.routes[0]); }, [data, route]);

  const checkGoogle = async () => {
    setChecking(true);
    const { data: result, error } = await supabase.functions.invoke('google-index-status', { body: { url: `https://ogarimpodigital.com.br${selected?.path || route?.path || '/'}` } });
    setChecking(false);
    if (error || !result?.ok) {
      const message = result?.error || 'Não foi possível consultar o Google';
      setGoogleStatus({ indexed: false, message });
      return toast.error(message);
    }
    setGoogleStatus({ indexed: result.indexed, message: result.message, lastCrawl: result.last_crawl });
    toast.success(result.message || 'Situação consultada');
  };

  if (isLoading) return <div className="flex min-h-[320px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  return <div className="space-y-6 p-4 md:p-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-semibold">SEO e prévias sociais</h1><p className="text-sm text-muted-foreground">Gerencie como páginas e produtos aparecem no Google e ao compartilhar.</p></div><Button variant="outline" onClick={checkGoogle} disabled={checking} className="gap-2"><RefreshCw className={checking ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />Checar no Google</Button></div>
    {googleStatus ? <div className="rounded-md border bg-muted/30 p-4"><div className="flex items-center gap-2"><Badge variant={googleStatus.indexed ? 'secondary' : 'destructive'}>{googleStatus.indexed ? 'Indexada' : 'Não indexada'}</Badge><p className="text-sm font-medium">{googleStatus.message}</p></div>{googleStatus.lastCrawl ? <p className="mt-2 text-xs text-muted-foreground">Última leitura do Google: {new Date(googleStatus.lastCrawl).toLocaleString('pt-BR')}</p> : null}</div> : null}
    <Tabs value={kind} onValueChange={(value) => { setKind(value); setSelectedId(''); setGoogleStatus(null); }}>
      <TabsList className="grid w-full grid-cols-5 md:w-[720px]"><TabsTrigger value="product">Produtos</TabsTrigger><TabsTrigger value="page">Páginas</TabsTrigger><TabsTrigger value="promo">Promoções</TabsTrigger><TabsTrigger value="kit">Kits</TabsTrigger><TabsTrigger value="static">Loja</TabsTrigger></TabsList>
      <TabsContent value="static" className="mt-6">{route && <div className="space-y-4"><Select value={route.path} onValueChange={(path) => { const found = data?.routes.find((item) => item.path === path); if (found) setRoute(found); }}><SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger><SelectContent>{data?.routes.map((item) => <SelectItem key={item.path} value={item.path}>{item.name}</SelectItem>)}</SelectContent></Select><SeoEditor item={{ id: route.path, kind: 'page', name: route.name, path: route.path, title: route.title, description: route.description, image: route.image, fallbackTitle: route.title, fallbackDescription: route.description, fallbackImage: '', published: true }} saving={saveStatic.isPending} onSave={(draft) => { const routes = (data?.routes || []).map((item) => item.path === route.path ? { ...item, title: draft.title, description: draft.description, image: draft.image } : item); saveStatic.mutate(routes); setRoute({ ...route, title: draft.title, description: draft.description, image: draft.image }); }}/></div>}</TabsContent>
      <TabsContent value={kind === 'static' ? 'none' : kind} className="mt-6"><div className="mb-4 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produto ou página"/></div><Select value={selected?.id || ''} onValueChange={setSelectedId}><SelectTrigger className="sm:w-[360px]"><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{items.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>{selected ? <SeoEditor item={selected} saving={saveItem.isPending} onSave={(item) => saveItem.mutate(item)}/> : <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum item encontrado.</CardContent></Card>}</TabsContent>
    </Tabs>
    <Card><CardHeader><CardTitle>Arquivos para o Google</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild variant="outline"><a href="/sitemap.xml" target="_blank" rel="noreferrer">Mapa de páginas <ExternalLink className="ml-2 h-4 w-4"/></a></Button><Button asChild variant="outline"><a href="/sitemap-products.xml" target="_blank" rel="noreferrer">Mapa de produtos <ExternalLink className="ml-2 h-4 w-4"/></a></Button><Button asChild variant="outline"><a href="/robots.txt" target="_blank" rel="noreferrer">Regras de busca <ExternalLink className="ml-2 h-4 w-4"/></a></Button></CardContent></Card>
  </div>;
}
