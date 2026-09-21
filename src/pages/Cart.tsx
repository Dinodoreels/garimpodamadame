import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';

export default function Cart() {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-cart-trigger]')?.click();
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container flex flex-1 items-center justify-center py-16 text-center">
        <div className="max-w-md space-y-4">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl font-semibold">Seu carrinho</h1>
          <p className="text-sm text-muted-foreground">Confira seus produtos, entrega e total no painel do carrinho.</p>
          <Button asChild variant="outline"><Link to="/catalog">Continuar comprando</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}