import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Eye, ImageIcon, ShoppingCart, CreditCard, CheckCircle2 } from 'lucide-react';
import type { TopViewedProduct } from '@/hooks/useAnalytics';

interface Props {
  data?: TopViewedProduct[];
  loading?: boolean;
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function stockBadge(stock: number) {
  if (stock <= 0) return <Badge variant="destructive">Esgotado</Badge>;
  if (stock <= 5) return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 border-transparent">{stock} un</Badge>;
  return <Badge variant="secondary">{stock} un</Badge>;
}

export function TopViewedProductsCard({ data, loading }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top 10 produtos mais visualizados</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !data ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Sem visualizações de produto no período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 text-left font-medium w-8">#</th>
                  <th className="py-2 text-left font-medium">Produto</th>
                  <th className="py-2 text-right font-medium">Preço</th>
                  <th className="py-2 text-right font-medium">Estoque</th>
                  <th className="py-2 text-right font-medium">Funil</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => window.open(`/product/${item.handle}`, '_blank')}
                  >
                    <td className="py-2 text-muted-foreground font-medium">{idx + 1}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-sm overflow-hidden bg-muted flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="truncate max-w-[260px]">{item.title}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">{formatBRL(item.price)}</td>
                    <td className="py-2 text-right">{stockBadge(item.stock)}</td>
                    <td className="py-2 text-right font-medium whitespace-nowrap">
                      <div className="inline-flex items-center gap-3">
                        <span className="inline-flex items-center gap-1" title="Visualizações">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          {item.views.toLocaleString('pt-BR')}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Foram para o carrinho/checkout">
                          <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                          {(item.cartSessions ?? 0).toLocaleString('pt-BR')}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Pedidos no checkout">
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                          {(item.checkoutOrders ?? 0).toLocaleString('pt-BR')}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Compras finalizadas">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          {(item.paidOrders ?? 0).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
