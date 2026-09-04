import { Star, TrendingUp, Gift, Loader2, Crown, Shield, Award, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLoyaltyBalance, useLoyaltyTransactions, useLoyaltySettings, getTierInfo, type TierName } from '@/hooks/useLoyalty';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIER_CONFIG: Record<TierName, { icon: typeof Star; color: string; bg: string; border: string }> = {
  bronze: {
    icon: Shield,
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/30 dark:to-amber-900/10',
    border: 'border-amber-200 dark:border-amber-800',
  },
  silver: {
    icon: Award,
    color: 'text-gray-600 dark:text-gray-300',
    bg: 'bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-800/40 dark:to-gray-700/20',
    border: 'border-gray-300 dark:border-gray-600',
  },
  gold: {
    icon: Crown,
    color: 'text-yellow-700 dark:text-yellow-400',
    bg: 'bg-gradient-to-br from-yellow-100 to-amber-50 dark:from-yellow-950/30 dark:to-yellow-900/10',
    border: 'border-yellow-300 dark:border-yellow-700',
  },
};

export function LoyaltyCard() {
  const { data: balance, isLoading: loadingBalance } = useLoyaltyBalance();
  const { data: transactions = [], isLoading: loadingTransactions } = useLoyaltyTransactions();
  const { data: settings } = useLoyaltySettings();

  if (!settings?.isActive) return null;

  if (loadingBalance) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const tierInfo = settings ? getTierInfo(balance?.totalEarned || 0, settings) : null;
  const tierConfig = tierInfo ? TIER_CONFIG[tierInfo.name] : null;
  const TierIcon = tierConfig?.icon || Shield;
  const discountValue = balance ? (balance.balance / 100) * settings.redemptionRate : 0;

  // Expiration date
  const expirationDate = settings.expirationEnabled && balance?.lastActivityAt
    ? addMonths(new Date(balance.lastActivityAt), settings.expirationMonths)
    : null;

  return (
    <div className="space-y-4">
      {/* Tier Card */}
      {settings.tiersEnabled && tierInfo && tierConfig && (
        <Card className={`${tierConfig.bg} ${tierConfig.border}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-full bg-background/60 ${tierConfig.color}`}>
                  <TierIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seu nível</p>
                  <p className={`text-xl font-bold ${tierConfig.color}`}>{tierInfo.label}</p>
                </div>
              </div>
              {tierInfo.multiplier > 1 && (
                <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                  <Zap className="h-3 w-3" />
                  {tierInfo.multiplier}x pontos
                </Badge>
              )}
            </div>

            {tierInfo.nextTierLabel && tierInfo.pointsToNext !== null && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progresso para {tierInfo.nextTierLabel}</span>
                  <span className="font-medium">{tierInfo.pointsToNext.toLocaleString('pt-BR')} pts restantes</span>
                </div>
                <Progress value={tierInfo.progress} className="h-2" />
              </div>
            )}

            {tierInfo.multiplier > 1 && (
              <p className="text-xs text-muted-foreground mt-3">
                🎯 Suas compras rendem <strong className="text-foreground">{tierInfo.multiplier}x</strong> mais pontos!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary fill-primary" />
            <CardTitle className="text-lg">Meus Pontos</CardTitle>
          </div>
          <CardDescription>Programa de Fidelidade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-bold text-primary">
              {balance?.balance.toLocaleString('pt-BR') || 0}
            </span>
            <span className="text-muted-foreground">pontos</span>
          </div>

          {discountValue >= settings.minRedemption / 100 * settings.redemptionRate && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 mb-4">
              <Gift className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">
                Troque por até R$ {discountValue.toFixed(2)} de desconto!
              </span>
            </div>
          )}

          {expirationDate && balance && balance.balance > 0 && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800 mb-4">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700 dark:text-orange-400">
                Pontos expiram em {format(expirationDate, "dd/MM/yyyy")} sem atividade
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Total acumulado</p>
              <p className="font-semibold text-green-600">
                +{balance?.totalEarned.toLocaleString('pt-BR') || 0} pts
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total resgatado</p>
              <p className="font-semibold text-orange-600">
                -{balance?.totalRedeemed.toLocaleString('pt-BR') || 0} pts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <p className="text-muted-foreground">
              A cada R$ 1,00 em compras você ganha <strong className="text-foreground">{settings.pointsPerReal} ponto{settings.pointsPerReal !== 1 ? 's' : ''}</strong>
              {settings.tiersEnabled && tierInfo && tierInfo.multiplier > 1 && (
                <span className="text-primary"> (×{tierInfo.multiplier} no nível {tierInfo.label})</span>
              )}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <p className="text-muted-foreground">
              Pontos são creditados quando o pedido é <strong className="text-foreground">entregue</strong>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <p className="text-muted-foreground">
              Troque <strong className="text-foreground">100 pontos</strong> por <strong className="text-foreground">R$ {settings.redemptionRate.toFixed(2)}</strong> de desconto
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">4</span>
            </div>
            <p className="text-muted-foreground">
              Mínimo de <strong className="text-foreground">{settings.minRedemption} pontos</strong> para resgate
            </p>
          </div>
          {settings.minOrderValue > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-muted-foreground">
                Pedido mínimo de <strong className="text-foreground">R$ {settings.minOrderValue.toFixed(2)}</strong> para usar pontos
              </p>
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">{settings.minOrderValue > 0 ? 6 : 5}</span>
            </div>
            <p className="text-muted-foreground">
              Desconto de até <strong className="text-foreground">{settings.maxDiscountPercent}%</strong> do valor do pedido,
              em múltiplos de <strong className="text-foreground">{settings.redemptionStep}</strong> pontos
            </p>
          </div>
          {settings.firstPurchaseBonus > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Gift className="h-3.5 w-3.5 text-green-600" />
              </div>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Bônus de boas-vindas:</strong> ganhe{' '}
                <strong className="text-green-600">+{settings.firstPurchaseBonus} pontos</strong> na sua primeira compra
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <CardTitle className="text-base">Últimas Movimentações</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTransactions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={tx.points > 0 ? 'default' : 'secondary'}
                      className={tx.points > 0 ? 'bg-green-100 text-green-700' : tx.type === 'expire' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}
                    >
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {tx.type === 'earn' && 'Compra'}
                        {tx.type === 'redeem' && 'Resgate'}
                        {tx.type === 'adjust' && 'Ajuste'}
                        {tx.type === 'expire' && 'Expiração'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.orderNumber ? `Pedido #${tx.orderNumber}` : tx.description || '-'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(tx.createdAt), "dd MMM", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma movimentação ainda</p>
              <p className="text-xs">Faça sua primeira compra e ganhe pontos!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
