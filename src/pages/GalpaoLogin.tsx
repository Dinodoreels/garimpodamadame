import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ScanLine } from 'lucide-react';
import { operatorService } from '@/services/inbound/scanService';

/** Entrada rápida do galpão: código do operador + PIN. */
export default function GalpaoLogin() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await operatorService.login(code.trim(), pin.trim());
      toast.success(`Bem-vindo, ${res.operator.name}`);
      navigate('/galpao/scan', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 space-y-6">
          <div className="text-center space-y-2">
            <ScanLine className="h-10 w-10 mx-auto text-primary" strokeWidth={1.5} />
            <h1 className="text-xl font-semibold">Acesso do galpão</h1>
            <p className="text-sm text-muted-foreground">Use seu código e o PIN de 4 a 6 números.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código do operador</Label>
              <Input
                id="code" className="h-14 text-base uppercase" autoFocus
                value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="OP01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin" className="h-14 text-base tracking-[0.4em] text-center"
                inputMode="numeric" type="password" maxLength={6}
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••"
              />
            </div>
            <Button type="submit" size="lg" className="h-14 w-full text-base" disabled={loading || !code || pin.length < 4}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
