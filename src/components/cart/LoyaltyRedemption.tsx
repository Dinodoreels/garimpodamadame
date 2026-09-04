import { useMemo, useState } from 'react';
import { Star, Gift, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  useLoyaltyBalance,
  useLoyaltySettings,
  calculatePointsDiscount,
  getRedeemableInfo,
} from '@/hooks/useLoyalty';
import { useAuth } from '@/hooks/useAuth';
 
 interface LoyaltyRedemptionProps {
   onApplyPoints: (points: number, discount: number) => void;
   appliedPoints: number;
   maxDiscount: number;
 }
 
export function LoyaltyRedemption({ onApplyPoints, appliedPoints, maxDiscount }: LoyaltyRedemptionProps) {
   const { user } = useAuth();
   const { data: balance, isLoading: loadingBalance } = useLoyaltyBalance();
   const { data: settings } = useLoyaltySettings();
   const [pointsToUse, setPointsToUse] = useState('');
 
   if (!user || !settings?.isActive || loadingBalance) {
     return null;
   }
 
  const availablePoints = balance?.balance ?? 0;

  const info = useMemo(
    () => getRedeemableInfo(availablePoints, maxDiscount, settings),
    [availablePoints, maxDiscount, settings]
  );
  const maxRedeemable = info.maxPoints;
  const step = info.step;

  // Don't show anything if user has zero points and no balance to ever use
  if (availablePoints === 0) return null;

  const handleApply = () => {
     const points = parseInt(pointsToUse);
     if (isNaN(points) || points < settings.minRedemption) {
       return;
     }
    let finalPoints = Math.min(points, maxRedeemable);
    finalPoints = Math.floor(finalPoints / step) * step;
    if (finalPoints < settings.minRedemption) return;
     const discount = calculatePointsDiscount(finalPoints, settings.redemptionRate);
     onApplyPoints(finalPoints, discount);
     setPointsToUse('');
   };
 
   const handleRemove = () => {
     onApplyPoints(0, 0);
   };
 
  const setQuick = (fraction: number) => {
    const raw = Math.floor(maxRedeemable * fraction);
    const stepped = Math.max(settings.minRedemption, Math.floor(raw / step) * step);
    setPointsToUse(String(Math.min(stepped, maxRedeemable)));
  };

   if (appliedPoints > 0) {
     const appliedDiscount = calculatePointsDiscount(appliedPoints, settings.redemptionRate);
     return (
       <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
         <div className="flex items-center gap-2">
           <Check className="h-4 w-4 text-primary" />
           <div>
             <span className="text-sm font-medium text-primary">
               {appliedPoints.toLocaleString('pt-BR')} pontos aplicados
             </span>
             <span className="text-sm text-primary/80 ml-2">
               -R$ {appliedDiscount.toFixed(2)}
             </span>
           </div>
         </div>
         <Button
           variant="ghost"
           size="sm"
           onClick={handleRemove}
           className="text-primary hover:text-primary/80"
         >
           Remover
         </Button>
       </div>
     );
   }
 
  // Blocked / informational state
  if (info.blockedReason || maxRedeemable < settings.minRedemption) {
    return (
      <div className="space-y-2 p-3 bg-muted/40 rounded-lg border border-dashed">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Pontos de Fidelidade</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Você tem <strong className="text-foreground">{availablePoints.toLocaleString('pt-BR')}</strong> pontos.
          {' '}{info.blockedReason || 'Aumente o pedido para resgatar.'}
        </p>
      </div>
    );
  }

  const parsedPoints = parseInt(pointsToUse) || 0;
  const previewPoints = Math.min(parsedPoints, maxRedeemable);
  const previewDiscount = previewPoints >= settings.minRedemption
    ? calculatePointsDiscount(Math.floor(previewPoints / step) * step, settings.redemptionRate)
    : 0;
  const pctOfOrder = maxDiscount > 0 ? (previewDiscount / maxDiscount) * 100 : 0;

   return (
     <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
       <div className="flex items-center gap-2">
         <Star className="h-4 w-4 text-primary fill-primary" />
         <span className="text-sm font-medium">Usar Pontos de Fidelidade</span>
       </div>

      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>
          Saldo: <strong className="text-foreground">{availablePoints.toLocaleString('pt-BR')}</strong> pts ·
          {' '}Máximo neste pedido: <strong className="text-foreground">{maxRedeemable.toLocaleString('pt-BR')}</strong> pts
        </p>
        <p>
          Limite de desconto: <strong>{info.maxDiscountPercent}%</strong> do pedido · Resgate em múltiplos de <strong>{step}</strong>
        </p>
      </div>

      <Slider
        value={[Math.min(parsedPoints, maxRedeemable)]}
        max={maxRedeemable}
        min={0}
        step={step}
        onValueChange={(v) => setPointsToUse(String(v[0] || 0))}
      />

      <div className="flex gap-1.5 flex-wrap">
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setQuick(0.25)}>25%</Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setQuick(0.5)}>50%</Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setQuick(0.75)}>75%</Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setQuick(1)}>Máx</Button>
      </div>
 
       <div className="flex gap-2">
         <div className="relative flex-1">
           <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             type="number"
             value={pointsToUse}
             onChange={(e) => setPointsToUse(e.target.value)}
             placeholder={`Mínimo ${settings.minRedemption} pontos`}
             className="pl-10"
             min={settings.minRedemption}
             max={maxRedeemable}
            step={step}
           />
         </div>
         <Button
           variant="outline"
           onClick={handleApply}
           disabled={!pointsToUse || parseInt(pointsToUse) < settings.minRedemption}
         >
           Aplicar
         </Button>
       </div>
 
      {previewDiscount > 0 && (
        <div className="text-xs text-green-600 dark:text-green-500 flex items-center justify-between">
          <span>= Desconto de <strong>R$ {previewDiscount.toFixed(2)}</strong> ({pctOfOrder.toFixed(0)}% do pedido)</span>
          <span className="text-muted-foreground">Saldo restante: {(availablePoints - Math.min(parsedPoints, maxRedeemable)).toLocaleString('pt-BR')}</span>
        </div>
      )}
     </div>
   );
 }