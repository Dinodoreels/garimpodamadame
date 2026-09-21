import { useEffect, useState } from 'react';
import { Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channel: 'whatsapp' | 'email';
  providerLabel?: string;
}

export function TestMessageDialog({ open, onOpenChange, channel, providerLabel }: Props) {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('Teste de e-mail — O Garimpo Digital');
  const [message, setMessage] = useState(
    channel === 'whatsapp'
      ? '✅ Mensagem de teste do sistema. Se você recebeu isso, sua integração de WhatsApp está funcionando!'
      : 'Este é um e-mail de teste de O Garimpo Digital. Se você recebeu esta mensagem, o envio da loja está funcionando corretamente.'
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; provider?: string; status?: number; error?: string; response?: string; action?: { label: string; url: string } } | null>(null);
  const { toast } = useToast();

  const isPhone = channel === 'whatsapp';

  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user?.id) return;
      if (isPhone) {
        supabase.from('profiles').select('phone').eq('id', data.user.id).maybeSingle().then(({ data: p }) => {
          if (p?.phone) setRecipient((prev) => prev || p.phone!);
        });
      } else if (data.user.email) {
        setRecipient((prev) => prev || data.user!.email!);
      }
    });
  }, [open, isPhone]);

  const handleSend = async () => {
    if (!recipient.trim()) {
      toast({ variant: 'destructive', title: isPhone ? 'Informe um telefone' : 'Informe um e-mail' });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-message', {
        body: { channel, recipient: recipient.trim(), message, subject: isPhone ? undefined : subject },
      });
      if (error) throw error;
      setResult(data);
      if (data?.ok) {
        toast({ title: 'Mensagem de teste enviada!', description: `Provedor: ${data.provider} • Status: ${data.status}` });
      } else {
        toast({ variant: 'destructive', title: 'Falha no envio', description: data?.error || `Status ${data?.status}` });
      }
    } catch (e: any) {
      setResult({ ok: false, error: e?.message || String(e) });
      toast({ variant: 'destructive', title: 'Erro ao enviar', description: e?.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Testar {isPhone ? 'WhatsApp' : 'E-mail'}
          </DialogTitle>
          <DialogDescription>
            {providerLabel ? `Enviando via ${providerLabel}. ` : ''}
            Envia uma mensagem real para o destinatário informado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs tracking-wider uppercase font-medium">
              {isPhone ? 'Telefone (com DDD e país)' : 'E-mail destino'}
            </Label>
            <Input
              type={isPhone ? 'tel' : 'email'}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={isPhone ? '5511999999999' : 'voce@exemplo.com'}
              className="font-mono text-sm"
            />
            {isPhone && <p className="text-xs text-muted-foreground">Use o formato internacional, ex: 5511987654321</p>}
          </div>

          {!isPhone && (
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase font-medium">Assunto</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs tracking-wider uppercase font-medium">Mensagem</Label>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>

          {result && (
            <div className={`rounded-lg border p-3 text-xs ${result.ok ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
              <div className="flex items-center gap-2 font-medium mb-1">
                {result.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                {result.ok ? 'Sucesso' : 'Falhou'}
                {result.provider && <span className="text-muted-foreground">• {result.provider}</span>}
                {typeof result.status === 'number' && <span className="text-muted-foreground">• HTTP {result.status}</span>}
              </div>
              {result.error && <p className="text-destructive">{result.error}</p>}
              {result.response && <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">{result.response}</pre>}
              {result.action?.url && (
                <a
                  href={result.action.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  → {result.action.label}
                </a>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar teste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
