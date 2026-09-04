import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, CreditCard, Building2, DollarSign, Package, Percent, Target, TrendingUp, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface PricingCalculatorProps {
  initialCost?: number;
  initialPrice?: number;
  onUsePrice?: (price: number) => void;
  onCalculationChange?: (result: CalcResult | null) => void;
  compact?: boolean;
}

export interface CalcResult {
  suggestedPrice: number;
  totalCost: number;
  profitPerUnit: number;
  realMargin: number;
  taxAmount: number;
  cardFeeAmount: number;
  commissionAmount: number;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseInput(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatInput(value: string): string {
  const numbers = value.replace(/\D/g, '');
  const amount = parseInt(numbers || '0', 10) / 100;
  return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PricingCalculator({
  initialCost = 0,
  initialPrice = 0,
  onUsePrice,
  onCalculationChange,
  compact,
}: PricingCalculatorProps) {
  const [cost, setCost] = useState(() => initialCost > 0 ? formatBRL(initialCost) : '');
  const [shippingIn, setShippingIn] = useState('');
  const [fixedCosts, setFixedCosts] = useState('');
  const [taxes, setTaxes] = useState('6,00');
  const [cardFee, setCardFee] = useState('4,99');
  const [commission, setCommission] = useState('0,00');
  const [desiredMargin, setDesiredMargin] = useState('30,00');

  useEffect(() => {
    setCost(initialCost > 0 ? formatBRL(initialCost) : '');
  }, [initialCost]);

  const result = useMemo<CalcResult | null>(() => {
    const costVal = parseInput(cost);
    const shippingVal = parseInput(shippingIn);
    const fixedVal = parseInput(fixedCosts);
    const taxesVal = parseInput(taxes);
    const cardVal = parseInput(cardFee);
    const commVal = parseInput(commission);
    const marginVal = parseInput(desiredMargin);

    if (costVal <= 0) return null;

    const totalCost = costVal + shippingVal + fixedVal;
    const totalPercentage = (taxesVal + cardVal + commVal + marginVal) / 100;

    if (totalPercentage >= 1) return null;

    const suggestedPrice = totalCost / (1 - totalPercentage);
    const taxAmount = suggestedPrice * (taxesVal / 100);
    const cardFeeAmount = suggestedPrice * (cardVal / 100);
    const commissionAmount = suggestedPrice * (commVal / 100);
    const profitPerUnit = suggestedPrice - totalCost - taxAmount - cardFeeAmount - commissionAmount;
    const realMargin = (profitPerUnit / suggestedPrice) * 100;

    return { suggestedPrice, totalCost, profitPerUnit, realMargin, taxAmount, cardFeeAmount, commissionAmount };
  }, [cost, shippingIn, fixedCosts, taxes, cardFee, commission, desiredMargin]);

  const currentAnalysis = useMemo(() => {
    if (initialPrice <= 0 || parseInput(cost) <= 0) return null;
    const costVal = parseInput(cost);
    const shippingVal = parseInput(shippingIn);
    const fixedVal = parseInput(fixedCosts);
    const taxesVal = parseInput(taxes);
    const cardVal = parseInput(cardFee);
    const commVal = parseInput(commission);

    const totalCost = costVal + shippingVal + fixedVal;
    const feesOnPrice = initialPrice * ((taxesVal + cardVal + commVal) / 100);
    const profit = initialPrice - totalCost - feesOnPrice;
    const margin = (profit / initialPrice) * 100;

    return { profit, margin };
  }, [initialPrice, cost, shippingIn, fixedCosts, taxes, cardFee, commission]);

  useEffect(() => {
    onCalculationChange?.(result);
  }, [onCalculationChange, result]);

  const handleCurrencyChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatInput(e.target.value));
  };

  const handlePercentChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatInput(e.target.value));
  };

  const comparison = useMemo(() => {
    if (!result || initialPrice <= 0) return null;

    const delta = result.suggestedPrice - initialPrice;
    const deltaPercent = initialPrice > 0 ? (delta / initialPrice) * 100 : 0;

    return {
      delta,
      deltaPercent,
      shouldIncrease: delta > 0,
    };
  }, [initialPrice, result]);

  const resultTone = result
    ? result.realMargin >= 25
      ? 'strong'
      : result.realMargin >= 12
        ? 'balanced'
        : 'tight'
    : 'idle';

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {currentAnalysis && (
        <Card className={cn(
          "border",
          currentAnalysis.margin >= 20
            ? "border-primary/20 bg-primary/5"
            : currentAnalysis.margin >= 10
              ? "border-border bg-muted/40"
              : "border-destructive/20 bg-destructive/5"
        )}>
          <CardContent className="p-3">
            <p className="mb-1 text-xs text-muted-foreground">Preço atual: R$ {formatBRL(initialPrice)}</p>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Lucro:</span>
                <span className={cn("ml-1 text-sm font-medium", currentAnalysis.profit >= 0 ? "text-primary" : "text-destructive")}>
                  R$ {formatBRL(currentAnalysis.profit)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Margem:</span>
                <span className={cn(
                  "ml-1 text-sm font-medium",
                  currentAnalysis.margin >= 20 ? "text-primary" : currentAnalysis.margin >= 10 ? "text-foreground" : "text-destructive"
                )}>
                  {currentAnalysis.margin.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><Package className="h-3 w-3" /> Custo do produto</Label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
            <Input value={cost} onChange={handleCurrencyChange(setCost)} placeholder="0,00" className="pl-8 text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><Truck className="h-3 w-3" /> Frete entrada</Label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
            <Input value={shippingIn} onChange={handleCurrencyChange(setShippingIn)} placeholder="0,00" className="pl-8 text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><DollarSign className="h-3 w-3" /> Custos fixos/peça</Label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
            <Input value={fixedCosts} onChange={handleCurrencyChange(setFixedCosts)} placeholder="0,00" className="pl-8 text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><Building2 className="h-3 w-3" /> Impostos</Label>
          <div className="relative">
            <Input value={taxes} onChange={handlePercentChange(setTaxes)} placeholder="6,00" className="pr-6 text-sm" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><CreditCard className="h-3 w-3" /> Taxa cartão</Label>
          <div className="relative">
            <Input value={cardFee} onChange={handlePercentChange(setCardFee)} placeholder="4,99" className="pr-6 text-sm" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><Percent className="h-3 w-3" /> Comissão</Label>
          <div className="relative">
            <Input value={commission} onChange={handlePercentChange(setCommission)} placeholder="0,00" className="pr-6 text-sm" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
          </div>
        </div>
      </div>

      {/* Desired margin - full width */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1 font-medium"><Target className="h-3 w-3" /> Margem de lucro desejada</Label>
        <div className="relative">
          <Input value={desiredMargin} onChange={handlePercentChange(setDesiredMargin)} placeholder="30,00" className="pr-6 text-sm" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
        </div>
      </div>

      <Separator />

      {result ? (
        <div className="space-y-3">
          <div className={cn(
            "rounded-lg border p-4",
            resultTone === 'strong' && 'border-primary/20 bg-primary/5',
            resultTone === 'balanced' && 'border-border bg-muted/40',
            resultTone === 'tight' && 'border-destructive/20 bg-destructive/5'
          )}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Preço ideal de venda</p>
                <p className="text-2xl font-semibold text-foreground">R$ {formatBRL(result.suggestedPrice)}</p>
              </div>

              {comparison && (
                <div className={cn(
                  "rounded-md border px-3 py-2 text-right",
                  comparison.shouldIncrease ? "border-primary/20 bg-primary/10" : "border-border bg-background"
                )}>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ajuste</p>
                  <p className={cn("text-sm font-medium", comparison.shouldIncrease ? "text-primary" : "text-foreground")}>
                    {comparison.shouldIncrease ? '+' : ''}R$ {formatBRL(comparison.delta)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {comparison.shouldIncrease ? '+' : ''}{comparison.deltaPercent.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {comparison && (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-md border bg-background p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Preço atual</p>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                  <span>R$ {formatBRL(initialPrice)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>R$ {formatBRL(result.suggestedPrice)}</span>
                </div>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Impacto esperado</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {comparison.shouldIncrease ? 'Seu preço atual está abaixo da meta.' : 'Seu preço atual já cobre a meta.'}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded-md p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lucro/peça</p>
              <p className="text-sm font-medium text-primary">R$ {formatBRL(result.profitPerUnit)}</p>
            </div>
            <div className="bg-muted/50 rounded-md p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Margem real</p>
              <p className="text-sm font-medium text-primary">{result.realMargin.toFixed(1)}%</p>
            </div>
          </div>

          <div className="text-xs space-y-1 text-muted-foreground">
            <div className="flex justify-between"><span>Custo total</span><span>R$ {formatBRL(result.totalCost)}</span></div>
            <div className="flex justify-between"><span>Impostos</span><span>R$ {formatBRL(result.taxAmount)}</span></div>
            <div className="flex justify-between"><span>Taxa cartão</span><span>R$ {formatBRL(result.cardFeeAmount)}</span></div>
            {result.commissionAmount > 0 && <div className="flex justify-between"><span>Comissão</span><span>R$ {formatBRL(result.commissionAmount)}</span></div>}
            <div className="flex justify-between font-medium text-foreground"><span>Lucro</span><span>R$ {formatBRL(result.profitPerUnit)}</span></div>
          </div>

          {onUsePrice && (
            <Button onClick={() => onUsePrice(result.suggestedPrice)} className="w-full" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Usar este preço
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          {parseInput(cost) <= 0 ? 'Informe o custo do produto para calcular' : 'A soma das taxas e margem não pode ser 100% ou mais'}
        </p>
      )}
    </div>
  );
}
