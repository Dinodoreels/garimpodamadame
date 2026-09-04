import { Ticket, Copy, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCustomerCoupons } from '@/hooks/useCustomerCoupons';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CustomerCouponsCard() {
  const { coupons, loading } = useCustomerCoupons();

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const formatValue = (type: string, value: number) => {
    if (type === 'percentage') return `${value}%`;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatus = (coupon: typeof coupons[0]) => {
    if (coupon.is_used) return 'used';
    if (!coupon.is_active) return 'inactive';
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return 'expired';
    return 'available';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Meus Cupons</CardTitle>
        </div>
        <CardDescription>Cupons exclusivos disponíveis para você</CardDescription>
      </CardHeader>
      <CardContent>
        {coupons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum cupom atribuído</p>
            <p className="text-xs">Fique atento, cupons exclusivos podem aparecer aqui!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => {
              const status = getStatus(coupon);
              const isAvailable = status === 'available';

              return (
                <div
                  key={coupon.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isAvailable
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-muted bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isAvailable ? 'bg-primary/10' : 'bg-muted'}`}>
                      {status === 'used' ? (
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      ) : status === 'expired' ? (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Ticket className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className={`font-mono font-semibold text-sm ${!isAvailable ? 'line-through' : ''}`}>
                        {coupon.code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatValue(coupon.type, coupon.value)} de desconto
                        {coupon.min_order_value ? ` • Min. R$ ${coupon.min_order_value.toFixed(0)}` : ''}
                      </p>
                      {coupon.expires_at && (
                        <p className="text-xs text-muted-foreground">
                          Válido até {format(new Date(coupon.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === 'used' && <Badge variant="secondary">Usado</Badge>}
                    {status === 'expired' && <Badge variant="outline">Expirado</Badge>}
                    {status === 'inactive' && <Badge variant="outline">Inativo</Badge>}
                    {isAvailable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(coupon.code)}
                        className="h-8"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
