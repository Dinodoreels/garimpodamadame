import { useSearchParams, Link } from 'react-router-dom';
import { Clock, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function CheckoutPending() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-16">
        <div className="container max-w-lg text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-100 flex items-center justify-center">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-4">
            Pagamento Pendente
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Seu pagamento está sendo processado. Assim que for confirmado, 
            você receberá uma notificação por e-mail.
          </p>
          
          {orderNumber && (
            <div className="bg-secondary/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-muted-foreground mb-1">Número do pedido</p>
              <p className="text-xl font-semibold font-mono">{orderNumber}</p>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground mb-8">
            Pagamentos via PIX costumam ser confirmados em poucos segundos.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline">
              <Link to="/account">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Meus Pedidos
              </Link>
            </Button>
            <Button asChild>
              <Link to="/catalog">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continuar Comprando
              </Link>
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
