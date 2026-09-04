import { useState } from 'react';
import { Plus, Trash2, Edit2, Loader2, Package, Calendar, Upload, X, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { useAdminKits, useCreateKit, useUpdateKit, useDeleteKit } from '@/hooks/useKits';
import { useAdminProducts } from '@/hooks/useProductAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function Kits() {
  const { data: kits = [], isLoading } = useAdminKits();
  const { data: products = [] } = useAdminProducts();
  const createKit = useCreateKit();
  const updateKit = useUpdateKit();
  const deleteKit = useDeleteKit();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', handle: '', pricing_type: 'fixed' as string,
    fixed_price: '', discount_percent: '', starts_at: '', ends_at: '',
    image_url: '' as string,
    gallery_urls: [] as string[],
    status: 'active' as string,
    is_available: true as boolean,
    items: [] as { product_id: string; quantity: number }[],
  });

  const resetForm = () => {
    setForm({ title: '', description: '', handle: '', pricing_type: 'fixed', fixed_price: '', discount_percent: '', starts_at: '', ends_at: '', image_url: '', gallery_urls: [], status: 'active', is_available: true, items: [] });
    setEditingId(null);
  };

  const openEdit = (kit: any) => {
    setEditingId(kit.id);
    setForm({
      title: kit.title, description: kit.description || '', handle: kit.handle,
      pricing_type: kit.pricing_type, fixed_price: kit.fixed_price?.toString() || '',
      discount_percent: kit.discount_percent?.toString() || '',
      starts_at: kit.starts_at?.slice(0, 16) || '', ends_at: kit.ends_at?.slice(0, 16) || '',
      image_url: kit.image_url || '',
      gallery_urls: Array.isArray(kit.gallery_urls) ? kit.gallery_urls : [],
      status: kit.status || 'active',
      is_available: kit.is_available ?? true,
      items: (kit.product_kit_items || []).map((i: any) => ({ product_id: i.product_id, quantity: i.quantity })),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.handle) { toast.error('Preencha título e handle'); return; }
    if (form.items.length < 1) { toast.error('Adicione ao menos 1 produto ao kit'); return; }
    try {
      const data: any = {
        title: form.title, description: form.description || null, handle: form.handle,
        pricing_type: form.pricing_type,
        fixed_price: form.fixed_price ? parseFloat(form.fixed_price) : null,
        discount_percent: form.discount_percent ? parseFloat(form.discount_percent) : null,
        starts_at: form.starts_at || null, ends_at: form.ends_at || null,
        image_url: form.image_url || null,
        gallery_urls: form.gallery_urls,
        status: form.status,
        is_available: form.is_available,
        items: form.items,
      };
      if (editingId) {
        await updateKit.mutateAsync({ id: editingId, ...data });
        toast.success('Kit atualizado!');
      } else {
        await createKit.mutateAsync(data);
        toast.success('Kit criado!');
      }
      setDialogOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar kit');
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop();
      const path = `kits/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('kit-images').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('kit-images').getPublicUrl(path);
      return pub.publicUrl;
    } catch (e: any) {
      toast.error('Erro ao enviar imagem: ' + (e.message || ''));
      return null;
    }
  };

  const handleCoverChange = async (file: File) => {
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) setForm(f => ({ ...f, image_url: url }));
  };

  const handleGalleryAdd = async (files: FileList) => {
    setUploading(true);
    const urls: string[] = [];
    for (const f of Array.from(files).slice(0, 5 - form.gallery_urls.length)) {
      const u = await uploadImage(f);
      if (u) urls.push(u);
    }
    setUploading(false);
    if (urls.length) setForm(f => ({ ...f, gallery_urls: [...f.gallery_urls, ...urls] }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este kit?')) return;
    try { await deleteKit.mutateAsync(id); toast.success('Kit excluído'); } catch { toast.error('Erro ao excluir'); }
  };

  const addItem = (productId: string) => {
    if (form.items.find(i => i.product_id === productId)) return;
    setForm(f => ({ ...f, items: [...f.items, { product_id: productId, quantity: 1 }] }));
  };

  const removeItem = (productId: string) => {
    setForm(f => ({ ...f, items: f.items.filter(i => i.product_id !== productId) }));
  };

  const updateItemQty = (productId: string, qty: number) => {
    setForm(f => ({ ...f, items: f.items.map(i => i.product_id === productId ? { ...i, quantity: Math.max(1, qty) } : i) }));
  };

  const getItemsTotal = () => {
    return form.items.reduce((sum, item) => {
      const p = products.find(pp => pp.id === item.product_id);
      return sum + (p?.price || 0) * item.quantity;
    }, 0);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:justify-between">
        <AdminPageHeader title="Kits & Combos" subtitle="Monte kits de produtos com preços especiais" />
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Novo Kit</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kit</TableHead>
                <TableHead>Tipo Preço</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kits.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum kit cadastrado</p>
                </TableCell></TableRow>
              ) : kits.map(kit => (
                <TableRow key={kit.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                        {kit.image_url ? (
                          <img src={kit.image_url} alt={kit.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-4 w-4 opacity-50" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p>{kit.title}</p>
                        {!kit.image_url && (
                          <p className="text-[10px] text-amber-600">Sem foto</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {kit.pricing_type === 'fixed' ? `Fixo ${kit.fixed_price ? formatCurrency(kit.fixed_price) : ''}` : `${kit.discount_percent}% desc.`}
                    </Badge>
                  </TableCell>
                  <TableCell>{(kit as any).product_kit_items?.length || 0} itens</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {kit.starts_at ? format(new Date(kit.starts_at), 'dd/MM/yy', { locale: ptBR }) : '∞'} — {kit.ends_at ? format(new Date(kit.ends_at), 'dd/MM/yy', { locale: ptBR }) : '∞'}
                  </TableCell>
                  <TableCell><Badge variant={kit.status === 'active' ? 'default' : 'outline'}>{kit.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(kit)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(kit.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-light">{editingId ? 'Editar Kit' : 'Novo Kit'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, handle: editingId ? f.handle : e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }))} />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>

            {/* Imagem principal */}
            <div className="grid gap-2">
              <Label>Foto principal do Kit</Label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded bg-muted overflow-hidden flex-shrink-0 border border-border/50">
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-chrome hover:underline">
                    <Upload className="h-4 w-4" />
                    {form.image_url ? 'Trocar foto' : 'Enviar foto'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={e => e.target.files?.[0] && handleCoverChange(e.target.files[0])}
                    />
                  </label>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="text-xs text-destructive text-left hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Galeria */}
            <div className="grid gap-2">
              <Label>Galeria (até 5 fotos)</Label>
              <div className="grid grid-cols-5 gap-2">
                {form.gallery_urls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square bg-muted overflow-hidden rounded">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, gallery_urls: f.gallery_urls.filter((_, i) => i !== idx) }))}
                      className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {form.gallery_urls.length < 5 && (
                  <label className="aspect-square border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:bg-muted/50 transition">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploading}
                      onChange={e => e.target.files && handleGalleryAdd(e.target.files)}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Status / Disponibilidade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_available}
                    onCheckedChange={v => setForm(f => ({ ...f, is_available: v }))}
                  />
                  <Label className="text-sm">Disponível para venda</Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo de Preço</Label>
                <Select value={form.pricing_type} onValueChange={v => setForm(f => ({ ...f, pricing_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Preço Fixo</SelectItem>
                    <SelectItem value="discount">Desconto %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.pricing_type === 'fixed' ? (
                <div className="grid gap-2">
                  <Label>Preço do Kit (R$)</Label>
                  <Input type="number" value={form.fixed_price} onChange={e => setForm(f => ({ ...f, fixed_price: e.target.value }))} />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Desconto (%)</Label>
                  <Input type="number" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Início</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Fim</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
              </div>
            </div>

            {/* Products in kit */}
            <div className="space-y-2">
              <Label>Produtos do Kit</Label>
              <Select onValueChange={addItem}>
                <SelectTrigger><SelectValue placeholder="Adicionar produto..." /></SelectTrigger>
                <SelectContent>
                  {products.filter(p => !form.items.find(i => i.product_id === p.id)).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title} — {formatCurrency(p.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.items.map(item => {
                const p = products.find(pp => pp.id === item.product_id);
                return (
                  <div key={item.product_id} className="flex items-center gap-2 border border-border p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{p?.title || item.product_id}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(p?.price || 0)}</p>
                    </div>
                    <Input type="number" min={1} value={item.quantity} onChange={e => updateItemQty(item.product_id, parseInt(e.target.value) || 1)} className="w-16 text-center" />
                    <Button size="icon" variant="ghost" onClick={() => removeItem(item.product_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                );
              })}
              {form.items.length > 0 && (
                <p className="text-xs text-muted-foreground">Total individual: {formatCurrency(getItemsTotal())}
                  {form.pricing_type === 'fixed' && form.fixed_price && ` → Kit: ${formatCurrency(parseFloat(form.fixed_price))}`}
                  {form.pricing_type === 'discount' && form.discount_percent && ` → ${form.discount_percent}% desc. = ${formatCurrency(getItemsTotal() * (1 - parseFloat(form.discount_percent) / 100))}`}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createKit.isPending || updateKit.isPending}>
              {(createKit.isPending || updateKit.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
