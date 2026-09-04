import { useState } from 'react';
import { Tag, X, Loader2, Check, Ticket, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useValidateDiscount, DiscountCode } from '@/hooks/useDiscounts';
import { useCustomerCoupons } from '@/hooks/useCustomerCoupons';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DiscountInputProps {
  subtotal: number;
  appliedDiscount: DiscountCode | null;
  discountAmount: number;
  onApplyDiscount: (discount: DiscountCode | null, amount: number) => void;
}

export function DiscountInput({
  subtotal,
  appliedDiscount,
  discountAmount,
  onApplyDiscount,
}: DiscountInputProps) {
  const { user } = useAuth();
  const { validateDiscount, validating } = useValidateDiscount();
  const { availableCoupons } = useCustomerCoupons();
  const [code, setCode] = useState('');
  const [showCoupons, setShowCoupons] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) {
      toast.error('Digite um código de cupom');
      return;
    }

    if (!user) {
      toast.error('Faça login para usar cupons');
      return;
    }

    const result = await validateDiscount(code, subtotal, user.id);

    if (result.valid && result.discount) {
      onApplyDiscount(result.discount, result.discountAmount);
      toast.success('Cupom aplicado!', {
        description: `Desconto de R$ ${result.discountAmount.toFixed(2)}`,
      });
      setCode('');
    } else {
      toast.error(result.errorMessage || 'Cupom inválido');
    }
  };

  const handleRemove = () => {
    onApplyDiscount(null, 0);
    toast.info('Cupom removido');
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  if (appliedDiscount) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <div>
            <span className="text-sm font-medium text-green-700">
              {appliedDiscount.code}
            </span>
            <span className="text-sm text-green-600 ml-2">
              -{formatPrice(discountAmount)}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
          onClick={handleRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const handleSelectCoupon = (couponCode: string) => {
    setCode(couponCode);
    setShowCoupons(false);
  };

  const formatCouponValue = (type: string, value: number) => {
    if (type === 'percentage') return `${value}%`;
    return `R$ ${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Código do cupom"
            className="pl-10"
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          />
        </div>
        <Button
          variant="outline"
          onClick={handleApply}
          disabled={validating || !code.trim()}
        >
          {validating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>

      {/* Customer coupons suggestion */}
      {availableCoupons.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowCoupons(!showCoupons)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Ticket className="h-3.5 w-3.5" />
            Você tem {availableCoupons.length} cupom(ns) disponível(is)
            {showCoupons ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showCoupons && (
            <div className="mt-2 space-y-1.5">
              {availableCoupons.map((coupon) => (
                <button
                  key={coupon.id}
                  type="button"
                  onClick={() => handleSelectCoupon(coupon.code)}
                  className="w-full flex items-center justify-between p-2 rounded-md border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                >
                  <div>
                    <span className="font-mono font-semibold text-sm">{coupon.code}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatCouponValue(coupon.type, coupon.value)} off
                    </span>
                  </div>
                  <span className="text-xs text-primary">Usar</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
