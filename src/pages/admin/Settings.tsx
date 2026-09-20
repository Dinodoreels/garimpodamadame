import { useState, useEffect } from 'react';
import { UserPlus, Truck, Gift, Search, Edit2, Save, X, Loader2, Package, Settings as SettingsIcon, Plug, Bell, CheckCircle2, Settings2, Power, Sparkles, BarChart3, CreditCard, MessageSquare, FileCheck2, Megaphone } from 'lucide-react';
import { useIntegrations, useSaveIntegrations, type IntegrationsConfig } from '@/hooks/useIntegrations';
import { PaymentTab } from '@/components/admin/integrations/PaymentTab';
import { WhatsAppTab } from '@/components/admin/integrations/WhatsAppTab';
import { EmailTab } from '@/components/admin/integrations/EmailTab';
import { AutomationsTab } from '@/components/admin/integrations/AutomationsTab';
import { AITab } from '@/components/admin/integrations/AITab';
import { PixelsTab } from '@/components/admin/integrations/PixelsTab';
import { PaymentTestTab } from '@/components/admin/integrations/PaymentTestTab';
import { ReportsTab } from '@/components/admin/integrations/ReportsTab';
import { ShopifyTab } from '@/components/admin/integrations/ShopifyTab';
import { BlingTab } from '@/components/admin/integrations/BlingTab';
import { FiscalTab } from '@/components/admin/integrations/FiscalTab';
import { MelhorEnvioConnection } from '@/components/admin/MelhorEnvioConnection';
import { ShippingOriginCard } from '@/components/admin/ShippingOriginCard';
import { VipSalesTab } from '@/components/admin/integrations/VipSalesTab';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { 
  useFreeShippingSettings, 
  useShippingRates, 
  useUpdateFreeShipping,
  useUpdateShippingRate,
  type ShippingRate 
} from '@/hooks/useShippingSettings';
import { formatZipCode } from '@/lib/shipping';

// ========== STORE DATA CARD ==========
function StoreDataCard() {
  const { data: config, isLoading } = useIntegrations();
  const saveIntegrations = useSaveIntegrations();
  const [storeName, setStoreName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (config && !initialized) {
      setStoreName(config.store_name || '');
      setContactEmail(config.contact_email || '');
      setContactPhone(config.contact_phone || '');
      setInitialized(true);
    }
  }, [config, initialized]);

  const handleSave = () => {
    if (!config) return;
    saveIntegrations.mutate({
      ...config,
      store_name: storeName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
    });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-light tracking-wide">Dados da Loja</CardTitle>
        <CardDescription className="font-light">
          Informações principais da loja. Esses dados alimentam o rodapé, botão de WhatsApp, formulários de contato e página de contato.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="store-name" className="text-xs tracking-[0.1em] uppercase font-light">Nome da loja</Label>
          <Input id="store-name" placeholder="Minha Loja" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="font-light" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-email" className="text-xs tracking-[0.1em] uppercase font-light">Email de contato</Label>
            <Input id="contact-email" type="email" placeholder="contato@minhaloja.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="font-light" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-phone" className="text-xs tracking-[0.1em] uppercase font-light">Telefone / WhatsApp</Label>
            <Input id="contact-phone" placeholder="5511999999999" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="font-light" />
            <p className="text-xs text-muted-foreground font-light">Formato: código do país + DDD + número (sem espaços)</p>
          </div>
        </div>
        {(!contactEmail && !contactPhone) && (
          <p className="text-xs text-amber-600 font-light">⚠️ Configure pelo menos um canal de contato para ativar os botões do sistema.</p>
        )}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveIntegrations.isPending} className="font-light">
            {saveIntegrations.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== GENERAL TAB ==========
function GeneralTab() {
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Email obrigatório",
        description: "Informe o email do novo administrador.",
      });
      return;
    }

    setIsAdding(true);

    try {
      // Look up the user by email in profiles (via a join with auth metadata)
      // We search profiles and match by looking up in auth via edge function
      const { data, error } = await supabase.functions.invoke('manage-user-role', {
        body: { email: newAdminEmail.trim(), role: 'admin' },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível adicionar o administrador.",
        });
        return;
      }

      if (data?.error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: data.error,
        });
        return;
      }

      toast({
        title: "Admin adicionado",
        description: `${newAdminEmail} agora é administrador.`,
      });
      setNewAdminEmail('');
    } catch (error) {
      console.error('Error adding admin:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o administrador.",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Store Data */}
      <StoreDataCard />

      {/* Admin Management */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-light tracking-wide">Gerenciar Administradores</CardTitle>
          <CardDescription className="font-light">Adicione administradores do sistema pelo email cadastrado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="admin-email" className="text-xs tracking-[0.1em] uppercase font-light">Email do novo admin</Label>
              <Input id="admin-email" type="email" placeholder="admin@exemplo.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="font-light" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddAdmin} disabled={isAdding} className="font-light">
                {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-light">O usuário precisa estar cadastrado no sistema. Ele será promovido a admin automaticamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Shipping Providers ──
const SHIPPING_PROVIDERS = [
  {
    id: 'correios' as const,
    name: 'Correios',
    initials: 'CR',
    color: 'bg-yellow-500',
    description: 'Cálculo nativo simulado por peso e dimensões',
    badges: ['Grátis', 'PAC', 'SEDEX', 'Mini Envios'],
  },
  {
    id: 'melhor_envio' as const,
    name: 'Melhor Envio',
    initials: 'ME',
    color: 'bg-blue-500',
    description: 'API com cotação real de múltiplas transportadoras',
    badges: ['API', 'Multi-transportadora'],
  },
];

function ShippingProviderCards({
  config,
  onSave,
  saving,
}: {
  config: IntegrationsConfig;
  onSave: (c: IntegrationsConfig) => void;
  saving: boolean;
}) {
  const shipping = config.shipping;
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [formOriginZip, setFormOriginZip] = useState('');

  const openConfig = (providerId: string) => {
    if (providerId === 'correios') {
      setFormOriginZip(shipping.correios.origin_zip);
    } else {
      setFormOriginZip(shipping.melhor_envio.origin_zip);
    }
    setConfiguring(providerId);
  };

  const handleSaveProvider = () => {
    if (!configuring) return;
    const updated = { ...config };
    if (configuring === 'correios') {
      updated.shipping = { ...shipping, active_provider: 'correios', correios: { origin_zip: formOriginZip } };
    } else {
      updated.shipping = { ...shipping, active_provider: 'melhor_envio', melhor_envio: { origin_zip: formOriginZip, credential_configured: shipping.melhor_envio.credential_configured } };
    }
    onSave(updated);
    setConfiguring(null);
  };

  const handleDeactivate = () => {
    onSave({ ...config, shipping: { ...shipping, active_provider: '' } });
    setDeactivating(false);
  };

  const isConfigured = (id: string) => {
    if (id === 'correios') return !!shipping.correios.origin_zip;
    return !!shipping.melhor_envio.origin_zip;
  };

  const currentProvider = SHIPPING_PROVIDERS.find(p => p.id === configuring);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-medium">Provedor de Frete</CardTitle>
          </div>
          <CardDescription>Escolha e configure um provedor de cálculo de frete. Apenas um pode estar ativo por vez.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {SHIPPING_PROVIDERS.map((provider) => {
              const isActive = shipping.active_provider === provider.id;
              const configured = isConfigured(provider.id);
              return (
                <div key={provider.id} className={`relative rounded-lg border-2 p-4 transition-colors ${isActive ? 'border-green-500 bg-green-500/5' : 'border-border hover:border-muted-foreground/30'}`}>
                  {isActive && <Badge className="absolute top-3 right-3 bg-green-600 text-white text-[10px]">Ativo</Badge>}
                  <div className="flex items-start gap-3">
                    <div className={`${provider.color} text-white rounded-lg h-10 w-10 flex items-center justify-center text-sm font-bold shrink-0`}>{provider.initials}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{provider.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {provider.badges.map(b => <Badge key={b} variant="secondary" className="text-[10px] px-1.5 py-0">{b}</Badge>)}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        {isActive ? (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openConfig(provider.id)}><Settings2 className="h-3 w-3 mr-1" />Reconfigurar</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setDeactivating(true)}><Power className="h-3 w-3 mr-1" />Desativar</Button>
                          </>
                        ) : configured ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openConfig(provider.id)}><CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />Configurado</Button>
                        ) : (
                          <Button size="sm" className="h-7 text-xs" onClick={() => openConfig(provider.id)}>Configurar</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!configuring} onOpenChange={() => setConfiguring(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentProvider && <span className={`${currentProvider.color} text-white rounded h-6 w-6 flex items-center justify-center text-xs font-bold`}>{currentProvider.initials}</span>}
              Configurar {currentProvider?.name}
            </DialogTitle>
            <DialogDescription>Preencha os dados para ativar este provedor de frete.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {configuring === 'melhor_envio' && (
              <p className="text-sm text-muted-foreground">A credencial é guardada no cofre seguro e nunca fica visível nesta tela.</p>
            )}
            <div className="space-y-2">
              <Label>CEP de Origem</Label>
              <Input value={formOriginZip} onChange={(e) => setFormOriginZip(formatZipCode(e.target.value))} placeholder="00000-000" maxLength={9} />
              <p className="text-xs text-muted-foreground">CEP do local de onde os produtos são enviados</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfiguring(null)}>Cancelar</Button>
            <Button onClick={handleSaveProvider} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar e Ativar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deactivating} onOpenChange={setDeactivating}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar provedor de frete?</AlertDialogTitle>
            <AlertDialogDescription>O cálculo automático de frete será desabilitado e apenas a tabela manual de valores por estado será utilizada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ========== SHIPPING TAB ==========
function ShippingTab() {
  const { data: freeShippingSettings, isLoading: loadingFreeShipping } = useFreeShippingSettings();
  const { data: shippingRates, isLoading: loadingRates } = useShippingRates();
  const updateFreeShipping = useUpdateFreeShipping();
  const updateShippingRate = useUpdateShippingRate();
  const { data: integrationsConfig, isLoading: loadingIntegrations } = useIntegrations();
  const saveIntegrations = useSaveIntegrations();

  // Migrate legacy origin settings
  const [migrated, setMigrated] = useState(false);
  useEffect(() => {
    if (migrated || !integrationsConfig || loadingIntegrations) return;
    setMigrated(true);
    if (integrationsConfig.shipping.active_provider || integrationsConfig.shipping.correios.origin_zip) return;
    (async () => {
      const [{ data: originData }, { data: modeData }] = await Promise.all([
        supabase.from('site_settings').select('value').eq('key', 'shipping_origin').maybeSingle(),
        supabase.from('site_settings').select('value').eq('key', 'shipping_mode').maybeSingle(),
      ]);
      const legacyZip = (originData?.value as any)?.zip_code || '';
      const autoCalc = (modeData?.value as any)?.auto_calc ?? false;
      if (legacyZip) {
        saveIntegrations.mutate({
          ...integrationsConfig,
          shipping: {
            ...integrationsConfig.shipping,
            active_provider: autoCalc ? 'correios' : '',
            correios: { origin_zip: legacyZip },
            melhor_envio: { ...integrationsConfig.shipping.melhor_envio, origin_zip: legacyZip },
          },
        });
      }
    })();
  }, [integrationsConfig, loadingIntegrations, migrated]);
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false);
  const [freeShippingMinValue, setFreeShippingMinValue] = useState('500');
  const [freeShippingDiscountCode, setFreeShippingDiscountCode] = useState('FRETEGRATIS500');
  const [freeShippingInitialized, setFreeShippingInitialized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [editForm, setEditForm] = useState({ cost: '', estimated_days: '', dropship_extra_days: '' });

  if (freeShippingSettings && !freeShippingInitialized) {
    setFreeShippingEnabled(freeShippingSettings.enabled);
    setFreeShippingMinValue(freeShippingSettings.min_value.toString());
    setFreeShippingDiscountCode(freeShippingSettings.discount_code || 'FRETEGRATIS500');
    setFreeShippingInitialized(true);
  }

  const handleSaveFreeShipping = async () => {
    await updateFreeShipping.mutateAsync({
      enabled: freeShippingEnabled,
      min_value: parseFloat(freeShippingMinValue) || 0,
      discount_code: freeShippingDiscountCode
    });
  };

  const handleEditRate = (rate: ShippingRate) => {
    setEditingRate(rate);
    setEditForm({ cost: rate.cost.toString(), estimated_days: rate.estimated_days, dropship_extra_days: rate.dropship_extra_days.toString() });
  };

  const handleSaveRate = async () => {
    if (!editingRate) return;
    await updateShippingRate.mutateAsync({
      id: editingRate.id,
      cost: parseFloat(editForm.cost) || 0,
      estimated_days: editForm.estimated_days,
      dropship_extra_days: parseInt(editForm.dropship_extra_days) || 0
    });
    setEditingRate(null);
  };

  const formatPrice = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

  const filteredRates = shippingRates?.filter(rate => {
    const matchesSearch = rate.state_name.toLowerCase().includes(searchTerm.toLowerCase()) || rate.state_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = regionFilter === 'all' || rate.region === regionFilter;
    return matchesSearch && matchesRegion;
  }) || [];

  const regions = [...new Set(shippingRates?.map(r => r.region) || [])].sort();

  const getRegionColor = (region: string) => {
    const colors: Record<string, string> = {
      'Sudeste': 'bg-primary/10 text-primary border-primary/20',
      'Sul': 'bg-primary/10 text-primary border-primary/20',
      'Centro-Oeste': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      'Nordeste': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'Norte': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    };
    return colors[region] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Provider Cards */}
      {loadingIntegrations || !integrationsConfig ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          <ShippingProviderCards
            config={integrationsConfig}
            onSave={(c) => saveIntegrations.mutate(c)}
            saving={saveIntegrations.isPending}
          />
          <ShippingOriginCard
            zipCode={integrationsConfig.shipping.active_provider === 'correios'
              ? integrationsConfig.shipping.correios.origin_zip
              : integrationsConfig.shipping.melhor_envio.origin_zip}
          />
        </>
      )}

      <MelhorEnvioConnection />

      {/* Free Shipping Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">Frete Grátis</CardTitle>
          </div>
          <CardDescription>Configure frete grátis automático para compras acima de um valor mínimo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingFreeShipping ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativar frete grátis</Label>
                  <p className="text-sm text-muted-foreground">Oferece frete grátis para compras acima do valor mínimo</p>
                </div>
                <Switch checked={freeShippingEnabled} onCheckedChange={setFreeShippingEnabled} />
              </div>
              {freeShippingEnabled && (
                <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="minValue">Valor mínimo (R$)</Label>
                    <Input id="minValue" type="number" step="0.01" value={freeShippingMinValue} onChange={(e) => setFreeShippingMinValue(e.target.value)} placeholder="500.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountCode">Código de desconto</Label>
                    <Input id="discountCode" value={freeShippingDiscountCode} onChange={(e) => setFreeShippingDiscountCode(e.target.value.toUpperCase())} placeholder="FRETEGRATIS500" />
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveFreeShipping} disabled={updateFreeShipping.isPending}>
                  {updateFreeShipping.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar Configurações</>}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Shipping Rates Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">Valores por Estado</CardTitle>
          </div>
          <CardDescription>Configure o valor do frete e prazo de entrega por estado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por estado..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Todas as regiões" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as regiões</SelectItem>
                {regions.map(region => <SelectItem key={region} value={region}>{region}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loadingRates ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Região</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center"><span className="flex items-center gap-1 justify-center"><Package className="h-3 w-3" />+Dropship</span></TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium"><span className="text-muted-foreground mr-1">{rate.state_code}</span>{rate.state_name}</TableCell>
                      <TableCell><Badge variant="outline" className={getRegionColor(rate.region)}>{rate.region}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{rate.estimated_days}</TableCell>
                      <TableCell className="text-right font-medium">{formatPrice(rate.cost)}</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">+{rate.dropship_extra_days} dias</Badge></TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => handleEditRate(rate)}><Edit2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {filteredRates.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum estado encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Rate Dialog */}
      <Dialog open={!!editingRate} onOpenChange={() => setEditingRate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Frete - {editingRate?.state_name}</DialogTitle>
            <DialogDescription>Altere o valor do frete, prazo de entrega e dias extras para dropship</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editCost">Valor do frete (R$)</Label>
              <Input id="editCost" type="number" step="0.01" value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDays">Prazo de entrega</Label>
              <Input id="editDays" value={editForm.estimated_days} onChange={(e) => setEditForm({ ...editForm, estimated_days: e.target.value })} placeholder="3-5 dias úteis" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDropship">Dias extras para dropship</Label>
              <Input id="editDropship" type="number" value={editForm.dropship_extra_days} onChange={(e) => setEditForm({ ...editForm, dropship_extra_days: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRate(null)}><X className="h-4 w-4 mr-2" />Cancelar</Button>
            <Button onClick={handleSaveRate} disabled={updateShippingRate.isPending}>
              {updateShippingRate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== INTEGRATIONS TAB ==========
function IntegrationsTab() {
  const { data: config, isLoading } = useIntegrations();
  const { mutate: save, isPending } = useSaveIntegrations();

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Dados da Loja</CardTitle>
          <CardDescription>Nome que aparece nos comprovantes fiscais e e-mails</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-sm">
            <Label>Nome da Loja</Label>
            <Input
              value={config.store_name || ''}
              onChange={(e) => save({ ...config, store_name: e.target.value })}
              placeholder="Minha Loja"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="payment" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="payment">Pagamento</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="email">Email / Marketing</TabsTrigger>
        </TabsList>
      <TabsContent value="payment">
        <PaymentTab config={config} onSave={save} isSaving={isPending} />
      </TabsContent>
      <TabsContent value="whatsapp">
        <WhatsAppTab config={config} onSave={save} isSaving={isPending} />
      </TabsContent>
      <TabsContent value="email">
        <EmailTab config={config} onSave={save} isSaving={isPending} />
      </TabsContent>
      </Tabs>
    </div>
  );
}

// ========== MAIN PAGE ==========
export default function Settings() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Configurações"
        subtitle="Gerencie as configurações do painel e opções de frete"
      />

      <Tabs
        defaultValue={new URLSearchParams(window.location.search).get('section') === 'shipping' ? 'shipping' : new URLSearchParams(window.location.search).get('section') === 'fiscal' ? 'fiscal' : new URLSearchParams(window.location.search).has('bling') ? 'bling' : 'general'}
        className="w-full"
      >
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2">
            <Truck className="h-4 w-4" />
            Frete
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="h-4 w-4" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-2">
            <Bell className="h-4 w-4" />
            Automações
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            IA
          </TabsTrigger>
          <TabsTrigger value="pixels" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Pixels
          </TabsTrigger>
          <TabsTrigger value="payment-test" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Teste Pagamento
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-2">
            <FileCheck2 className="h-4 w-4" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="shopify" className="gap-2">
            <Plug className="h-4 w-4" />
            Shopify
          </TabsTrigger>
          <TabsTrigger value="bling" className="gap-2">
            <Plug className="h-4 w-4" />
            Bling
          </TabsTrigger>
          <TabsTrigger value="vip-sales" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Grupo VIP
          </TabsTrigger>
        </TabsList>


        <TabsContent value="general" className="mt-6">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="shipping" className="mt-6">
          <ShippingTab />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="automations" className="mt-6">
          <AutomationsTab />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AITab />
        </TabsContent>

        <TabsContent value="pixels" className="mt-6">
          <PixelsTab />
        </TabsContent>

        <TabsContent value="payment-test" className="mt-6">
          <PaymentTestTab />
        </TabsContent>

        <TabsContent value="fiscal" className="mt-6">
          <FiscalTab />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportsTab />
        </TabsContent>

        <TabsContent value="shopify" className="mt-6">
          <ShopifyTab />
        </TabsContent>

        <TabsContent value="bling" className="mt-6">
          <BlingTab />
        </TabsContent>

        <TabsContent value="vip-sales" className="mt-6">
          <VipSalesTab />
        </TabsContent>
      </Tabs>

    </div>
  );
}
