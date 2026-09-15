import { useEffect, useState } from 'react';
import { FileCheck2, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

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
};

const EMPTY: FiscalSettings = {
  legal_name: '', trade_name: '', tax_id: '', state_registration: '', municipal_registration: '', tax_regime: '',
  street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '',
  invoice_series: '1', operation_nature: 'Venda de mercadoria', auto_issue_paid_orders: false,
};

const requiredFields: Array<keyof FiscalSettings> = [
  'legal_name', 'tax_id', 'tax_regime', 'street', 'number', 'neighborhood', 'city', 'state', 'zip_code', 'invoice_series', 'operation_nature',
];

export function FiscalTab() {
  const [form, setForm] = useState<FiscalSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from('fiscal_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) setForm({ ...EMPTY, ...data } as FiscalSettings);
      setLoading(false);
    });
  }, []);

  const update = (key: keyof FiscalSettings, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const complete = requiredFields.every((key) => String(form[key] ?? '').trim());

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...form, tax_id: form.tax_id.replace(/\D/g, ''), zip_code: form.zip_code.replace(/\D/g, ''), updated_by: user?.id ?? null };
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
        <div className="sm:col-span-2 flex items-center justify-between gap-4 border-t pt-4">
          <div><Label>Emitir automaticamente após pagamento</Label><p className="text-xs text-muted-foreground mt-1">Só funciona quando toda a validação fiscal estiver concluída.</p></div>
          <Switch checked={form.auto_issue_paid_orders} onCheckedChange={(v) => update('auto_issue_paid_orders', v)} disabled={!complete} />
        </div>
        {!complete && <p className="sm:col-span-2 text-sm text-amber-600">Preencha os campos obrigatórios antes de ativar a emissão automática.</p>}
      </CardContent>
    </Card>
    <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar dados fiscais</Button></div>
  </div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}