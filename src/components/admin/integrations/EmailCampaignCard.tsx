import { useEffect, useState } from 'react';
import { Megaphone, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useSiteContent } from '@/hooks/useSiteContent';

interface EmailCampaign {
  enabled?: boolean;
  headline?: string;
  code?: string;
  description?: string;
}

export function EmailCampaignCard() {
  const { data, isLoading, save, saving } = useSiteContent<EmailCampaign>('email_campaign');
  const [form, setForm] = useState<EmailCampaign>({ enabled: false, headline: '', code: '', description: '' });

  useEffect(() => {
    if (data) setForm({ enabled: !!data.enabled, headline: data.headline ?? '', code: data.code ?? '', description: data.description ?? '' });
  }, [data]);

  const handleSave = () => save({
    enabled: !!form.enabled,
    headline: (form.headline ?? '').trim(),
    code: (form.code ?? '').trim(),
    description: (form.description ?? '').trim(),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2"><Megaphone className="h-4 w-4" /></div>
            <div>
              <CardTitle className="text-base">Campanha nos e-mails</CardTitle>
              <CardDescription className="mt-1">
                Texto fixo de cupom/desconto exibido no rodapé de todos os e-mails (auth, pedidos, comprovantes). Se desligado, mostra automaticamente o cupom ativo mais recente.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Label htmlFor="campaign-enabled" className="text-xs text-muted-foreground">Mostrar</Label>
            <Switch id="campaign-enabled" checked={!!form.enabled} onCheckedChange={v => setForm(p => ({ ...p, enabled: v }))} disabled={isLoading} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="campaign-headline">Chamada da campanha</Label>
          <Input
            id="campaign-headline"
            placeholder="Ex.: 10% OFF na primeira compra com o cupom **BEMVINDA**"
            value={form.headline ?? ''}
            onChange={e => setForm(p => ({ ...p, headline: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">Use <code>**texto**</code> para deixar em negrito.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-code">Código do cupom (opcional)</Label>
            <Input
              id="campaign-code"
              placeholder="BEMVINDA10"
              value={form.code ?? ''}
              onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-description">Validade / observação</Label>
            <Input
              id="campaign-description"
              placeholder="Válido até 30/06"
              value={form.description ?? ''}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar campanha
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}