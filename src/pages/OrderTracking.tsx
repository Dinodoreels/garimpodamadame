import { useState } from 'react';
import { Search, Package, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCMSThemeContext } from '@/providers/CMSThemeProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { OrderStatusTimeline } from '@/components/account/OrderStatusTimeline';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderInfo {
  order_number: string;
  status: string;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
}

export default function OrderTracking() {
  const theme = useCMSThemeContext();
  const social = (theme?.social as Record<string, string>) || {};
  const whatsappNumber = social.whatsapp || '5511999999999';
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderNumber.trim()) {
      toast.error('Digite o número do pedido');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .rpc('get_order_by_number', { _order_number: orderNumber.trim().toUpperCase() });

      if (error || !data || data.length === 0) {
        setOrder(null);
        toast.error('Pedido não encontrado');
        return;
      }

      setOrder(data[0] as OrderInfo);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Erro ao buscar pedido');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 py-8 md:py-16">
        <div className="container max-w-xl">
          {/* Back link */}
          <Button variant="ghost" asChild className="mb-6 -ml-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Link>
          </Button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Rastrear Pedido</h1>
            <p className="text-muted-foreground">
              Digite o número do seu pedido para acompanhar o status
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ex: PI20260001"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                  className="pl-10 font-mono"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </form>

          {/* Results */}
          {searched && (
            order ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-mono">
                      {order.order_number}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <OrderStatusTimeline order={order} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">
                    Nenhum pedido encontrado com este número
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Verifique se digitou corretamente (ex: PI20260001)
                  </p>
                </CardContent>
              </Card>
            )
          )}

          {/* Help text */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>O número do pedido foi enviado para seu email após a compra.</p>
            <p className="mt-2">
              Problemas? Entre em contato via{' '}
              <a 
                href={`https://wa.me/${whatsappNumber}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                WhatsApp
              </a>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
