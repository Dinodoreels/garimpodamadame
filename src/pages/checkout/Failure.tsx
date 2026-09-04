import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, ArrowLeft, MessageCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CheckoutFailure() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');
  const [retrying, setRetrying] = useState(false);

  const handleRetryPayment = async () => {
    if (!orderNumber) return;

    setRetrying(true);
    try {
      // First, find the order ID by order number
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .single();

      if (orderError || !order) {
        toast.error('Pedido não encontrado');
        return;
      }

      // Call retry-payment function
      const { data, error } = await supabase.functions.invoke('retry-payment', {
        body: { order_id: order.id },
      });

      if (error || !data.success) {
        toast.error(data?.error || 'Erro ao gerar novo link de pagamento');
        return;
      }

      // Redirect to checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast.error('Erro ao tentar novamente');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-16">
        <div className="container max-w-lg text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-4">
            Pagamento não aprovado
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Infelizmente não foi possível processar seu pagamento. 
            Você pode tentar novamente ou escolher outra forma de pagamento.
          </p>
          
          {orderNumber && (
            <div className="bg-secondary/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-muted-foreground mb-1">Referência do pedido</p>
              <p className="text-lg font-semibold font-mono">{orderNumber}</p>
            </div>
          )}

          {/* Suggestions */}
          <div className="bg-muted/50 rounded-lg p-4 mb-8 text-left">
            <p className="font-medium mb-2">Possíveis soluções:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Verifique se os dados do cartão estão corretos</li>
              <li>• Tente com outro cartão de crédito</li>
              <li>• Use PIX para pagamento instantâneo</li>
              <li>• Entre em contato com seu banco</li>
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {orderNumber && (
              <Button 
                onClick={handleRetryPayment}
                disabled={retrying}
                className="flex-1"
              >
                {retrying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando link...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar Novamente
                  </>
                )}
              </Button>
            )}
            <Button asChild variant="outline" className="flex-1">
              <a 
                href={`https://wa.me/5511999999999?text=Olá! Tive um problema com meu pedido ${orderNumber || ''}.`}
                target="_blank" 
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Falar no WhatsApp
              </a>
            </Button>
          </div>

          <div className="mt-6">
            <Button asChild variant="ghost">
              <Link to="/catalog">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para a Loja
              </Link>
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
