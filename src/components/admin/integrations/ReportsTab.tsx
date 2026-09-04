import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIntegrations, useSaveIntegrations, type AdminWhatsAppConfig } from '@/hooks/useIntegrations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, MessageSquare, Calendar, CalendarDays, CalendarRange, Phone, Banknote, Wallet, Clock, Mail, X } from 'lucide-react';

const REPORT_PREVIEW = `📊 *Resumo Diário - 11/04/2026*

💰 *Receita:* R$ 3.450,00 (+12% vs ontem)
🛒 *Pedidos:* 18 | Ticket médio: R$ 191,67
👥 *Novos clientes:* 5

🏆 *Top 5 Produtos:*
1. Camiseta Preta - 8 un (R$ 640) | Estoque: 25
2. Tênis Runner - 4 un (R$ 1.200) | Estoque: 3 ⚠️
3. Boné Classic - 3 un (R$ 270) | Estoque: 42
4. Calça Jeans - 2 un (R$ 540) | Estoque: 15
5. Mochila Urban - 1 un (R$ 290) | Estoque: 8

📦 *Sem vendas no período:* Chinelo Slide, Carteira Slim

👤 *Top Vendedor:* João Silva (7 pedidos)
📱 *Top Canal:* Site (12) | WhatsApp (4) | Loja (2)

⏳ *Pendentes:* 3 pedidos aguardando pagamento`;

export function ReportsTab() {
  const { data: config, isLoading } = useIntegrations();
  const saveIntegrations = useSaveIntegrations();
  const { toast } = useToast();
  const [sending, setSending] = useState<string | null>(null);

  if (isLoading || !config) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const defaultWa = { active_provider: '', evolution: { base_url: '', api_key: '', instance: '' }, zapi: { instance_id: '', token: '' }, wppconnect: { base_url: '', secret_key: '', session: '' }, uazapi: { base_url: 'https://free.uazapi.com', instance_token: '', admin_token: '' }, twilio: { account_sid: '', auth_token: '', phone: '' }, meta: { phone_number_id: '', access_token: '', verify_token: '' }, webhook: { url: '', method: 'POST' as const, bearer_token: '', custom_header_name: '', custom_header_value: '' } };
  const reports = config.admin_reports || { daily_enabled: false, weekly_enabled: false, monthly_enabled: false, whatsapp: defaultWa };
  const hasWhatsApp = !!reports.whatsapp?.active_provider;

  const toggleReport = (key: 'daily_enabled' | 'weekly_enabled' | 'monthly_enabled') => {
    saveIntegrations.mutate({
      ...config,
      admin_reports: { ...reports, [key]: !reports[key] },
    });
  };

  const cashAlerts = reports.cash_register_alerts || { close_register_summary: false, unclosed_register_alert: false, divergence_threshold: 50 };
  const expenseAlerts = reports.expense_due_alerts || { enabled: false, days_before: 3 };
  const emailRecipients: string[] = Array.isArray(reports.email_recipients) ? reports.email_recipients : [];
  const [recipientDraft, setRecipientDraft] = useState('');

  const updateRecipients = (next: string[]) => {
    saveIntegrations.mutate({ ...config, admin_reports: { ...reports, email_recipients: next } });
  };
  const addRecipient = () => {
    const v = recipientDraft.trim().toLowerCase();
    if (!v || !v.includes('@')) return;
    if (emailRecipients.includes(v)) { setRecipientDraft(''); return; }
    updateRecipients([...emailRecipients, v]);
    setRecipientDraft('');
  };
  const removeRecipient = (email: string) => updateRecipients(emailRecipients.filter(e => e !== email));
  const setChannel = (key: 'daily_channel' | 'weekly_channel' | 'monthly_channel' | 'alerts_channel', value: 'whatsapp' | 'email' | 'both') => {
    saveIntegrations.mutate({ ...config, admin_reports: { ...reports, [key]: value } });
  };
  const hasEmail = emailRecipients.length > 0;

  const updateCashAlert = (patch: any) => {
    saveIntegrations.mutate({
      ...config,
      admin_reports: { ...reports, cash_register_alerts: { ...cashAlerts, ...patch } },
    });
  };
  const updateExpenseAlert = (patch: any) => {
    saveIntegrations.mutate({
      ...config,
      admin_reports: { ...reports, expense_due_alerts: { ...expenseAlerts, ...patch } },
    });
  };
  const toggleMonthlyReminder = () => {
    saveIntegrations.mutate({
      ...config,
      admin_reports: { ...reports, monthly_closing_reminder: !reports.monthly_closing_reminder },
    });
  };

  const sendNow = async (period: string) => {
    const channelKey = period === 'weekly' ? 'weekly_channel' : period === 'monthly' ? 'monthly_channel' : 'daily_channel';
    const ch = (reports as any)[channelKey] || 'whatsapp';
    const needsWa = ch === 'whatsapp' || ch === 'both';
    const needsEmail = ch === 'email' || ch === 'both';
    if (needsWa && !hasWhatsApp && !needsEmail) {
      toast({ variant: 'destructive', title: 'Configure WhatsApp ou troque o canal pra Email.' });
      return;
    }
    if (needsEmail && !hasEmail) {
      toast({ variant: 'destructive', title: 'Adicione ao menos um destinatário de email.' });
      return;
    }
    setSending(period);
    try {
      const { data, error } = await supabase.functions.invoke('admin-store-report', {
        body: { period },
      });
      if (error) throw error;
      toast({ title: `Relatório ${period === 'daily' ? 'diário' : period === 'weekly' ? 'semanal' : 'mensal'} enviado!` });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao enviar relatório.' });
    } finally {
      setSending(null);
    }
  };

  const frequencies = [
    { key: 'daily_enabled' as const, label: 'Diário', desc: 'Enviado todos os dias', icon: Calendar, period: 'daily' },
    { key: 'weekly_enabled' as const, label: 'Semanal', desc: 'Enviado toda segunda-feira', icon: CalendarDays, period: 'weekly' },
    { key: 'monthly_enabled' as const, label: 'Mensal', desc: 'Enviado no 1º dia do mês', icon: CalendarRange, period: 'monthly' },
  ];

  return (
    <div className="space-y-6">
      {!hasWhatsApp && !hasEmail && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive font-light">
              ⚠️ Configure um provedor de WhatsApp OU adicione um destinatário de email abaixo para habilitar o envio de relatórios.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Email Recipients */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-light tracking-wide">Emails para Relatórios</CardTitle>
          </div>
          <CardDescription className="font-light">
            Adicione um ou mais endereços que devem receber relatórios e alertas por email. Domínio remetente: <code className="text-xs">notify.storenataliapardal.com</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={recipientDraft}
              onChange={(e) => setRecipientDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(); } }}
            />
            <Button type="button" variant="outline" onClick={addRecipient}>Adicionar</Button>
          </div>
          {emailRecipients.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum email cadastrado ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {emailRecipients.map((e) => (
                <Badge key={e} variant="secondary" className="text-xs font-light gap-1 pr-1">
                  {e}
                  <button type="button" onClick={() => removeRecipient(e)} className="ml-1 hover:bg-muted rounded p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-light tracking-wide">Relatórios Automáticos</CardTitle>
          </div>
          <CardDescription className="font-light">
            Receba resumos periódicos por WhatsApp, Email ou os dois.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {frequencies.map(f => {
            const channelKey: 'daily_channel' | 'weekly_channel' | 'monthly_channel' = f.period === 'weekly' ? 'weekly_channel' : f.period === 'monthly' ? 'monthly_channel' : 'daily_channel';
            const currentChannel = ((reports as any)[channelKey] || 'whatsapp') as 'whatsapp' | 'email' | 'both';
            const canSend = (currentChannel === 'whatsapp' && hasWhatsApp) || (currentChannel === 'email' && hasEmail) || (currentChannel === 'both' && (hasWhatsApp || hasEmail));
            return (
              <div key={f.key} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <f.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={reports[f.key]}
                    onCheckedChange={() => toggleReport(f.key)}
                    disabled={!hasWhatsApp && !hasEmail}
                  />
                </div>
                <div className="flex items-center gap-2 pl-8">
                  <Label className="text-xs text-muted-foreground">Canal:</Label>
                  <Select value={currentChannel} onValueChange={(v) => setChannel(channelKey, v as any)}>
                    <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="both">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs ml-auto"
                    disabled={!canSend || sending === f.period}
                    onClick={() => sendNow(f.period)}
                  >
                    {sending === f.period ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                    Enviar agora
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-light tracking-wide">Alertas de Caixa & Contabilidade</CardTitle>
          </div>
          <CardDescription className="font-light">
            Avisos automáticos sobre fechamento de caixa, despesas e fechamento mensal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Label className="text-sm">Canal dos alertas:</Label>
            <Select value={(reports as any).alerts_channel || 'whatsapp'} onValueChange={(v) => setChannel('alerts_channel', v as any)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="both">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Banknote className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Resumo ao fechar caixa</p>
                <p className="text-xs text-muted-foreground">Envia vendas, sangrias e diferença logo após o fechamento.</p>
              </div>
            </div>
            <Switch checked={!!cashAlerts.close_register_summary} disabled={!hasWhatsApp} onCheckedChange={(v) => updateCashAlert({ close_register_summary: v })} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Caixa aberto há mais de 14h</p>
                <p className="text-xs text-muted-foreground">Avisa o admin se um caixa ficou aberto durante a noite.</p>
              </div>
            </div>
            <Switch checked={!!cashAlerts.unclosed_register_alert} disabled={!hasWhatsApp} onCheckedChange={(v) => updateCashAlert({ unclosed_register_alert: v })} />
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <Label className="text-sm font-medium">Alerta de divergência (R$)</Label>
            <p className="text-xs text-muted-foreground">Envia alerta extra quando a diferença de fechamento ultrapassar esse valor (0 = desligado).</p>
            <Input
              type="number"
              min="0"
              step="1"
              value={cashAlerts.divergence_threshold ?? 50}
              onChange={(e) => updateCashAlert({ divergence_threshold: Number(e.target.value) || 0 })}
              className="max-w-[160px]"
              disabled={!hasWhatsApp}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Despesas a vencer</p>
                <p className="text-xs text-muted-foreground">Resumo diário de contas a pagar.</p>
              </div>
            </div>
            <Switch checked={!!expenseAlerts.enabled} disabled={!hasWhatsApp} onCheckedChange={(v) => updateExpenseAlert({ enabled: v })} />
          </div>
          {expenseAlerts.enabled && (
            <div className="rounded-lg border p-4 space-y-2">
              <Label className="text-sm font-medium">Avisar quantos dias antes do vencimento</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={expenseAlerts.days_before ?? 3}
                onChange={(e) => updateExpenseAlert({ days_before: Number(e.target.value) || 1 })}
                className="max-w-[160px]"
                disabled={!hasWhatsApp}
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <CalendarRange className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Lembrete de fechamento mensal</p>
                <p className="text-xs text-muted-foreground">No dia 1º, lembra você de fechar o estoque/contabilidade do mês anterior.</p>
              </div>
            </div>
            <Switch checked={!!reports.monthly_closing_reminder} disabled={!hasWhatsApp} onCheckedChange={toggleMonthlyReminder} />
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Config for Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-light tracking-wide">WhatsApp para Relatórios</CardTitle>
          </div>
          <CardDescription className="font-light">
            Configure um número de WhatsApp exclusivo para enviar relatórios aos admins (diferente do usado para clientes).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Provedor</Label>
            <Select
              value={reports.whatsapp?.active_provider || ''}
              onValueChange={(v) => {
                const wa = { ...reports.whatsapp, active_provider: v };
                saveIntegrations.mutate({ ...config, admin_reports: { ...reports, whatsapp: wa as AdminWhatsAppConfig } });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione o provedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="evolution">Evolution API</SelectItem>
                <SelectItem value="zapi">Z-API</SelectItem>
                <SelectItem value="wppconnect">WPPConnect</SelectItem>
                <SelectItem value="uazapi">UAZAPI</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="meta">Meta (API Oficial)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reports.whatsapp?.active_provider === 'evolution' && (
            <div className="grid gap-3">
              <Input placeholder="Base URL" value={reports.whatsapp.evolution?.base_url || ''} onChange={(e) => saveIntegrations.mutate({ ...config, admin_reports: { ...reports, whatsapp: { ...reports.whatsapp, evolution: { ...reports.whatsapp.evolution, base_url: e.target.value } } as AdminWhatsAppConfig } })} />
              <Input placeholder="API Key" value={reports.whatsapp.evolution?.api_key || ''} onChange={(e) => saveIntegrations.mutate({ ...config, admin_reports: { ...reports, whatsapp: { ...reports.whatsapp, evolution: { ...reports.whatsapp.evolution, api_key: e.target.value } } as AdminWhatsAppConfig } })} />
              <Input placeholder="Instance" value={reports.whatsapp.evolution?.instance || ''} onChange={(e) => saveIntegrations.mutate({ ...config, admin_reports: { ...reports, whatsapp: { ...reports.whatsapp, evolution: { ...reports.whatsapp.evolution, instance: e.target.value } } as AdminWhatsAppConfig } })} />
            </div>
          )}

          {reports.whatsapp?.active_provider === 'zapi' && (
            <div className="grid gap-3">
              <Input placeholder="Instance ID" value={reports.whatsapp.zapi?.instance_id || ''} onChange={(e) => saveIntegrations.mutate({ ...config, admin_reports: { ...reports, whatsapp: { ...reports.whatsapp, zapi: { ...reports.whatsapp.zapi, instance_id: e.target.value } } as AdminWhatsAppConfig } })} />
              <Input placeholder="Token" value={reports.whatsapp.zapi?.token || ''} onChange={(e) => saveIntegrations.mutate({ ...config, admin_reports: { ...reports, whatsapp: { ...reports.whatsapp, zapi: { ...reports.whatsapp.zapi, token: e.target.value } } as AdminWhatsAppConfig } })} />
            </div>
          )}

          {reports.whatsapp?.active_provider === 'uazapi' && (
            <div className="grid gap-3">
              <Input placeholder="URL Base (ex: https://free.uazapi.com)" value={reports.whatsapp.uazapi?.base_url || ''} onChange={(e) => saveIntegrations.mutate({ ...config, admin_reports: { ...reports, whatsapp: { ...reports.whatsapp, uazapi: { ...reports.whatsapp.uazapi, base_url: e.target.value } } as AdminWhatsAppConfig } })} />
              <Input placeholder="Token da Instância" value={reports.whatsapp.uazapi?.instance_token || ''} onChange={(e) => saveIntegrations.mutate({ ...config, admin_reports: { ...reports, whatsapp: { ...reports.whatsapp, uazapi: { ...reports.whatsapp.uazapi, instance_token: e.target.value } } as AdminWhatsAppConfig } })} />
            </div>
          )}

          {reports.whatsapp?.active_provider === 'meta' && (
            <div className="grid gap-3">
              <Input placeholder="Phone Number ID" value={reports.whatsapp.meta?.phone_number_id || ''} onChange={(e) => saveIntegrations.mutate({ ...config, admin_reports: { ...reports, whatsapp: { ...reports.whatsapp, meta: { ...reports.whatsapp.meta, phone_number_id: e.target.value } } as AdminWhatsAppConfig } })} />
              <Input placeholder="Access Token" value={reports.whatsapp.meta?.access_token || ''} onChange={(e) => saveIntegrations.mutate({ ...config, admin_reports: { ...reports, whatsapp: { ...reports.whatsapp, meta: { ...reports.whatsapp.meta, access_token: e.target.value } } as AdminWhatsAppConfig } })} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-light tracking-wide">Preview da Mensagem</CardTitle>
          <CardDescription className="font-light">Exemplo do formato do resumo enviado.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg font-mono leading-relaxed">
            {REPORT_PREVIEW}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light tracking-wide">Conteúdo do Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              'Receita total', 'Comparação com período anterior', 'Quantidade de pedidos',
              'Ticket médio', 'Top 5 produtos', 'Estoque dos top produtos',
              'Produtos sem vendas', 'Top vendedor', 'Top canal de venda',
              'Pedidos pendentes', 'Novos clientes',
            ].map(item => (
              <Badge key={item} variant="secondary" className="text-xs font-light">{item}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
