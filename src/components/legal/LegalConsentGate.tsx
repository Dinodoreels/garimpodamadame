import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLegalConsent } from '@/hooks/useLegalConsent';
import { CURRENT_LEGAL_VERSION } from '@/lib/legalContent';
import { toast } from 'sonner';

export function LegalConsentGate() {
  const { pathname } = useLocation();
  const { loading, needsAcceptance, accept } = useLegalConsent();
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const isLegalPage = ['/termos', '/privacidade', '/cookies'].includes(pathname);

  if (loading || isLegalPage) return null;

  const handleAccept = async () => {
    if (!confirmed) return;
    setSaving(true);
    const { error } = await accept();
    setSaving(false);
    if (error) toast.error('Não foi possível registrar seu aceite. Tente novamente.');
    else toast.success('Aceite registrado com segurança.');
  };

  return (
    <Dialog open={needsAcceptance}>
      <DialogContent className="max-w-md [&>button]:hidden" onEscapeKeyDown={event => event.preventDefault()} onPointerDownOutside={event => event.preventDefault()}>
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>Confirme os documentos da loja</DialogTitle>
          <DialogDescription>
            Para continuar, leia e aceite a versão vigente dos documentos legais.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">Versão {CURRENT_LEGAL_VERSION}</p>
          <div className="mt-2 flex gap-3">
            <Link className="underline" to="/termos" target="_blank">Termos de Uso</Link>
            <Link className="underline" to="/privacidade" target="_blank">Privacidade</Link>
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} className="mt-0.5" />
          <span>Li e aceito os Termos de Uso e declaro ciência da Política de Privacidade.</span>
        </label>
        <Button onClick={handleAccept} disabled={!confirmed || saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirmar e continuar
        </Button>
      </DialogContent>
    </Dialog>
  );
}