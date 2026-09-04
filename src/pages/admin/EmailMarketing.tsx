import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Copy, Pencil, Send, Eye, ArrowLeft, Image as ImageIcon, ShoppingBag, Tag, Type, Minus, GripVertical, Save, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaPicker } from '@/components/cms/MediaPicker';
import { useEmailTemplates, useSaveEmailTemplate, useDeleteEmailTemplate, useDuplicateEmailTemplate, useSendTestMarketing, type EmailTemplate } from '@/hooks/useEmailTemplates';
import { useProducts } from '@/hooks/useProducts';
import { buildEmailHtml, newBlock, DEFAULT_SETTINGS, type EmailBlock, type EmailBlockType, type EmailSettings } from '@/lib/emailTemplate';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const PALETTE: { type: EmailBlockType; label: string; icon: any }[] = [
  { type: 'banner', label: 'Banner / Hero', icon: ImageIcon },
  { type: 'products', label: 'Grid de Produtos', icon: ShoppingBag },
  { type: 'coupon', label: 'Cupom', icon: Tag },
  { type: 'cta', label: 'Texto + Botão', icon: Type },
  { type: 'divider', label: 'Divisor', icon: Minus },
];

export default function EmailMarketing() {
  const [editing, setEditing] = useState<EmailTemplate | null | 'new'>(null);
  const { data: templates = [], isLoading } = useEmailTemplates();
  const del = useDeleteEmailTemplate();
  const dup = useDuplicateEmailTemplate();

  if (editing) {
    return <Editor template={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Email Marketing</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie templates visuais para suas campanhas</p>
        </div>
        <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4 mr-2" />Novo template</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : templates.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum template ainda. Crie seu primeiro!
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="overflow-hidden group">
              <div className="aspect-[4/3] bg-muted/40 border-b relative overflow-hidden">
                <iframe
                  title={t.name}
                  srcDoc={buildEmailHtml(t.blocks || [], t.settings || DEFAULT_SETTINGS, '')}
                  className="w-[600px] h-[800px] origin-top-left scale-[0.45] pointer-events-none border-0"
                />
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.subject || 'Sem assunto'}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(t)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => dup.mutate(t)} title="Duplicar">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm('Excluir template?')) del.mutate(t.id); }} title="Excluir">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({ template, onClose }: { template: EmailTemplate | null; onClose: () => void }) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [name, setName] = useState(template?.name || 'Nova campanha');
  const [subject, setSubject] = useState(template?.subject || '');
  const [preheader, setPreheader] = useState(template?.preheader || '');
  const [blocks, setBlocks] = useState<EmailBlock[]>(template?.blocks || []);
  const [settings, setSettings] = useState<EmailSettings>(template?.settings || DEFAULT_SETTINGS);
  const [selected, setSelected] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testEmail, setTestEmail] = useState(user?.email || '');
  const [testOpen, setTestOpen] = useState(false);

  const save = useSaveEmailTemplate();
  const sendTest = useSendTestMarketing();

  const html = useMemo(() => buildEmailHtml(blocks, settings, preheader), [blocks, settings, preheader]);

  const addBlock = (type: EmailBlockType) => {
    const b = newBlock(type);
    setBlocks((bs) => [...bs, b]);
    setSelected(b.id);
  };
  const removeBlock = (id: string) => {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    if (selected === id) setSelected(null);
  };
  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= bs.length) return bs;
      const next = [...bs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const updateBlock = (id: string, content: any) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, content: { ...b.content, ...content } } : b)));
  };

  const handleSave = async () => {
    const saved: any = await save.mutateAsync({ id: template?.id, name, subject, preheader, blocks, settings });
    if (saved) onClose();
  };

  const selectedBlock = blocks.find((b) => b.id === selected) || null;

  const PaletteCol = (
    <div className="space-y-1.5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Adicionar bloco</p>
      {PALETTE.map((p) => (
        <Button key={p.type} variant="outline" size="sm" className="w-full justify-start" onClick={() => addBlock(p.type)}>
          <p.icon className="h-4 w-4 mr-2" />{p.label}
        </Button>
      ))}
      <p className="text-xs uppercase tracking-wider text-muted-foreground mt-6 mb-2">Estilo global</p>
      <div className="space-y-2">
        <ColorField label="Cor primária" value={settings.primaryColor} onChange={(v) => setSettings({ ...settings, primaryColor: v })} />
        <ColorField label="Fundo do email" value={settings.backgroundColor} onChange={(v) => setSettings({ ...settings, backgroundColor: v })} />
        <ColorField label="Fundo do conteúdo" value={settings.contentBackground} onChange={(v) => setSettings({ ...settings, contentBackground: v })} />
      </div>
    </div>
  );

  const PreviewCol = (
    <div className="bg-muted/30 p-4 min-h-[600px] flex justify-center">
      <div className="w-full max-w-[640px]">
        <div className="bg-background border rounded-md mb-3 p-3 space-y-2">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do email" className="font-medium" />
          <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Pré-cabeçalho (texto de pré-visualização)" className="text-sm" />
        </div>
        {blocks.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground text-sm">
            Adicione blocos no painel à esquerda
          </CardContent></Card>
        ) : (
          <div className="space-y-1">
            {blocks.map((b, i) => (
              <div
                key={b.id}
                onClick={() => setSelected(b.id)}
                className={cn(
                  'group relative bg-white border rounded-sm cursor-pointer transition',
                  selected === b.id ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-foreground/30'
                )}
              >
                <iframe
                  title={b.id}
                  srcDoc={buildEmailHtml([b], settings, '')}
                  className="w-full block border-0 pointer-events-none"
                  style={{ height: blockHeightFor(b) }}
                />
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 bg-background/95 border rounded-sm shadow-sm">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveBlock(b.id, -1); }} disabled={i === 0}>↑</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveBlock(b.id, 1); }} disabled={i === blocks.length - 1}>↓</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeBlock(b.id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const PropsCol = (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Propriedades</p>
      {selectedBlock ? (
        <BlockEditor block={selectedBlock} onChange={(c) => updateBlock(selectedBlock.id, c)} />
      ) : (
        <p className="text-sm text-muted-foreground">Clique em um bloco para editar</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="h-4 w-4" /></Button>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="text-lg font-light max-w-md" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4 mr-1.5" />Pré-visualizar</Button>
          <Button variant="outline" size="sm" onClick={() => setTestOpen(true)}><Send className="h-4 w-4 mr-1.5" />Enviar teste</Button>
          <Button size="sm" onClick={handleSave} disabled={save.isPending}><Save className="h-4 w-4 mr-1.5" />Salvar</Button>
        </div>
      </div>

      {isMobile ? (
        <Tabs defaultValue="preview">
          <TabsList className="w-full"><TabsTrigger className="flex-1" value="blocks">Blocos</TabsTrigger><TabsTrigger className="flex-1" value="preview">Preview</TabsTrigger><TabsTrigger className="flex-1" value="props">Propriedades</TabsTrigger></TabsList>
          <TabsContent value="blocks" className="border rounded-md p-3">{PaletteCol}</TabsContent>
          <TabsContent value="preview">{PreviewCol}</TabsContent>
          <TabsContent value="props" className="border rounded-md p-3">{PropsCol}</TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-[220px_1fr_280px] gap-4 items-start">
          <div className="border rounded-md p-3 sticky top-4">{PaletteCol}</div>
          <div className="border rounded-md overflow-hidden">{PreviewCol}</div>
          <div className="border rounded-md p-3 sticky top-4">{PropsCol}</div>
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl h-[80vh] p-0">
          <DialogHeader className="px-6 pt-4"><DialogTitle>Pré-visualização</DialogTitle></DialogHeader>
          <iframe title="preview" srcDoc={html} className="w-full h-full border-0" />
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar email de teste</DialogTitle>
            <DialogDescription>Envia este template para o email informado usando o provedor configurado em Configurações → Integrações.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Email destinatário</Label>
            <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="seu@email.com" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Cancelar</Button>
            <Button onClick={() => sendTest.mutate({ html, subject: subject || name, toEmail: testEmail }, { onSuccess: () => setTestOpen(false) })} disabled={sendTest.isPending || !testEmail}>
              <Send className="h-4 w-4 mr-1.5" />Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function blockHeightFor(b: EmailBlock): number {
  switch (b.type) {
    case 'banner': return b.content?.image ? 380 : 120;
    case 'products': return Math.max(160, Math.ceil((b.content?.products?.length || 0) / 2) * 280 + 60);
    case 'coupon': return 180;
    case 'cta': return 180;
    case 'divider': return 40;
    default: return 100;
  }
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 rounded border cursor-pointer bg-transparent" />
      <div className="flex-1 min-w-0">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-7 text-xs font-mono" />
      </div>
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: EmailBlock; onChange: (c: any) => void }) {
  const c = block.content;
  if (block.type === 'banner') {
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Imagem</Label>
          <MediaPicker value={c.image || ''} onChange={(v) => onChange({ image: v })} />
          {c.image && <img src={c.image} alt="" className="mt-2 w-full rounded border" />}
        </div>
        <Field label="Título" value={c.title} onChange={(v) => onChange({ title: v })} />
        <Field label="Subtítulo" value={c.subtitle} onChange={(v) => onChange({ subtitle: v })} />
        <Field label="URL do link" value={c.linkUrl} onChange={(v) => onChange({ linkUrl: v })} />
        <SelectField label="Alinhamento" value={c.align} options={['left', 'center', 'right']} onChange={(v) => onChange({ align: v })} />
      </div>
    );
  }
  if (block.type === 'products') {
    return (
      <div className="space-y-3">
        <Field label="Título da seção" value={c.title} onChange={(v) => onChange({ title: v })} />
        <ProductPicker selected={c.products || []} onChange={(p) => onChange({ products: p })} />
      </div>
    );
  }
  if (block.type === 'coupon') {
    return (
      <div className="space-y-3">
        <Field label="Código" value={c.code} onChange={(v) => onChange({ code: v.toUpperCase() })} />
        <Field label="Descrição" value={c.description} onChange={(v) => onChange({ description: v })} />
        <Field label="Válido até" value={c.validUntil} onChange={(v) => onChange({ validUntil: v })} placeholder="ex: 31/12/2026" />
        <ColorField label="Cor de destaque" value={c.accentColor || '#111111'} onChange={(v) => onChange({ accentColor: v })} />
      </div>
    );
  }
  if (block.type === 'cta') {
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Texto</Label>
          <Textarea value={c.text || ''} onChange={(e) => onChange({ text: e.target.value })} rows={5} />
        </div>
        <Field label="Texto do botão" value={c.buttonText} onChange={(v) => onChange({ buttonText: v })} />
        <Field label="URL do botão" value={c.buttonUrl} onChange={(v) => onChange({ buttonUrl: v })} />
        <SelectField label="Alinhamento" value={c.align} options={['left', 'center', 'right']} onChange={(v) => onChange({ align: v })} />
      </div>
    );
  }
  if (block.type === 'divider') {
    return (
      <div className="space-y-3">
        <Field label="Altura (px)" value={String(c.height || 16)} onChange={(v) => onChange({ height: parseInt(v) || 16 })} />
      </div>
    );
  }
  return null;
}

function Field({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value?: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select value={value || options[0]} onChange={(e) => onChange(e.target.value)} className="w-full h-9 border rounded-md px-2 text-sm bg-background">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function ProductPicker({ selected, onChange }: { selected: any[]; onChange: (p: any[]) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { data: products = [] } = useProducts();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const toggle = (p: any) => {
    const url = `${baseUrl}/product/${p.handle}`;
    const image = p.images?.[0]?.url || p.image_url || '';
    const price = p.price ? `R$ ${Number(p.price).toFixed(2).replace('.', ',')}` : '';
    const item = { id: p.id, title: p.title, image, price, url };
    const exists = selected.find((s) => s.id === p.id);
    onChange(exists ? selected.filter((s) => s.id !== p.id) : [...selected, item]);
  };

  const filtered = products.filter((p: any) => p.title?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />Selecionar produtos ({selected.length})
      </Button>
      {selected.length > 0 && (
        <div className="space-y-1">
          {selected.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-xs border rounded p-1.5">
              {s.image && <img src={s.image} alt="" className="w-8 h-8 object-cover rounded" />}
              <span className="flex-1 truncate">{s.title}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange(selected.filter((x) => x.id !== s.id))}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Selecionar produtos</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-9" />
          </div>
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pr-3">
              {filtered.map((p: any) => {
                const isSel = !!selected.find((s) => s.id === p.id);
                const img = p.images?.[0]?.url || p.image_url;
                return (
                  <button key={p.id} onClick={() => toggle(p)} className={cn('text-left border rounded p-2 hover:border-primary transition', isSel && 'border-primary bg-primary/5')}>
                    {img && <img src={img} alt="" className="w-full aspect-square object-cover rounded mb-1" />}
                    <div className="text-xs truncate">{p.title}</div>
                    <div className="text-xs font-medium">R$ {Number(p.price || 0).toFixed(2).replace('.', ',')}</div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter><Button onClick={() => setOpen(false)}>Concluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
