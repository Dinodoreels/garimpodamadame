import { useState, useEffect } from 'react';
import { 
  Truck, 
  Gift, 
  Search, 
  Edit2, 
  Save, 
  X, 
  Loader2,
  Package,
  MapPin,
  CheckCircle2,
  Settings2,
  Power
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatZipCode } from '@/lib/shipping';
import { 
  useFreeShippingSettings, 
  useShippingRates, 
  useUpdateFreeShipping,
  useUpdateShippingRate,
  type ShippingRate 
} from '@/hooks/useShippingSettings';
import { useIntegrations, useSaveIntegrations, type IntegrationsConfig } from '@/hooks/useIntegrations';
import { MelhorEnvioConnection } from '@/components/admin/MelhorEnvioConnection';
import { ShippingOriginCard } from '@/components/admin/ShippingOriginCard';

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
  // Form state for dialog
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
      updated.shipping = {
        ...shipping,
        active_provider: 'correios',
        correios: { origin_zip: formOriginZip },
      };
    } else {
      updated.shipping = {
        ...shipping,
        active_provider: 'melhor_envio',
        melhor_envio: { origin_zip: formOriginZip, credential_configured: shipping.melhor_envio.credential_configured },
      };
    }
    onSave(updated);
    setConfiguring(null);
  };

  const handleDeactivate = () => {
    onSave({
      ...config,
      shipping: { ...shipping, active_provider: '' },
    });
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
          <CardDescription>
            Escolha e configure um provedor de cálculo de frete. Apenas um pode estar ativo por vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {SHIPPING_PROVIDERS.map((provider) => {
              const isActive = shipping.active_provider === provider.id;
              const configured = isConfigured(provider.id);
              return (
                <div
                  key={provider.id}
                  className={`relative rounded-lg border-2 p-4 transition-colors ${
                    isActive
                      ? 'border-green-500 bg-green-500/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  {isActive && (
                    <Badge className="absolute top-3 right-3 bg-green-600 text-white text-[10px]">
                      Ativo
                    </Badge>
                  )}
                  <div className="flex items-start gap-3">
                    <div className={`${provider.color} text-white rounded-lg h-10 w-10 flex items-center justify-center text-sm font-bold shrink-0`}>
                      {provider.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{provider.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {provider.badges.map(b => (
                          <Badge key={b} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {b}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        {isActive ? (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openConfig(provider.id)}>
                              <Settings2 className="h-3 w-3 mr-1" />
                              Reconfigurar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setDeactivating(true)}>
                              <Power className="h-3 w-3 mr-1" />
                              Desativar
                            </Button>
                          </>
                        ) : configured ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openConfig(provider.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                            Configurado
                          </Button>
                        ) : (
                          <Button size="sm" className="h-7 text-xs" onClick={() => openConfig(provider.id)}>
                            Configurar
                          </Button>
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

      {/* Config Dialog */}
      <Dialog open={!!configuring} onOpenChange={() => setConfiguring(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentProvider && (
                <span className={`${currentProvider.color} text-white rounded h-6 w-6 flex items-center justify-center text-xs font-bold`}>
                  {currentProvider.initials}
                </span>
              )}
              Configurar {currentProvider?.name}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados para ativar este provedor de frete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {configuring === 'melhor_envio' && (
              <p className="text-sm text-muted-foreground">A credencial é guardada no cofre seguro e nunca fica visível nesta tela.</p>
            )}
            <div className="space-y-2">
              <Label>CEP de Origem</Label>
              <Input
                value={formOriginZip}
                onChange={(e) => setFormOriginZip(formatZipCode(e.target.value))}
                placeholder="00000-000"
                maxLength={9}
              />
              <p className="text-xs text-muted-foreground">
                CEP do local de onde os produtos são enviados
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfiguring(null)}>Cancelar</Button>
            <Button onClick={handleSaveProvider} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar e Ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={deactivating} onOpenChange={setDeactivating}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar provedor de frete?</AlertDialogTitle>
            <AlertDialogDescription>
              O cálculo automático de frete será desabilitado e apenas a tabela manual de valores por estado será utilizada. As credenciais salvas serão mantidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ShippingSettings() {
  const { data: freeShippingSettings, isLoading: loadingFreeShipping } = useFreeShippingSettings();
  const { data: shippingRates, isLoading: loadingRates } = useShippingRates();
  const updateFreeShipping = useUpdateFreeShipping();
  const updateShippingRate = useUpdateShippingRate();

  const { data: integrationsConfig, isLoading: loadingIntegrations } = useIntegrations();
  const saveIntegrations = useSaveIntegrations();

  // Migrate legacy origin settings into integrations on first load
  const [migrated, setMigrated] = useState(false);
  useEffect(() => {
    if (migrated || !integrationsConfig || loadingIntegrations) return;
    setMigrated(true);

    // If shipping already has an active_provider or origin_zip set, skip migration
    if (integrationsConfig.shipping.active_provider || integrationsConfig.shipping.correios.origin_zip) return;

    // Try migrating from legacy settings
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

  // Free shipping form state
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false);
  const [freeShippingMinValue, setFreeShippingMinValue] = useState('500');
  const [freeShippingDiscountCode, setFreeShippingDiscountCode] = useState('FRETEGRATIS500');
  const [freeShippingInitialized, setFreeShippingInitialized] = useState(false);

  // Shipping rates state
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [editForm, setEditForm] = useState({
    cost: '',
    estimated_days: '',
    dropship_extra_days: ''
  });

  // Initialize free shipping form when data loads
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
    setEditForm({
      cost: rate.cost.toString(),
      estimated_days: rate.estimated_days,
      dropship_extra_days: rate.dropship_extra_days.toString()
    });
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

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  };

  const filteredRates = shippingRates?.filter(rate => {
    const matchesSearch = rate.state_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.state_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = regionFilter === 'all' || rate.region === regionFilter;
    return matchesSearch && matchesRegion;
  }) || [];

  const regions = [...new Set(shippingRates?.map(r => r.region) || [])].sort();

  const getRegionColor = (region: string) => {
    const colors: Record<string, string> = {
      'Sudeste': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'Sul': 'bg-green-500/10 text-green-600 border-green-500/20',
      'Centro-Oeste': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      'Nordeste': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'Norte': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    };
    return colors[region] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-light tracking-wide">Configurações de Frete</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie provedores de frete, frete grátis e valores por estado
        </p>
      </div>

      {/* Provider Cards */}
      {loadingIntegrations || !integrationsConfig ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <ShippingProviderCards
          config={integrationsConfig}
          onSave={(c) => saveIntegrations.mutate(c)}
          saving={saveIntegrations.isPending}
        />
      )}

      <MelhorEnvioConnection />

      {/* Free Shipping Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-medium">Frete Grátis</CardTitle>
          </div>
          <CardDescription>
            Configure frete grátis automático para compras acima de um valor mínimo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingFreeShipping ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativar frete grátis</Label>
                  <p className="text-sm text-muted-foreground">
                    Oferece frete grátis para compras acima do valor mínimo
                  </p>
                </div>
                <Switch
                  checked={freeShippingEnabled}
                  onCheckedChange={setFreeShippingEnabled}
                />
              </div>

              {freeShippingEnabled && (
                <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="minValue">Valor mínimo (R$)</Label>
                    <Input
                      id="minValue"
                      type="number"
                      step="0.01"
                      value={freeShippingMinValue}
                      onChange={(e) => setFreeShippingMinValue(e.target.value)}
                      placeholder="500.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Compras acima deste valor terão frete grátis
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountCode">Código de desconto</Label>
                    <Input
                      id="discountCode"
                      value={freeShippingDiscountCode}
                      onChange={(e) => setFreeShippingDiscountCode(e.target.value.toUpperCase())}
                      placeholder="FRETEGRATIS500"
                    />
                    <p className="text-xs text-muted-foreground">
                      Código aplicado automaticamente no checkout
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveFreeShipping}
                  disabled={updateFreeShipping.isPending}
                >
                  {updateFreeShipping.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
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
            <Truck className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-medium">Valores por Estado (Fallback)</CardTitle>
          </div>
          <CardDescription>
            Valores de fallback por estado (usados quando o provedor ativo está indisponível ou nenhum está ativo)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todas as regiões" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as regiões</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loadingRates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Região</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">
                      <span className="flex items-center gap-1 justify-center">
                        <Package className="h-3 w-3" />
                        +Dropship
                      </span>
                    </TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">
                        <span className="text-muted-foreground mr-1">{rate.state_code}</span>
                        {rate.state_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getRegionColor(rate.region)}>
                          {rate.region}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {rate.estimated_days}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(rate.cost)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          +{rate.dropship_extra_days} dias
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditRate(rate)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum estado encontrado
                      </TableCell>
                    </TableRow>
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
            <DialogDescription>
              Altere o valor do frete, prazo de entrega e dias extras para dropship
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editCost">Valor do frete (R$)</Label>
              <Input
                id="editCost"
                type="number"
                step="0.01"
                value={editForm.cost}
                onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDays">Prazo de entrega</Label>
              <Input
                id="editDays"
                value={editForm.estimated_days}
                onChange={(e) => setEditForm({ ...editForm, estimated_days: e.target.value })}
                placeholder="3-5 dias úteis"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDropship">Dias extras para dropship</Label>
              <Input
                id="editDropship"
                type="number"
                value={editForm.dropship_extra_days}
                onChange={(e) => setEditForm({ ...editForm, dropship_extra_days: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Dias adicionados ao prazo para produtos sob encomenda
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRate(null)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveRate}
              disabled={updateShippingRate.isPending}
            >
              {updateShippingRate.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
