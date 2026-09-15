import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle, FileCheck2, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

type FiscalSettings = {
  id?: string;
  legal_name: string;
  trade_name: string;
  tax_id: string;
  state_registration: string;
  municipal_registration: string;
  tax_regime: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  invoice_series: string;
  operation_nature: string;
  auto_issue_paid_orders: boolean;
  fiscal_environment: 'test' | 'live';
  homologation_confirmed_at: string | null;
  production_enabled: boolean;
};

const EMPTY: FiscalSettings = {
  legal_name: '', trade_name: '', tax_id: '', state_registration: '', municipal_registration: '', tax_regime: '',
  street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '',
  invoice_series: '1', operation_nature: 'Venda de mercadoria', auto_issue_paid_orders: false,
  fiscal_environment: 'test', homologation_confirmed_at: null, production_enabled: false,
};

const requiredFields: Array<keyof FiscalSettings> = [
  'legal_name', 'tax_id', 'tax_regime', 'street', 'number', 'neighborhood', 'city', 'state', 'zip_code', 'invoice_series', 'operation_nature',
];

export function FiscalTab() {
  const [form, setForm] = useState<FiscalSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blingReady, setBlingReady] = useState(false);
  const [productStats, setProductStats] = useState({ total: 0, linked: 0, fiscalKnown: 0 });
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      supabase.from('fiscal_settings').select('*').limit(1).maybeSingle(),
      supabase.from('bling_config').select('is_active, access_token, refresh_token, company_name').limit(1).maybeSingle(),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('bling_product_links').select('product_id'),
      supabase.from('bling_import_items').select('local_product_id, bling_data').not('local_product_id', 'is', null),
    ]).then(([settings, bling, products, links, imported]) => {
      if (settings.data) setForm({ ...EMPTY, ...settings.data } as FiscalSettings);
      setBlingReady(Boolean(bling.data?.is_active && bling.data?.access_token && bling.data?.refresh_token && bling.data?.company_name));
      const linked = new Set((links.data ?? []).map((row) => row.product_id)).size;
      const fiscalKnown = new Set((imported.data ?? []).filter((row) => {
        const raw = row.bling_data as Record<string, unknown> | null;
        return raw && String(raw.ncm ?? '').replace(/\D/g, '').length === 8 && raw.origem !== undefined;
      }).map((row) => row.local_product_id)).size;
      setProductStats({ total: products.count ?? 0, linked, fiscalKnown });
      setLoading(false);
    });
  }, []);

  const update = (key: keyof FiscalSettings, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const complete = requiredFields.every((key) => String(form[key] ?? '').trim()) && form.tax_id.replace(/\D/g, '').length === 14;
  const homologated = Boolean(form.homologation_confirmed_at);
  const productionReady = complete && blingReady && productStats.total > 0 && productStats.fiscalKnown === productStats.total && homologated;

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...form, tax_id: form.tax_id.replace(/\D/g, ''), zip_code: form.zip_code.replace(/\D/g, ''), production_enabled: productionReady && form.production_enabled, auto_issue_paid_orders: productionReady && form.production_enabled && form.auto_issue_paid_orders, updated_by: user?.id ?? null };
    const query = form.id
      ? supabase.from('fiscal_settings').update(payload).eq('id', form.id).select().single()
      : supabase.from('fiscal_settings').insert(payload).select().single();
    const { data, error } = await query;
    setSaving(false);
    if (error) return toast({ variant: 'destructive', title: 'Não foi possível salvar', description: error.message });
    setForm({ ...EMPTY, ...data } as FiscalSettings);
    toast({ title: 'Dados fiscais salvos' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return <div className="space-y-6">
    <Alert>
      <FileCheck2 className="h-4 w-4" />
      <AlertTitle>Emissão pelo Bling para o cliente final</AlertTitle>
      <AlertDescription>A nota só será autorizada quando os dados abaixo, os impostos dos produtos e a configuração fiscal do Bling estiverem completos.</AlertDescription>
    </Alert>
    <Card>
      <CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-lg">Prontidão fiscal</CardTitle><CardDescription>Checklist baseado apenas nos dados existentes no sistema.</CardDescription></div><Badge variant={productionReady ? 'default' : 'secondary'}>{form.production_enabled && productionReady ? 'Homologado' : productionReady ? 'Pronto para liberar' : 'Pendente'}</Badge></div></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <ReadinessItem ready={complete} label="Empresa e regras da nota" detail={complete ? 'Campos obrigatórios preenchidos' : 'Preencha e confira os dados abaixo'} />
        <ReadinessItem ready={blingReady} label="Conta do Bling" detail={blingReady ? 'Conectada e identificada' : 'Conecte e teste a empresa emissora'} />
        <ReadinessItem ready={productStats.linked === productStats.total && productStats.total > 0} label="Produtos vinculados" detail={`${productStats.linked} de ${productStats.total} vinculados ao Bling`} />
        <ReadinessItem ready={productStats.fiscalKnown === productStats.total && productStats.total > 0} label="Tributação dos produtos" detail={`${productStats.fiscalKnown} de ${productStats.total} com NCM e origem confirmados na importação`} />
        <ReadinessItem ready={homologated} label="Homologação" detail={homologated ? 'Confirmada pelo administrador' : 'Aguardando validação com contador e Bling'} />
        <ReadinessItem ready={form.production_enabled && productionReady} label="Emissão real" detail={form.production_enabled && productionReady ? 'Liberada explicitamente' : 'Bloqueada com segurança'} />
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle className="text-lg">Empresa emissora</CardTitle><CardDescription>Use exatamente os dados do cadastro fiscal da empresa.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Razão social" value={form.legal_name} onChange={(v) => update('legal_name', v)} />
        <Field label="Nome fantasia" value={form.trade_name} onChange={(v) => update('trade_name', v)} />
        <Field label="CNPJ" value={form.tax_id} onChange={(v) => update('tax_id', v)} />
        <Field label="Inscrição estadual" value={form.state_registration} onChange={(v) => update('state_registration', v)} />
        <Field label="Inscrição municipal" value={form.municipal_registration} onChange={(v) => update('municipal_registration', v)} />
        <div className="space-y-2"><Label>Regime tributário</Label><Select value={form.tax_regime} onValueChange={(v) => update('tax_regime', v)}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="simples_nacional">Simples Nacional</SelectItem><SelectItem value="simples_excesso">Simples Nacional — excesso</SelectItem><SelectItem value="regime_normal">Regime normal</SelectItem></SelectContent></Select></div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle className="text-lg">Endereço de emissão</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Rua" value={form.street} onChange={(v) => update('street', v)} />
        <Field label="Número" value={form.number} onChange={(v) => update('number', v)} />
        <Field label="Complemento" value={form.complement} onChange={(v) => update('complement', v)} />
        <Field label="Bairro" value={form.neighborhood} onChange={(v) => update('neighborhood', v)} />
        <Field label="Cidade" value={form.city} onChange={(v) => update('city', v)} />
        <Field label="UF" value={form.state} onChange={(v) => update('state', v.toUpperCase().slice(0, 2))} />
        <Field label="CEP" value={form.zip_code} onChange={(v) => update('zip_code', v)} />
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle className="text-lg">Regras da nota</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Série" value={form.invoice_series} onChange={(v) => update('invoice_series', v)} />
        <Field label="Natureza da operação" value={form.operation_nature} onChange={(v) => update('operation_nature', v)} />
        <div className="space-y-2"><Label>Ambiente fiscal</Label><Select value={form.fiscal_environment} onValueChange={(v: 'test' | 'live') => update('fiscal_environment', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="test">Teste / homologação</SelectItem><SelectItem value="live" disabled={!homologated}>Produção</SelectItem></SelectContent></Select></div>
        <div className="sm:col-span-2 flex items-start gap-3 border-t pt-4"><Checkbox id="homologated" checked={homologated} onCheckedChange={(checked) => update('homologation_confirmed_at', checked ? new Date().toISOString() : '')} /><div><Label htmlFor="homologated">Contador e Bling validaram as regras fiscais em homologação</Label><p className="mt-1 text-xs text-muted-foreground">Marque somente depois dos testes fiscais reais. O sistema não confirma isso automaticamente.</p></div></div>
        <div className="sm:col-span-2 flex items-start gap-3"><Checkbox id="production" checked={form.production_enabled} disabled={!productionReady || form.fiscal_environment !== 'live'} onCheckedChange={(checked) => update('production_enabled', checked === true)} /><div><Label htmlFor="production">Liberar emissão real</Label><p className="mt-1 text-xs text-muted-foreground">Confirmação explícita do administrador. Enquanto desmarcada, nenhuma NF-e nova será enviada.</p></div></div>
        <div className="sm:col-span-2 flex items-center justify-between gap-4 border-t pt-4">
          <div><Label>Emitir automaticamente após pagamento</Label><p className="text-xs text-muted-foreground mt-1">Só funciona quando toda a validação fiscal estiver concluída.</p></div>
          <Switch checked={form.auto_issue_paid_orders} onCheckedChange={(v) => update('auto_issue_paid_orders', v)} disabled={!productionReady || !form.production_enabled} />
        </div>
        {!productionReady && <p className="sm:col-span-2 text-sm text-amber-600">A emissão continuará bloqueada até todo o checklist estar concluído.</p>}
      </CardContent>
    </Card>
    <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar dados fiscais</Button></div>
  </div>;
}

function ReadinessItem({ ready, label, detail }: { ready: boolean; label: string; detail: string }) {
  const Icon = ready ? CheckCircle2 : AlertTriangle;
  return <div className="flex gap-3 border p-3"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ready ? 'text-primary' : 'text-amber-600'}`} /><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{detail}</p></div></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}