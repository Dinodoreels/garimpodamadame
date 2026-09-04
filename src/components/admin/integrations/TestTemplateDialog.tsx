import { useEffect, useMemo, useState } from 'react';
import { Send, Loader2, CheckCircle2, XCircle, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { fillTemplate, SAMPLE_VARS } from '@/lib/messagePreview';
import type { AutomationStep } from '@/hooks/useIntegrations';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  step: AutomationStep;
  eventLabel: string;
}

type Channel = 'email' | 'whatsapp';

function channelsFor(stepChannel: string): Channel[] {
  switch (stepChannel) {
    case 'email': return ['email'];
    case 'whatsapp': return ['whatsapp'];
    case 'both':
    case 'all':
      return ['email', 'whatsapp'];
    case 'email_push':
      return ['email'];
    case 'whatsapp_push':
      return ['whatsapp'];
    case 'push':
      return [];
    default:
      return ['email'];
  }
}

type Result = { ok: boolean; provider?: string; status?: number; error?: string; response?: string };

export function TestTemplateDialog({ open, onOpenChange, step, eventLabel }: Props) {
  const { toast } = useToast();
  const available = useMemo(() => channelsFor(step.channel), [step.channel]);

  const sampleVars = useMemo(
    () => ({ ...SAMPLE_VARS, cupom: step.coupon_enabled ? (step.coupon_prefix ? `${step.coupon_prefix}TESTE` : 'TESTE10') : SAMPLE_VARS.cupom }),
    [step.coupon_enabled, step.coupon_prefix],
  );

  const [selected, setSelected] = useState<Record<Channel, boolean>>({ email: false, whatsapp: false });
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Partial<Record<Channel, Result>>>({});

  useEffect(() => {
    if (!open) return;
    setSelected({ email: available.includes('email'), whatsapp: available.includes('whatsapp') });
    setSubject(fillTemplate(step.subject || `[Teste] ${eventLabel}`, sampleVars));
    setMessage(fillTemplate(step.template || '', sampleVars));
    setResults({});
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setRecipientEmail((prev) => prev || data.user!.email!);
      if (data.user?.id) {
        supabase.from('profiles').select('phone').eq('id', data.user.id).maybeSingle().then(({ data: p }) => {
          if (p?.phone) setRecipientPhone((prev) => prev || p.phone!);
        });
      }
    });
  }, [open, step, eventLabel, sampleVars, available]);

  const toggle = (c: Channel) => setSelected((s) => ({ ...s, [c]: !s[c] }));

  const handleSend = async () => {
    const selectedChannels = (Object.keys(selected) as Channel[]).filter((c) => selected[c]);
    if (selectedChannels.length === 0) {
      toast({ variant: 'destructive', title: 'Selecione ao menos um canal' });
      return;
    }
    const skipped: Channel[] = [];
    const channels = selectedChannels.filter((c) => {
      if (c === 'email' && !recipientEmail.trim()) { skipped.push(c); return false; }
      if (c === 'whatsapp' && !recipientPhone.trim()) { skipped.push(c); return false; }
      return true;
    });
    if (channels.length === 0) {
      toast({
        variant: 'destructive',
        title: selectedChannels.includes('email') && !recipientEmail.trim()
          ? 'Informe um e-mail destino'
          : 'Informe um telefone destino',
      });
      return;
    }
    if (skipped.length > 0) {
      toast({
        title: skipped.includes('whatsapp') ? 'WhatsApp ignorado' : 'E-mail ignorado',
        description: skipped.includes('whatsapp') ? 'Telefone não informado.' : 'E-mail não informado.',
      });
    }

    setSending(true);
    const next: Partial<Record<Channel, Result>> = {};
    for (const channel of channels) {
      try {
        const { data, error } = await supabase.functions.invoke('test-message', {
          body: {
            channel,
            recipient: channel === 'email' ? recipientEmail.trim() : recipientPhone.trim(),
            message,
            subject: channel === 'email' ? subject : undefined,
          },
        });
        if (error) throw error;
        next[channel] = data as Result;
      } catch (e: any) {
        next[channel] = { ok: false, error: e?.message || String(e) };
      }
    }
    setResults(next);
    setSending(false);

    const allOk = channels.every((c) => next[c]?.ok);
    if (allOk) toast({ title: 'Teste enviado com sucesso!' });
    else toast({ variant: 'destructive', title: 'Algum envio falhou', description: 'Veja detalhes abaixo.' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Testar template
          </DialogTitle>
          <DialogDescription>
            {eventLabel} — envia a mensagem real com dados de exemplo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Channel selection */}
          <div className="space-y-1.5">
            <Label className="text-xs tracking-wider uppercase font-medium">Canais</Label>
            <div className="flex gap-4">
              <label className={`flex items-center gap-2 text-sm ${available.includes('email') ? '' : 'opacity-40'}`}>
                <Checkbox
                  checked={selected.email}
                  onCheckedChange={() => toggle('email')}
                  disabled={!available.includes('email')}
                />
                <Mail className="h-3.5 w-3.5" /> E-mail
              </label>
              <label className={`flex items-center gap-2 text-sm ${available.includes('whatsapp') ? '' : 'opacity-40'}`}>
                <Checkbox
                  checked={selected.whatsapp}
                  onCheckedChange={() => toggle('whatsapp')}
                  disabled={!available.includes('whatsapp')}
                />
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </label>
            </div>
            {step.channel.includes('push') && (
              <p className="text-xs text-muted-foreground">Push não é suportado neste teste.</p>
            )}
          </div>

          {selected.email && (
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase font-medium">E-mail destino</Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="font-mono text-sm"
              />
              {!recipientEmail.trim() && (
                <p className="text-xs text-destructive">Obrigatório para enviar e-mail.</p>
              )}
            </div>
          )}

          {selected.whatsapp && (
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase font-medium">Telefone (com DDD e país)</Label>
              <Input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="5511987654321"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Formato internacional, ex: 5511987654321</p>
              {!recipientPhone.trim() && (
                <p className="text-xs text-destructive">Obrigatório para enviar WhatsApp.</p>
              )}
            </div>
          )}

          {selected.email && (
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase font-medium">Assunto</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs tracking-wider uppercase font-medium">Mensagem (pré-preenchida)</Label>
            <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">Variáveis substituídas por dados de exemplo (nome: Maria, pedido: PI20260001…).</p>
          </div>

          {Object.entries(results).map(([ch, r]) => (
            <div key={ch} className={`rounded-lg border p-3 text-xs ${r?.ok ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
              <div className="flex items-center gap-2 font-medium mb-1">
                {r?.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                {ch === 'email' ? 'E-mail' : 'WhatsApp'} — {r?.ok ? 'Sucesso' : 'Falhou'}
                {r?.provider && <span className="text-muted-foreground">• {r.provider}</span>}
                {typeof r?.status === 'number' && <span className="text-muted-foreground">• HTTP {r.status}</span>}
              </div>
              {r?.error && <p className="text-destructive">{r.error}</p>}
              {r?.response && <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">{r.response}</pre>}
            </div>
          ))}
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