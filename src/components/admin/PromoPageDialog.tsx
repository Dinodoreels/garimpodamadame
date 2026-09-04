import { useState, useEffect } from 'react';
import { Loader2, Trash2, Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAdminProducts } from '@/hooks/useProductAdmin';
import { useAdminPromotions } from '@/hooks/usePromotionsAdvanced';
import { useCreatePromoPage, useUpdatePromoPage, type PromoPage } from '@/hooks/usePromoPages';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPage?: PromoPage | null;
}

export function PromoPageDialog({ open, onOpenChange, editingPage }: Props) {
  const { data: products = [] } = useAdminProducts();
  const { data: promotions = [] } = useAdminPromotions();
  const createPage = useCreatePromoPage();
  const updatePage = useUpdatePromoPage();

  const [form, setForm] = useState({
    title: '',
    slug: '',
    hero_image: '',
    hero_title: '',
    hero_subtitle: '',
    show_hero_text: true,
    promotion_id: '' as string,
    is_published: false,
    banner_images: [] as string[],
    product_ids: [] as string[],
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (editingPage) {
      setForm({
        title: editingPage.title,
        slug: editingPage.slug,
        hero_image: editingPage.hero_image || '',
        hero_title: editingPage.hero_title || '',
        hero_subtitle: editingPage.hero_subtitle || '',
        show_hero_text: editingPage.show_hero_text,
        promotion_id: editingPage.promotion_id || '',
        is_published: editingPage.is_published,
        banner_images: editingPage.banner_images,
        product_ids: editingPage.product_ids,
      });
    } else {
      setForm({
        title: '', slug: '', hero_image: '', hero_title: '', hero_subtitle: '',
        show_hero_text: true, promotion_id: '', is_published: false,
        banner_images: [], product_ids: [],
      });
    }
  }, [editingPage, open]);

  const generateSlug = (title: string) => {
    return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `promo-pages/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('banners').upload(path, file);
    if (error) { toast.error('Erro ao fazer upload'); return null; }
    const { data } = supabase.storage.from('banners').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    if (url) setForm(f => ({ ...f, hero_image: url }));
    setUploading(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    if (url) setForm(f => ({ ...f, banner_images: [...f.banner_images, url] }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) { toast.error('Preencha título e slug'); return; }
    try {
      const payload = {
        ...form,
        promotion_id: form.promotion_id || null,
        hero_image: form.hero_image || null,
        hero_title: form.hero_title || null,
        hero_subtitle: form.hero_subtitle || null,
      };
      if (editingPage) {
        await updatePage.mutateAsync({ id: editingPage.id, ...payload });
        toast.success('Página atualizada!');
      } else {
        await createPage.mutateAsync(payload);
        toast.success('Página criada!');
      }
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message || 'Erro ao salvar'); }
  };

  const addProduct = (id: string) => {
    if (!form.product_ids.includes(id)) {
      setForm(f => ({ ...f, product_ids: [...f.product_ids, id] }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingPage ? 'Editar Página' : 'Nova Página Promocional'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>Título *</Label>
            <Input value={form.title} onChange={e => {
              const title = e.target.value;
              setForm(f => ({ ...f, title, ...(!editingPage ? { slug: generateSlug(title) } : {}) }));
            }} />
          </div>
          <div className="grid gap-2">
            <Label>Slug *</Label>
            <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="ex: black-friday" />
            <p className="text-xs text-muted-foreground">URL: /promo/{form.slug || '...'}</p>
          </div>

          {/* Hero */}
          <div className="grid gap-2">
            <Label>Imagem Hero</Label>
            {form.hero_image ? (
              <div className="relative">
                <img src={form.hero_image} className="w-full h-32 object-cover rounded" alt="Hero" />
                <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={() => setForm(f => ({ ...f, hero_image: '' }))}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center border-2 border-dashed rounded h-24 cursor-pointer hover:bg-muted/50">
                <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-5 w-5 mr-2 text-muted-foreground" /><span className="text-sm text-muted-foreground">Upload hero</span></>}
              </label>
            )}
          </div>
          <div className="grid gap-2"><Label>Título Hero</Label><Input value={form.hero_title} onChange={e => setForm(f => ({ ...f, hero_title: e.target.value }))} /></div>
          <div className="grid gap-2"><Label>Subtítulo Hero</Label><Input value={form.hero_subtitle} onChange={e => setForm(f => ({ ...f, hero_subtitle: e.target.value }))} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={form.show_hero_text} onCheckedChange={v => setForm(f => ({ ...f, show_hero_text: v }))} />
            <Label>Exibir textos no hero</Label>
          </div>

          {/* Promotion link */}
          <div className="grid gap-2">
            <Label>Vincular a promoção (opcional)</Label>
            <Select value={form.promotion_id} onValueChange={v => setForm(f => ({ ...f, promotion_id: v === '_none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Nenhuma</SelectItem>
                {promotions.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Banners */}
          <div className="space-y-2">
            <Label>Banners extras</Label>
            <div className="flex flex-wrap gap-2">
              {form.banner_images.map((url, i) => (
                <div key={i} className="relative w-24 h-16">
                  <img src={url} className="w-full h-full object-cover rounded" alt={`Banner ${i + 1}`} />
                  <Button size="icon" variant="destructive" className="absolute -top-1 -right-1 h-5 w-5" onClick={() => setForm(f => ({ ...f, banner_images: f.banner_images.filter((_, j) => j !== i) }))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <label className="flex items-center justify-center border-2 border-dashed rounded w-24 h-16 cursor-pointer hover:bg-muted/50">
                <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </label>
            </div>
          </div>

          {/* Products */}
          <div className="space-y-2">
            <Label>Produtos</Label>
            <Select onValueChange={addProduct}>
              <SelectTrigger><SelectValue placeholder="Adicionar produto..." /></SelectTrigger>
              <SelectContent>
                {products.filter(p => !form.product_ids.includes(p.id)).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title} — {formatCurrency(p.price)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.product_ids.map(pid => {
              const p = products.find(pp => pp.id === pid);
              return (
                <div key={pid} className="flex items-center gap-2 border border-border p-2 rounded">
                  <span className="flex-1 text-sm truncate">{p?.title || pid}</span>
                  <Button size="icon" variant="ghost" onClick={() => setForm(f => ({ ...f, product_ids: f.product_ids.filter(x => x !== pid) }))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Published */}
          <div className="flex items-center gap-2">
            <Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
            <Label>Publicada</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={createPage.isPending || updatePage.isPending}>
            {(createPage.isPending || updatePage.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingPage ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
