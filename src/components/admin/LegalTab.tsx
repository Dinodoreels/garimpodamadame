import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSiteContent } from '@/hooks/useSiteContent';
import { DEFAULT_COOKIES, DEFAULT_PRIVACY, DEFAULT_TERMS, EMPTY_LEGAL_ENTITY, LegalDocument, LegalEntity, LegalSection } from '@/lib/legalContent';
import { toast } from 'sonner';

const documentKey = (settingsKey: string) => settingsKey.replace('legal_', '') as 'terms' | 'privacy' | 'cookies';

function LegalDocEditor({ settingsKey, label, defaultDoc }: { settingsKey: string; label: string; defaultDoc: LegalDocument }) {
  const { user } = useAuth();
  const { data, isLoading, save, saving } = useSiteContent<LegalDocument>(settingsKey);
  const [form, setForm] = useState(defaultDoc);

  useEffect(() => { setForm(data?.sections?.length ? { ...defaultDoc, ...data } : defaultDoc); }, [data, defaultDoc]);
  const updateField = (field: keyof Omit<LegalDocument, 'sections'>, value: string) => setForm(prev => ({ ...prev, [field]: value }));
  const updateSection = (index: number, field: keyof LegalSection, value: string) => setForm(prev => ({ ...prev, sections: prev.sections.map((section, i) => i === index ? { ...section, [field]: value } : section) }));

  const handleSave = async () => {
    if (!form.version.trim()) return toast.error('Informe a versão do documento.');
    const { error } = await supabase.from('legal_document_versions').insert({
      document_key: documentKey(settingsKey), version: form.version, title: form.page_title,
      content: form as any, created_by: user?.id, effective_at: new Date().toISOString(),
    });
    if (error?.code === '23505') return toast.error('Esta versão já existe. Informe uma nova versão para preservar o histórico.');
    if (error) return toast.error('Não foi possível criar o histórico desta versão.');
    save(form);
  };

  if (isLoading) return <Loader2 className="m-12 h-8 w-8 animate-spin" />;
  return <div className="max-w-3xl space-y-6">
    <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Revisão jurídica obrigatória</AlertTitle><AlertDescription>Este é um texto-base técnico. Preencha os dados oficiais e encaminhe cada versão para revisão profissional.</AlertDescription></Alert>
    <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Título</Label><Input value={form.page_title} onChange={e => updateField('page_title', e.target.value)} /></div>
      <div><Label>Marca</Label><Input value={form.subtitle} onChange={e => updateField('subtitle', e.target.value)} /></div>
      <div><Label>Versão</Label><Input value={form.version} onChange={e => updateField('version', e.target.value)} /></div>
      <div><Label>Vigência</Label><Input value={form.effective_at} onChange={e => updateField('effective_at', e.target.value)} /></div>
      <div><Label>Última atualização</Label><Input value={form.last_updated} onChange={e => updateField('last_updated', e.target.value)} /></div>
    </CardContent></Card>
    {form.sections.map((section, index) => <Card key={`${section.title}-${index}`}><CardContent className="space-y-4 pt-6">
      <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Seção {index + 1}</span>{form.sections.length > 1 && <Button variant="ghost" size="sm" onClick={() => setForm(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }))}><Trash2 className="h-4 w-4" /></Button>}</div>
      <Input value={section.title} onChange={e => updateSection(index, 'title', e.target.value)} placeholder="Título" />
      <Textarea value={section.content} onChange={e => updateSection(index, 'content', e.target.value)} rows={8} />
    </CardContent></Card>)}
    <Button variant="outline" className="w-full" onClick={() => setForm(prev => ({ ...prev, sections: [...prev.sections, { title: '', content: '' }] }))}><Plus className="mr-2 h-4 w-4" />Adicionar seção</Button>
    <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar e registrar versão de {label}</Button>
  </div>;
}

function LegalEntityEditor() {
  const { data, isLoading, save, saving } = useSiteContent<LegalEntity>('legal_entity');
  const [form, setForm] = useState(EMPTY_LEGAL_ENTITY);
  useEffect(() => { if (data) setForm({ ...EMPTY_LEGAL_ENTITY, ...data }); }, [data]);
  if (isLoading) return <Loader2 className="m-12 h-8 w-8 animate-spin" />;
  const fields: Array<[keyof LegalEntity, string, string]> = [['trade_name','Nome comercial','O Garimpo Digital'],['legal_name','Razão social ou nome civil','Obrigatório'],['tax_id','CNPJ ou CPF','Obrigatório'],['address','Endereço legal completo','Obrigatório'],['legal_email','Email jurídico/atendimento','Obrigatório'],['privacy_email','Email de privacidade/LGPD','Obrigatório'],['dpo_name','Encarregado ou canal responsável','Nome real ou canal oficial']];
  return <div className="max-w-2xl space-y-4"><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Não publique dados inventados</AlertTitle><AlertDescription>Use somente informações oficiais da responsável pela loja.</AlertDescription></Alert><Card><CardContent className="space-y-4 pt-6">{fields.map(([key,label,placeholder]) => <div key={key}><Label>{label}</Label><Input value={form[key]} placeholder={placeholder} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} /></div>)}<Button disabled={saving} onClick={() => save(form)}><Save className="mr-2 h-4 w-4" />Salvar dados oficiais</Button></CardContent></Card></div>;
}

function ConsentAudit() {
  const [items, setItems] = useState<Array<{ id: string; user_id: string; document_key: string; document_version: string; source: string; accepted_at: string }>>([]);
  const [cookies, setCookies] = useState<Array<{ id: string; user_id: string | null; policy_version: string; action: string; analytics: boolean; marketing: boolean; created_at: string }>>([]);
  const [versions, setVersions] = useState<Array<{ id: string; document_key: string; version: string; effective_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([
    supabase.from('user_legal_consents').select('id,user_id,document_key,document_version,source,accepted_at').order('accepted_at', { ascending: false }).limit(500),
    supabase.from('cookie_consent_log').select('id,user_id,policy_version,action,analytics,marketing,created_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('legal_document_versions').select('id,document_key,version,effective_at').order('effective_at', { ascending: false }).limit(100),
  ]).then(([legal, cookie, history]) => { setItems(legal.data ?? []); setCookies(cookie.data ?? []); setVersions(history.data ?? []); setLoading(false); }); }, []);
  if (loading) return <Loader2 className="h-6 w-6 animate-spin" />;
  return <div className="space-y-6"><Card><CardHeader><CardTitle>Versões publicadas</CardTitle></CardHeader><CardContent>{versions.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma versão salva pelo painel.</p> : versions.map(item => <p key={item.id} className="border-b py-2 text-sm">{item.document_key} · versão {item.version} · {new Date(item.effective_at).toLocaleString('pt-BR')}</p>)}</CardContent></Card><Card><CardHeader><CardTitle>Histórico de aceites</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Documento</TableHead><TableHead>Versão</TableHead><TableHead>Origem</TableHead><TableHead>Data</TableHead></TableRow></TableHeader><TableBody>{items.map(item => <TableRow key={item.id}><TableCell className="font-mono text-xs">{item.user_id}</TableCell><TableCell>{item.document_key}</TableCell><TableCell>{item.document_version}</TableCell><TableCell>{item.source}</TableCell><TableCell>{new Date(item.accepted_at).toLocaleString('pt-BR')}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card><Card><CardHeader><CardTitle>Histórico de cookies</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Usuário/sessão</TableHead><TableHead>Versão</TableHead><TableHead>Ação</TableHead><TableHead>Analytics</TableHead><TableHead>Marketing</TableHead><TableHead>Data</TableHead></TableRow></TableHeader><TableBody>{cookies.map(item => <TableRow key={item.id}><TableCell className="font-mono text-xs">{item.user_id || 'visitante'}</TableCell><TableCell>{item.policy_version}</TableCell><TableCell>{item.action}</TableCell><TableCell>{item.analytics ? 'Sim' : 'Não'}</TableCell><TableCell>{item.marketing ? 'Sim' : 'Não'}</TableCell><TableCell>{new Date(item.created_at).toLocaleString('pt-BR')}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>;
}

export function LegalTab() {
  return <Tabs defaultValue="entity"><TabsList className="h-auto flex-wrap"><TabsTrigger value="entity">Dados legais</TabsTrigger><TabsTrigger value="terms">Termos</TabsTrigger><TabsTrigger value="privacy">Privacidade</TabsTrigger><TabsTrigger value="cookies">Cookies</TabsTrigger><TabsTrigger value="audit">Aceites</TabsTrigger></TabsList><TabsContent value="entity" className="mt-6"><LegalEntityEditor /></TabsContent><TabsContent value="terms" className="mt-6"><LegalDocEditor settingsKey="legal_terms" label="Termos" defaultDoc={DEFAULT_TERMS} /></TabsContent><TabsContent value="privacy" className="mt-6"><LegalDocEditor settingsKey="legal_privacy" label="Privacidade" defaultDoc={DEFAULT_PRIVACY} /></TabsContent><TabsContent value="cookies" className="mt-6"><LegalDocEditor settingsKey="legal_cookies" label="Cookies" defaultDoc={DEFAULT_COOKIES} /></TabsContent><TabsContent value="audit" className="mt-6"><ConsentAudit /></TabsContent></Tabs>;
}