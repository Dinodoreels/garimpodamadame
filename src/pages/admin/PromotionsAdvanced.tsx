import { useState } from 'react';
import { Plus, Trash2, Edit2, Loader2, Zap, Tag, Gift, Clock, FileText, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { PromoPageDialog } from '@/components/admin/PromoPageDialog';
import { useAdminPromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion } from '@/hooks/usePromotionsAdvanced';
import { usePromoPages, useDeletePromoPage, useUpdatePromoPage, type PromoPage } from '@/hooks/usePromoPages';
import { useAdminProducts } from '@/hooks/useProductAdmin';
import { toast } from 'sonner';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const typeLabels: Record<string, string> = {
  temporary_price: 'Preço Temporário',
  buy_x_get_y: 'Compre X Leve Y',
  flash_sale: 'Flash Sale',
};
const typeIcons: Record<string, typeof Tag> = {
  temporary_price: Tag,
  buy_x_get_y: Gift,
  flash_sale: Zap,
};

export default function PromotionsAdvanced() {
  const { data: promotions = [], isLoading } = useAdminPromotions();
  const { data: products = [] } = useAdminProducts();
  const createPromo = useCreatePromotion();
  const updatePromo = useUpdatePromotion();
  const deletePromo = useDeletePromotion();

  const { data: pages = [], isLoading: pagesLoading } = usePromoPages();
  const deletePage = useDeletePromoPage();
  const updatePage = useUpdatePromoPage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', type: 'temporary_price', starts_at: '', ends_at: '',
    buy_qty: '2', get_qty: '3',
    products: [] as { product_id: string; promotional_price: string }[],
  });

  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PromoPage | null>(null);

  const resetForm = () => {
    setForm({ title: '', type: 'temporary_price', starts_at: '', ends_at: '', buy_qty: '2', get_qty: '3', products: [] });
    setEditingId(null);
  };

  const openEdit = (promo: any) => {
    setEditingId(promo.id);
    setForm({
      title: promo.title, type: promo.type,
      starts_at: promo.starts_at?.slice(0, 16) || '', ends_at: promo.ends_at?.slice(0, 16) || '',
      buy_qty: promo.config?.buy_qty?.toString() || '2',
      get_qty: promo.config?.get_qty?.toString() || '3',
      products: (promo.promotion_products || []).map((pp: any) => ({
        product_id: pp.product_id,
        promotional_price: pp.promotional_price?.toString() || '',
      })),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.starts_at || !form.ends_at) { toast.error('Preencha os campos obrigatórios'); return; }
    try {
      const config: Record<string, any> = {};
      if (form.type === 'buy_x_get_y') {
        config.buy_qty = parseInt(form.buy_qty);
        config.get_qty = parseInt(form.get_qty);
      }
      const data = {
        title: form.title, type: form.type,
        starts_at: form.starts_at, ends_at: form.ends_at,
        config,
        products: form.products.map(p => ({
          product_id: p.product_id,
          promotional_price: p.promotional_price ? parseFloat(p.promotional_price) : undefined,
        })),
      };
      if (editingId) {
        await updatePromo.mutateAsync({ id: editingId, ...data });
        toast.success('Promoção atualizada!');
      } else {
        await createPromo.mutateAsync(data);
        toast.success('Promoção criada!');
      }
      setDialogOpen(false);
      resetForm();
    } catch (e: any) { toast.error(e.message || 'Erro ao salvar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta promoção?')) return;
    try { await deletePromo.mutateAsync(id); toast.success('Promoção excluída'); } catch { toast.error('Erro ao excluir'); }
  };

  const addProduct = (productId: string) => {
    if (form.products.find(p => p.product_id === productId)) return;
    setForm(f => ({ ...f, products: [...f.products, { product_id: productId, promotional_price: '' }] }));
  };

  const removeProduct = (productId: string) => {
    setForm(f => ({ ...f, products: f.products.filter(p => p.product_id !== productId) }));
  };

  const isActive = (p: any) => {
    const now = new Date().toISOString();
    return p.status === 'active' && p.starts_at <= now && p.ends_at >= now;
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Excluir esta página?')) return;
    try { await deletePage.mutateAsync(id); toast.success('Página excluída'); } catch { toast.error('Erro ao excluir'); }
  };

  const togglePublish = async (page: PromoPage) => {
    try {
      await updatePage.mutateAsync({ id: page.id, is_published: !page.is_published });
      toast.success(page.is_published ? 'Página despublicada' : 'Página publicada!');
    } catch { toast.error('Erro ao atualizar'); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Promoções Avançadas" subtitle="Promoções, flash sales e páginas promocionais" />

      <Tabs defaultValue="promotions">
        <TabsList>
          <TabsTrigger value="promotions"><Zap className="h-4 w-4 mr-1" /> Promoções</TabsTrigger>
          <TabsTrigger value="pages"><FileText className="h-4 w-4 mr-1" /> Páginas</TabsTrigger>
        </TabsList>

        {/* PROMOTIONS TAB */}
        <TabsContent value="promotions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Nova Promoção</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promoção</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma promoção cadastrada</p>
                    </TableCell></TableRow>
                  ) : promotions.map(promo => {
                    const Icon = typeIcons[promo.type] || Tag;
                    return (
                      <TableRow key={promo.id}>
                        <TableCell className="font-medium">{promo.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1"><Icon className="h-3 w-3" />{typeLabels[promo.type] || promo.type}</Badge>
                        </TableCell>
                        <TableCell>{promo.promotion_products?.length || 0}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(promo.starts_at), 'dd/MM HH:mm', { locale: ptBR })} — {format(new Date(promo.ends_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isActive(promo) ? 'default' : 'outline'}>
                            {isActive(promo) ? 'Ativa' : promo.status === 'active' ? 'Agendada' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(promo)}><Edit2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(promo.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAGES TAB */}
        <TabsContent value="pages" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingPage(null); setPageDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Nova Página</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Página</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagesLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : pages.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma página criada</p>
                    </TableCell></TableRow>
                  ) : pages.map(page => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">/promo/{page.slug}</TableCell>
                      <TableCell>{page.product_ids.length}</TableCell>
                      <TableCell>
                        <Badge variant={page.is_published ? 'default' : 'outline'}>
                          {page.is_published ? 'Publicada' : 'Rascunho'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => togglePublish(page)} title={page.is_published ? 'Despublicar' : 'Publicar'}>
                            {page.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          {page.is_published && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={`/promo/${page.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => { setEditingPage(page); setPageDialogOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeletePage(page.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Promotion Dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-light">{editingId ? 'Editar Promoção' : 'Nova Promoção'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2"><Label>Título *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary_price">Preço Temporário</SelectItem>
                  <SelectItem value="buy_x_get_y">Compre X Leve Y</SelectItem>
                  <SelectItem value="flash_sale">Flash Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === 'buy_x_get_y' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Compre</Label><Input type="number" min={1} value={form.buy_qty} onChange={e => setForm(f => ({ ...f, buy_qty: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Leve</Label><Input type="number" min={1} value={form.get_qty} onChange={e => setForm(f => ({ ...f, get_qty: e.target.value }))} /></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Início *</Label><Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Fim *</Label><Input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Produtos da Promoção</Label>
              <Select onValueChange={addProduct}>
                <SelectTrigger><SelectValue placeholder="Adicionar produto..." /></SelectTrigger>
                <SelectContent>
                  {products.filter(p => !form.products.find(fp => fp.product_id === p.id)).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title} — {formatCurrency(p.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.products.map(fp => {
                const p = products.find(pp => pp.id === fp.product_id);
                return (
                  <div key={fp.product_id} className="flex items-center gap-2 border border-border p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{p?.title || fp.product_id}</p>
                      <p className="text-xs text-muted-foreground">Original: {formatCurrency(p?.price || 0)}</p>
                    </div>
                    {(form.type === 'temporary_price' || form.type === 'flash_sale') && (
                      <Input type="number" placeholder="Preço promo" value={fp.promotional_price} onChange={e => setForm(f => ({ ...f, products: f.products.map(x => x.product_id === fp.product_id ? { ...x, promotional_price: e.target.value } : x) }))} className="w-28" />
                    )}
                    <Button size="icon" variant="ghost" onClick={() => removeProduct(fp.product_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createPromo.isPending || updatePromo.isPending}>
              {(createPromo.isPending || updatePromo.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Dialog */}
      <PromoPageDialog open={pageDialogOpen} onOpenChange={setPageDialogOpen} editingPage={editingPage} />
    </div>
  );
}
