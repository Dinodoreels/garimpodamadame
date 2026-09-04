import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, Scale } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSiteContent } from '@/hooks/useSiteContent';

export interface LegalSection {
  title: string;
  content: string;
}

export interface LegalDocument {
  page_title: string;
  subtitle: string;
  last_updated: string;
  sections: LegalSection[];
}

const emptyDoc: LegalDocument = {
  page_title: '',
  subtitle: '',
  last_updated: '',
  sections: [{ title: '', content: '' }],
};

const DEFAULT_TERMS: LegalDocument = {
  page_title: 'Termos de Uso e Condições Gerais',
  subtitle: 'VANGUARD STORE',
  last_updated: '30/01/2026',
  sections: [
    {
      title: '1. Aceitação Integral e Natureza Contratual',
      content: 'Ao acessar, navegar, cadastrar-se ou realizar qualquer compra no site Vanguard Store, o usuário declara, de forma livre, consciente e inequívoca, que leu integralmente estes Termos de Uso, compreendeu todas as cláusulas, concorda com todas as condições e possui capacidade civil plena para contratar.',
    },
    {
      title: '2. Definições',
      content: 'Para fins deste documento, Site refere-se à plataforma digital acessível por meio do domínio oficial da Vanguard Store.',
    },
  ],
};

const DEFAULT_PRIVACY: LegalDocument = {
  page_title: 'Política de Privacidade e Proteção de Dados',
  subtitle: 'VANGUARD STORE',
  last_updated: '30/01/2026',
  sections: [
    {
      title: '1. Aceitação e Ciência do Titular',
      content: 'Ao acessar, navegar, cadastrar-se ou realizar compras no site Vanguard Store, o titular dos dados declara que leu integralmente esta Política de Privacidade e concorda com o tratamento de seus dados pessoais.',
    },
  ],
};

const DEFAULT_COOKIES: LegalDocument = {
  page_title: 'Política de Cookies',
  subtitle: 'VANGUARD STORE',
  last_updated: '30/01/2026',
  sections: [
    {
      title: '1. O que são Cookies',
      content: 'Cookies são pequenos arquivos de texto armazenados no dispositivo do usuário quando ele acessa o site Vanguard Store.',
    },
  ],
};

function LegalDocEditor({ settingsKey, label, defaultDoc }: { settingsKey: string; label: string; defaultDoc?: LegalDocument }) {
  const { data, isLoading, save, saving } = useSiteContent<LegalDocument>(settingsKey);
  const [form, setForm] = useState<LegalDocument>(defaultDoc || emptyDoc);

  useEffect(() => {
    if (data && data.sections?.length) {
      setForm({ ...emptyDoc, ...data, sections: data.sections });
    } else if (defaultDoc) {
      setForm(defaultDoc);
    }
  }, [data]);

  const updateField = (field: keyof Omit<LegalDocument, 'sections'>, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const updateSection = (index: number, field: keyof LegalSection, value: string) => {
    setForm(prev => {
      const sections = [...prev.sections];
      sections[index] = { ...sections[index], [field]: value };
      return { ...prev, sections };
    });
  };

  const addSection = () =>
    setForm(prev => ({ ...prev, sections: [...prev.sections, { title: '', content: '' }] }));

  const removeSection = (index: number) =>
    setForm(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Informações Gerais</h3>
          <div>
            <Label>Título da Página</Label>
            <Input value={form.page_title} onChange={e => updateField('page_title', e.target.value)} placeholder="Ex: Termos de Uso e Condições Gerais" />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Input value={form.subtitle} onChange={e => updateField('subtitle', e.target.value)} placeholder="Ex: VANGUARD STORE" />
          </div>
          <div>
            <Label>Data de Atualização</Label>
            <Input value={form.last_updated} onChange={e => updateField('last_updated', e.target.value)} placeholder="Ex: 30/01/2026" />
          </div>
        </CardContent>
      </Card>

      {form.sections.map((section, index) => (
        <Card key={index}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground">Seção {index + 1}</h3>
              {form.sections.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeSection(index)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              )}
            </div>
            <div>
              <Label>Título</Label>
              <Input value={section.title} onChange={e => updateSection(index, 'title', e.target.value)} placeholder="Ex: 1. Aceitação Integral" />
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                value={section.content}
                onChange={e => updateSection(index, 'content', e.target.value)}
                placeholder="Conteúdo da seção... Use linhas em branco para separar parágrafos."
                rows={6}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addSection} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Seção
      </Button>

      <Button onClick={() => save(form)} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar {label}
      </Button>
    </div>
  );
}

export function LegalTab() {
  return (
    <Tabs defaultValue="terms">
      <TabsList>
        <TabsTrigger value="terms">Termos de Uso</TabsTrigger>
        <TabsTrigger value="privacy">Privacidade</TabsTrigger>
        <TabsTrigger value="cookies">Cookies</TabsTrigger>
      </TabsList>

      <TabsContent value="terms" className="mt-6">
        <LegalDocEditor settingsKey="legal_terms" label="Termos de Uso" defaultDoc={DEFAULT_TERMS} />
      </TabsContent>

      <TabsContent value="privacy" className="mt-6">
        <LegalDocEditor settingsKey="legal_privacy" label="Privacidade" defaultDoc={DEFAULT_PRIVACY} />
      </TabsContent>

      <TabsContent value="cookies" className="mt-6">
        <LegalDocEditor settingsKey="legal_cookies" label="Cookies" defaultDoc={DEFAULT_COOKIES} />
      </TabsContent>
    </Tabs>
  );
}
