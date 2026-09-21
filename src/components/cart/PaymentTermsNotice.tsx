import { CreditCard } from 'lucide-react';

export function PaymentTermsNotice() {
  return (
    <div className="flex items-start gap-2 border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
      <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
      <p>
        Pix, débito ou crédito em até 12x. De 2x a 12x, os juros são calculados pelo Mercado Pago e pagos pelo cliente.
      </p>
    </div>
  );
}