import { useState, useEffect } from 'react';
import { Star, Users, Settings2, TrendingUp, Loader2, Save, UserPlus, Crown, Shield, Award, Clock, ShieldCheck, Gift, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useLoyaltySettings, useAdminLoyalty, getTierInfo } from '@/hooks/useLoyalty';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  silver: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export default function Loyalty() {
  const { data: settings, isLoading: loadingSettings } = useLoyaltySettings();
  const { allBalances, loadingBalances, updateSettings, adjustPoints } = useAdminLoyalty();

  const [formData, setFormData] = useState({
    pointsPerReal: 1,
    redemptionRate: 10,
    minRedemption: 100,
    isActive: true,
    tiersEnabled: false,
    tierBronzeMin: 0,
    tierBronzeMultiplier: 1,
    tierSilverMin: 500,
    tierSilverMultiplier: 1.5,
    tierGoldMin: 2000,
    tierGoldMultiplier: 2,
    expirationEnabled: false,
    expirationMonths: 6,
    minOrderValue: 0,
    maxDiscountPercent: 50,
    redemptionStep: 50,
    excludePromoItems: false,
    earnOnShipping: false,
    firstPurchaseBonus: 0,
  });

  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; userId: string; userName: string }>({
    open: false, userId: '', userName: '',
  });
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    if (settings) {
      setFormData({
        pointsPerReal: settings.pointsPerReal,
        redemptionRate: settings.redemptionRate,
        minRedemption: settings.minRedemption,
        isActive: settings.isActive,
        tiersEnabled: settings.tiersEnabled,
        tierBronzeMin: settings.tierBronzeMin,
        tierBronzeMultiplier: settings.tierBronzeMultiplier,
        tierSilverMin: settings.tierSilverMin,
        tierSilverMultiplier: settings.tierSilverMultiplier,
        tierGoldMin: settings.tierGoldMin,
        tierGoldMultiplier: settings.tierGoldMultiplier,
        expirationEnabled: settings.expirationEnabled,
        expirationMonths: settings.expirationMonths,
        minOrderValue: settings.minOrderValue,
        maxDiscountPercent: settings.maxDiscountPercent,
        redemptionStep: settings.redemptionStep,
        excludePromoItems: settings.excludePromoItems,
        earnOnShipping: settings.earnOnShipping,
        firstPurchaseBonus: settings.firstPurchaseBonus,
      });
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      await updateSettings.mutateAsync({ id: settings.id, ...formData });
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleAdjustPoints = async () => {
    if (!adjustAmount || !adjustReason) {
      toast.error('Preencha todos os campos');
      return;
    }
    try {
      await adjustPoints.mutateAsync({
        userId: adjustDialog.userId,
        points: parseInt(adjustAmount),
        description: adjustReason,
      });
      toast.success('Pontos ajustados com sucesso!');
      setAdjustDialog({ open: false, userId: '', userName: '' });
      setAdjustAmount('');
      setAdjustReason('');
    } catch {
      toast.error('Erro ao ajustar pontos');
    }
  };

  const totalPoints = allBalances.reduce((sum, b) => sum + (b.balance || 0), 0);
  const activeCustomers = allBalances.filter(b => b.balance > 0).length;

  // Global history of last loyalty transactions
  const { data: globalHistory = [] } = useQuery({
    queryKey: ['admin-loyalty-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('id, user_id, type, points, description, created_at, profiles:user_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Programa de Fidelidade</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie pontos, níveis e recompensas</p>
        </div>
        <Badge variant={settings?.isActive ? 'default' : 'secondary'} className="text-sm">
          {settings?.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Pontos</p>
                <p className="text-2xl font-bold">{totalPoints.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clientes com Pontos</p>
                <p className="text-2xl font-bold">{activeCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor em Pontos</p>
                <p className="text-2xl font-bold">
                  R$ {((totalPoints / 100) * (settings?.redemptionRate || 10)).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                <CardTitle>Configurações Gerais</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Programa Ativo</Label>
                  <p className="text-sm text-muted-foreground">Habilitar/desabilitar o programa</p>
                </div>
                <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} />
              </div>
              <div className="space-y-2">
                <Label>Pontos por R$ 1,00</Label>
                <Input type="number" value={formData.pointsPerReal} onChange={(e) => setFormData({ ...formData, pointsPerReal: Number(e.target.value) })} min={0.1} step={0.1} />
              </div>
              <div className="space-y-2">
                <Label>Valor de 100 Pontos (R$)</Label>
                <Input type="number" value={formData.redemptionRate} onChange={(e) => setFormData({ ...formData, redemptionRate: Number(e.target.value) })} min={1} step={1} />
              </div>
              <div className="space-y-2">
                <Label>Mínimo para Resgate</Label>
                <Input type="number" value={formData.minRedemption} onChange={(e) => setFormData({ ...formData, minRedemption: Number(e.target.value) })} min={1} />
                <p className="text-xs text-muted-foreground">Cliente só pode resgatar a partir desse saldo</p>
              </div>
            </CardContent>
          </Card>

          {/* Regras de Uso */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                <CardTitle>Regras de Uso dos Pontos</CardTitle>
              </div>
              <CardDescription>Limites de quando e como o cliente pode usar pontos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pedido mínimo para usar pontos (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={formData.minOrderValue}
                  onChange={(e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">0 = sem mínimo</p>
              </div>
              <div className="space-y-2">
                <Label>Desconto máximo do pedido (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.maxDiscountPercent}
                  onChange={(e) => setFormData({ ...formData, maxDiscountPercent: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Pontos não podem zerar o pedido — limite recomendado: 30–50%</p>
              </div>
              <div className="space-y-2">
                <Label>Resgate em múltiplos de</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.redemptionStep}
                  onChange={(e) => setFormData({ ...formData, redemptionStep: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Ex: 50 = cliente resgata 50, 100, 150...</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label>Ganhar pontos sobre o frete</Label>
                  <p className="text-xs text-muted-foreground">Inclui o valor do frete no cálculo de pontos</p>
                </div>
                <Switch checked={formData.earnOnShipping} onCheckedChange={(v) => setFormData({ ...formData, earnOnShipping: v })} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label>Excluir itens em promoção</Label>
                  <p className="text-xs text-muted-foreground">Pontos não rendem em produtos com desconto ativo</p>
                </div>
                <Switch checked={formData.excludePromoItems} onCheckedChange={(v) => setFormData({ ...formData, excludePromoItems: v })} />
              </div>
              <div className="space-y-2 pt-2 border-t">
                <Label className="flex items-center gap-2">
                  <Gift className="h-4 w-4" /> Bônus de primeira compra
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.firstPurchaseBonus}
                  onChange={(e) => setFormData({ ...formData, firstPurchaseBonus: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Pontos extras creditados no primeiro pedido pago do cliente (0 = desativado)</p>
              </div>
            </CardContent>
          </Card>

          {/* Tiers */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                <CardTitle>Níveis (Tiers)</CardTitle>
              </div>
              <CardDescription>Clientes ganham multiplicadores de pontos conforme avançam</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ativar Níveis</Label>
                  <p className="text-sm text-muted-foreground">Bronze → Prata → Ouro</p>
                </div>
                <Switch checked={formData.tiersEnabled} onCheckedChange={(v) => setFormData({ ...formData, tiersEnabled: v })} />
              </div>

              {formData.tiersEnabled && (
                <div className="space-y-4">
                  {/* Bronze */}
                  <div className="p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-700" />
                      <span className="font-medium text-amber-800 dark:text-amber-400">Bronze</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Mínimo de Pontos</Label>
                        <Input type="number" value={formData.tierBronzeMin} onChange={(e) => setFormData({ ...formData, tierBronzeMin: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Multiplicador</Label>
                        <Input type="number" value={formData.tierBronzeMultiplier} onChange={(e) => setFormData({ ...formData, tierBronzeMultiplier: Number(e.target.value) })} step={0.1} min={1} />
                      </div>
                    </div>
                  </div>

                  {/* Silver */}
                  <div className="p-4 rounded-lg border bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Prata</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Mínimo de Pontos</Label>
                        <Input type="number" value={formData.tierSilverMin} onChange={(e) => setFormData({ ...formData, tierSilverMin: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Multiplicador</Label>
                        <Input type="number" value={formData.tierSilverMultiplier} onChange={(e) => setFormData({ ...formData, tierSilverMultiplier: Number(e.target.value) })} step={0.1} min={1} />
                      </div>
                    </div>
                  </div>

                  {/* Gold */}
                  <div className="p-4 rounded-lg border bg-yellow-50/50 dark:bg-yellow-950/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-700 dark:text-yellow-400">Ouro</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Mínimo de Pontos</Label>
                        <Input type="number" value={formData.tierGoldMin} onChange={(e) => setFormData({ ...formData, tierGoldMin: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Multiplicador</Label>
                        <Input type="number" value={formData.tierGoldMultiplier} onChange={(e) => setFormData({ ...formData, tierGoldMultiplier: Number(e.target.value) })} step={0.1} min={1} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expiration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <CardTitle>Expiração de Pontos</CardTitle>
              </div>
              <CardDescription>Pontos expiram após período de inatividade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ativar Expiração</Label>
                  <p className="text-sm text-muted-foreground">Zerar pontos após inatividade</p>
                </div>
                <Switch checked={formData.expirationEnabled} onCheckedChange={(v) => setFormData({ ...formData, expirationEnabled: v })} />
              </div>
              {formData.expirationEnabled && (
                <div className="space-y-2">
                  <Label>Meses de Inatividade</Label>
                  <Input type="number" value={formData.expirationMonths} onChange={(e) => setFormData({ ...formData, expirationMonths: Number(e.target.value) })} min={1} max={36} />
                  <p className="text-xs text-muted-foreground">
                    Pontos expiram após {formData.expirationMonths} meses sem nenhuma compra
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={handleSaveSettings} disabled={updateSettings.isPending} className="w-full">
            {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Todas as Configurações
          </Button>
        </div>

        {/* Top Customers */}
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Top Clientes</CardTitle>
            </div>
            <CardDescription>Clientes com mais pontos acumulados</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBalances ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : allBalances.length > 0 ? (
              <div className="space-y-3">
                {allBalances.slice(0, 10).map((customer: any, index: number) => {
                  const tierInfo = settings ? getTierInfo(customer.total_earned || 0, settings) : null;
                  return (
                    <div key={customer.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-200 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{customer.profiles?.full_name || 'Cliente'}</p>
                            {settings?.tiersEnabled && tierInfo && (
                              <Badge className={`text-[10px] px-1.5 py-0 ${TIER_COLORS[tierInfo.name]}`}>
                                {tierInfo.label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Total: {customer.total_earned?.toLocaleString('pt-BR') || 0} pts
                            {settings?.tiersEnabled && tierInfo && tierInfo.multiplier > 1 && (
                              <span className="ml-1 text-primary">({tierInfo.multiplier}x)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {customer.balance?.toLocaleString('pt-BR') || 0}
                        </Badge>
                        <Dialog
                          open={adjustDialog.open && adjustDialog.userId === customer.user_id}
                          onOpenChange={(open) => setAdjustDialog({
                            open,
                            userId: open ? customer.user_id : '',
                            userName: open ? (customer.profiles?.full_name || 'Cliente') : ''
                          })}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Ajustar Pontos - {adjustDialog.userName}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label>Quantidade de Pontos</Label>
                                <Input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="Ex: 100 ou -50" />
                                <p className="text-xs text-muted-foreground">Use valores negativos para deduzir</p>
                              </div>
                              <div className="space-y-2">
                                <Label>Motivo</Label>
                                <Textarea value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Descreva o motivo do ajuste" />
                              </div>
                              <Button onClick={handleAdjustPoints} className="w-full" disabled={adjustPoints.isPending}>
                                {adjustPoints.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Confirmar Ajuste
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum cliente com pontos ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global history */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <CardTitle>Histórico Global de Pontos</CardTitle>
            </div>
            <CardDescription>Últimas 30 movimentações de todos os clientes</CardDescription>
          </CardHeader>
          <CardContent>
            {globalHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação ainda.</p>
            ) : (
              <div className="divide-y">
                {globalHistory.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        variant="outline"
                        className={`font-mono ${tx.points > 0 ? 'text-green-600 border-green-200' : tx.type === 'expire' ? 'text-red-600 border-red-200' : 'text-orange-600 border-orange-200'}`}
                      >
                        {tx.points > 0 ? '+' : ''}{tx.points}
                      </Badge>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{tx.profiles?.full_name || 'Cliente'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.type === 'earn' && 'Compra'}
                          {tx.type === 'redeem' && 'Resgate'}
                          {tx.type === 'adjust' && 'Ajuste manual'}
                          {tx.type === 'expire' && 'Expiração'}
                          {tx.description ? ` · ${tx.description}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {format(new Date(tx.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
