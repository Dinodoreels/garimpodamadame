import { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff, Code, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSiteContent } from '@/hooks/useSiteContent';

interface MetaPixelConfig {
  enabled: boolean;
  pixelId: string;
  conversionApiToken: string;
  events: {
    pageView: boolean;
    viewContent: boolean;
    addToCart: boolean;
    initiateCheckout: boolean;
    purchase: boolean;
  };
}

interface GA4Config {
  enabled: boolean;
  measurementId: string;
  events: {
    page_view: boolean;
    view_item: boolean;
    add_to_cart: boolean;
    begin_checkout: boolean;
    purchase: boolean;
  };
}

interface TikTokConfig {
  enabled: boolean;
  pixelId: string;
  events: {
    PageVisit: boolean;
    ViewContent: boolean;
    AddToCart: boolean;
    InitiateCheckout: boolean;
    CompletePayment: boolean;
  };
}

interface GTMConfig {
  enabled: boolean;
  containerId: string;
}

interface CustomPixelConfig {
  enabled: boolean;
  script: string;
}

export interface PixelsConfig {
  meta: MetaPixelConfig;
  google_analytics: GA4Config;
  tiktok: TikTokConfig;
  gtm: GTMConfig;
  custom: CustomPixelConfig;
}

const DEFAULT_CONFIG: PixelsConfig = {
  meta: {
    enabled: false,
    pixelId: '',
    conversionApiToken: '',
    events: { pageView: true, viewContent: true, addToCart: true, initiateCheckout: true, purchase: true },
  },
  google_analytics: {
    enabled: false,
    measurementId: '',
    events: { page_view: true, view_item: true, add_to_cart: true, begin_checkout: true, purchase: true },
  },
  tiktok: {
    enabled: false,
    pixelId: '',
    events: { PageVisit: true, ViewContent: true, AddToCart: true, InitiateCheckout: true, CompletePayment: true },
  },
  gtm: {
    enabled: false,
    containerId: '',
  },
  custom: {
    enabled: false,
    script: '',
  },
};

const META_EVENT_LABELS: Record<string, { label: string; tip: string }> = {
  pageView: { label: 'PageView', tip: 'Disparado a cada mudança de página' },
  viewContent: { label: 'ViewContent', tip: 'Disparado ao visualizar página de produto' },
  addToCart: { label: 'AddToCart', tip: 'Disparado ao adicionar item ao carrinho' },
  initiateCheckout: { label: 'InitiateCheckout', tip: 'Disparado ao iniciar o checkout' },
  purchase: { label: 'Purchase', tip: 'Disparado ao concluir uma compra' },
};

const GA4_EVENT_LABELS: Record<string, { label: string; tip: string }> = {
  page_view: { label: 'page_view', tip: 'Visualização de página' },
  view_item: { label: 'view_item', tip: 'Visualização de produto' },
  add_to_cart: { label: 'add_to_cart', tip: 'Adição ao carrinho' },
  begin_checkout: { label: 'begin_checkout', tip: 'Início do checkout' },
  purchase: { label: 'purchase', tip: 'Compra concluída' },
};

const TIKTOK_EVENT_LABELS: Record<string, { label: string; tip: string }> = {
  PageVisit: { label: 'PageVisit', tip: 'Visualização de página' },
  ViewContent: { label: 'ViewContent', tip: 'Visualização de produto' },
  AddToCart: { label: 'AddToCart', tip: 'Adição ao carrinho' },
  InitiateCheckout: { label: 'InitiateCheckout', tip: 'Início do checkout' },
  CompletePayment: { label: 'CompletePayment', tip: 'Pagamento concluído' },
};

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge variant={enabled ? 'default' : 'secondary'} className={enabled ? 'bg-green-600 hover:bg-green-700' : ''}>
      {enabled ? 'Ativo' : 'Inativo'}
    </Badge>
  );
}

function EventCheckbox({ id, label, tip, checked, onChange }: { id: string; label: string; tip: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Checkbox id={id} checked={checked} onCheckedChange={v => onChange(!!v)} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Label htmlFor={id} className="text-sm font-normal cursor-pointer flex items-center gap-1">
              {label}
              <Info className="h-3 w-3 text-muted-foreground" />
            </Label>
          </TooltipTrigger>
          <TooltipContent><p>{tip}</p></TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export function PixelsTab() {
  const { data, isLoading, save, saving } = useSiteContent<PixelsConfig>('pixels_config');
  const [config, setConfig] = useState<PixelsConfig>(DEFAULT_CONFIG);
  const [showToken, setShowToken] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setConfig({
        meta: { ...DEFAULT_CONFIG.meta, ...data.meta, events: { ...DEFAULT_CONFIG.meta.events, ...data.meta?.events } },
        google_analytics: { ...DEFAULT_CONFIG.google_analytics, ...data.google_analytics, events: { ...DEFAULT_CONFIG.google_analytics.events, ...data.google_analytics?.events } },
        tiktok: { ...DEFAULT_CONFIG.tiktok, ...data.tiktok, events: { ...DEFAULT_CONFIG.tiktok.events, ...data.tiktok?.events } },
        gtm: { ...DEFAULT_CONFIG.gtm, ...data.gtm },
        custom: { ...DEFAULT_CONFIG.custom, ...data.custom },
      });
      setInitialized(true);
    }
  }, [data, initialized]);

  const handleSave = () => save(config);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const metaInvalid = config.meta?.enabled && !config.meta?.pixelId;
  const ga4Invalid = config.google_analytics?.enabled && !config.google_analytics?.measurementId;
  const tiktokInvalid = config.tiktok?.enabled && !config.tiktok?.pixelId;
  const gtmInvalid = config.gtm?.enabled && !config.gtm?.containerId;

  return (
    <div className="space-y-6">
      {/* Meta Pixel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white rounded-lg h-10 w-10 flex items-center justify-center text-sm font-bold">f</div>
              <div>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  Meta Pixel (Facebook / Instagram)
                  <StatusBadge enabled={config.meta.enabled} />
                </CardTitle>
                <CardDescription>Rastreie eventos e conversões nas plataformas Meta</CardDescription>
              </div>
            </div>
            <Switch checked={config.meta.enabled} onCheckedChange={v => setConfig(p => ({ ...p, meta: { ...p.meta, enabled: v } }))} />
          </div>
        </CardHeader>
        {config.meta.enabled && (
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pixel ID</Label>
                <Input
                  placeholder="1234567890"
                  value={config.meta.pixelId}
                  onChange={e => setConfig(p => ({ ...p, meta: { ...p.meta, pixelId: e.target.value } }))}
                  className={metaInvalid ? 'border-destructive' : ''}
                />
                {metaInvalid && <p className="text-xs text-destructive">Pixel ID é obrigatório quando ativo</p>}
                <p className="text-xs text-muted-foreground">Encontre em Meta Business Suite → Eventos → Configurações</p>
              </div>
              <div className="space-y-2">
                <Label>Conversion API Token (opcional)</Label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Token de acesso"
                    value={config.meta.conversionApiToken}
                    onChange={e => setConfig(p => ({ ...p, meta: { ...p.meta, conversionApiToken: e.target.value } }))}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Para rastreamento server-side (melhor precisão)</p>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Eventos rastreados</Label>
              <div className="flex flex-wrap gap-4">
                {Object.entries(META_EVENT_LABELS).map(([key, { label, tip }]) => (
                  <EventCheckbox
                    key={key}
                    id={`meta-${key}`}
                    label={label}
                    tip={tip}
                    checked={(config.meta.events as any)[key]}
                    onChange={v => setConfig(p => ({ ...p, meta: { ...p.meta, events: { ...p.meta.events, [key]: v } } }))}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Google Analytics 4 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 text-white rounded-lg h-10 w-10 flex items-center justify-center text-sm font-bold">GA</div>
              <div>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  Google Analytics 4
                  <StatusBadge enabled={config.google_analytics.enabled} />
                </CardTitle>
                <CardDescription>Métricas detalhadas de tráfego e comportamento do usuário</CardDescription>
              </div>
            </div>
            <Switch checked={config.google_analytics.enabled} onCheckedChange={v => setConfig(p => ({ ...p, google_analytics: { ...p.google_analytics, enabled: v } }))} />
          </div>
        </CardHeader>
        {config.google_analytics.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Measurement ID</Label>
              <Input
                placeholder="G-XXXXXXXXXX"
                value={config.google_analytics.measurementId}
                onChange={e => setConfig(p => ({ ...p, google_analytics: { ...p.google_analytics, measurementId: e.target.value } }))}
                className={ga4Invalid ? 'border-destructive' : ''}
              />
              {ga4Invalid && <p className="text-xs text-destructive">Measurement ID é obrigatório quando ativo</p>}
              <p className="text-xs text-muted-foreground">Encontre em Google Analytics → Admin → Fluxos de dados</p>
            </div>
            <div className="space-y-3">
              <Label>Eventos rastreados</Label>
              <div className="flex flex-wrap gap-4">
                {Object.entries(GA4_EVENT_LABELS).map(([key, { label, tip }]) => (
                  <EventCheckbox
                    key={key}
                    id={`ga4-${key}`}
                    label={label}
                    tip={tip}
                    checked={(config.google_analytics.events as any)[key]}
                    onChange={v => setConfig(p => ({ ...p, google_analytics: { ...p.google_analytics, events: { ...p.google_analytics.events, [key]: v } } }))}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* TikTok Pixel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-black text-white rounded-lg h-10 w-10 flex items-center justify-center text-sm font-bold">TT</div>
              <div>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  TikTok Pixel
                  <StatusBadge enabled={config.tiktok.enabled} />
                </CardTitle>
                <CardDescription>Rastreie conversões e otimize anúncios no TikTok Ads</CardDescription>
              </div>
            </div>
            <Switch checked={config.tiktok.enabled} onCheckedChange={v => setConfig(p => ({ ...p, tiktok: { ...p.tiktok, enabled: v } }))} />
          </div>
        </CardHeader>
        {config.tiktok.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pixel ID</Label>
              <Input
                placeholder="XXXXXXXXXXXXXXXXXX"
                value={config.tiktok.pixelId}
                onChange={e => setConfig(p => ({ ...p, tiktok: { ...p.tiktok, pixelId: e.target.value } }))}
                className={tiktokInvalid ? 'border-destructive' : ''}
              />
              {tiktokInvalid && <p className="text-xs text-destructive">Pixel ID é obrigatório quando ativo</p>}
              <p className="text-xs text-muted-foreground">Encontre em TikTok Ads Manager → Ativos → Eventos</p>
            </div>
            <div className="space-y-3">
              <Label>Eventos rastreados</Label>
              <div className="flex flex-wrap gap-4">
                {Object.entries(TIKTOK_EVENT_LABELS).map(([key, { label, tip }]) => (
                  <EventCheckbox
                    key={key}
                    id={`tt-${key}`}
                    label={label}
                    tip={tip}
                    checked={(config.tiktok.events as any)[key]}
                    onChange={v => setConfig(p => ({ ...p, tiktok: { ...p.tiktok, events: { ...p.tiktok.events, [key]: v } } }))}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Google Tag Manager */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 text-white rounded-lg h-10 w-10 flex items-center justify-center text-sm font-bold">GTM</div>
              <div>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  Google Tag Manager
                  <StatusBadge enabled={config.gtm.enabled} />
                </CardTitle>
                <CardDescription>Gerencie todas as tags de marketing em um só lugar</CardDescription>
              </div>
            </div>
            <Switch checked={config.gtm.enabled} onCheckedChange={v => setConfig(p => ({ ...p, gtm: { ...p.gtm, enabled: v } }))} />
          </div>
        </CardHeader>
        {config.gtm.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Container ID</Label>
              <Input
                placeholder="GTM-XXXXXXX"
                value={config.gtm.containerId}
                onChange={e => setConfig(p => ({ ...p, gtm: { ...p.gtm, containerId: e.target.value } }))}
                className={gtmInvalid ? 'border-destructive' : ''}
              />
              {gtmInvalid && <p className="text-xs text-destructive">Container ID é obrigatório quando ativo</p>}
              <p className="text-xs text-muted-foreground">Encontre em tagmanager.google.com → Espaço de trabalho</p>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Se usar GTM, configure os pixels (GA4, Meta, TikTok, etc.) diretamente pelo GTM e desative-os aqui para evitar duplicação.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Custom Pixel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-muted rounded-lg h-10 w-10 flex items-center justify-center">
                <Code className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  Pixel Personalizado
                  <StatusBadge enabled={config.custom.enabled} />
                </CardTitle>
                <CardDescription>Insira scripts de rastreamento customizados</CardDescription>
              </div>
            </div>
            <Switch checked={config.custom.enabled} onCheckedChange={v => setConfig(p => ({ ...p, custom: { ...p.custom, enabled: v } }))} />
          </div>
        </CardHeader>
        {config.custom.enabled && (
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Ideal para Hotjar, Microsoft Clarity, Pinterest Tag, Snapchat Pixel, ou qualquer outro script de rastreamento.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label>Script personalizado</Label>
              <Textarea
                placeholder={'<script>\n  // Seu código de rastreamento aqui\n</script>'}
                value={config.custom.script}
                onChange={e => setConfig(p => ({ ...p, custom: { ...p.custom, script: e.target.value } }))}
                className="font-mono text-xs min-h-[150px]"
              />
              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">Cole o snippet completo com as tags &lt;script&gt;. Será injetado no &lt;head&gt; do site.</p>
                <span className="text-xs text-muted-foreground">{config.custom.script.length} caracteres</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Pixels
        </Button>
      </div>
    </div>
  );
}
