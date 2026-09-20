import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatZipCode } from '@/lib/shipping';

type Address = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export function ShippingOriginCard({ zipCode }: { zipCode: string }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cleanZip = zipCode.replace(/\D/g, '');
    if (cleanZip.length !== 8) {
      setAddress(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(`https://viacep.com.br/ws/${cleanZip}/json/`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: Address) => setAddress(data.erro ? null : data))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setAddress(null);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [zipCode]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">Ponto de distribuição</CardTitle>
        </div>
        <CardDescription>Este é o local de saída usado no cálculo do frete.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-4">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium">CEP {formatZipCode(zipCode)}</p>
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Consultando endereço…
              </p>
            ) : address ? (
              <>
                <p className="text-sm">{address.logradouro || 'Logradouro não informado'} — {address.bairro || 'Bairro não informado'}</p>
                <p className="text-sm text-muted-foreground">{address.localidade}/{address.uf}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Informe um CEP válido na configuração do provedor.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}