import React, { useState, useEffect } from 'react';
import { Plus, GripVertical, Pencil, Trash2, Eye, EyeOff, Star, Check, X, MessageSquare, Loader2, ExternalLink, Image, Info, Phone, Save, Palette, Video, Scale, LogIn, Sparkles, PanelLeft } from 'lucide-react';
import { LegalTab } from '@/components/admin/LegalTab';
import { AppearanceTab } from '@/components/admin/AppearanceTab';
import { MediaPicker } from '@/components/cms/MediaPicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSiteContent } from '@/hooks/useSiteContent';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BannerDialog } from '@/components/admin/BannerDialog';
import { Banner, useBanners, useUpdateBanner, useDeleteBanner, useReorderBanners } from '@/hooks/useBanners';
import { StarRating } from '@/components/products/StarRating';
import { useReviews, Review } from '@/hooks/useReviews';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { toast } from 'sonner';
import { defaultStorefrontNavigation, mergeStorefrontNavigation, type StorefrontNavigationSettings } from '@/lib/storefrontNavigation';

function NavigationTab() {
  const { data, isLoading, save, saving } = useSiteContent<StorefrontNavigationSettings>('storefront_navigation');
  const [settings, setSettings] = useState<StorefrontNavigationSettings>(defaultStorefrontNavigation);

  useEffect(() => {
    if (!isLoading) setSettings(mergeStorefrontNavigation(data));
  }, [data, isLoading]);

  const togglePage = (href: string, enabled: boolean) => {
    setSettings((current) => ({
      ...current,
      items: current.items.map((item) => item.href === href ? { ...item, enabled } : item),
    }));
  };

  const handleSave = () => {
    if (!settings.items.some((item) => item.enabled)) {
      toast.error('Mantenha pelo menos uma página ativa.');
      return;
    }
    save(settings);
  };

  if (isLoading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="space-y-1 pt-6">
          <div className="mb-5">
            <h3 className="font-semibold">Páginas exibidas na loja</h3>
            <p className="mt-1 text-sm text-muted-foreground">Desative uma página para removê-la do menu e impedir seu acesso público.</p>
          </div>
          {settings.items.map((item) => (
            <div key={item.href} className="flex min-h-14 items-center justify-between gap-4 border-b border-border py-3 last:border-0">
              <div>
                <Label htmlFor={`page-${item.href}`} className="text-sm">{item.name}</Label>
                <p className="text-xs text-muted-foreground">{item.href}</p>
              </div>
              <Switch id={`page-${item.href}`} checked={item.enabled} onCheckedChange={(checked) => togglePage(item.href, checked)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {!settings.items.find((item) => item.href === '/')?.enabled && (
        <Card>
          <CardContent className="pt-6">
            <Label htmlFor="home-destination">Ao acessar o endereço principal, abrir</Label>
            <select id="home-destination" value={settings.disabledHomeDestination} onChange={(event) => setSettings((current) => ({ ...current, disabledHomeDestination: event.target.value }))} className="mt-2 h-11 w-full border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              {settings.items.filter((item) => item.enabled && item.href !== '/').map((item) => <option key={item.href} value={item.href}>{item.name}</option>)}
            </select>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar navegação
        </Button>
      </div>
    </div>
  );
}

// ========== BANNERS TAB ==========
function SortableBannerItem({ banner, onEdit, onDelete, onToggleActive }: {
  banner: Banner;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-card border rounded-lg transition-shadow ${isDragging ? 'shadow-lg z-50' : ''}`}
    >
      <button {...attributes} {...listeners} className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="w-24 h-14 rounded overflow-hidden flex-shrink-0 bg-muted">
        <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{banner.title}</h3>
        <p className="text-sm text-muted-foreground truncate">{banner.subtitle || 'Sem subtítulo'}</p>
      </div>
      <div className="flex items-center gap-2">
        {banner.is_active ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
        <Switch checked={banner.is_active} onCheckedChange={onToggleActive} />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    </div>
  );
}

function BannersTab() {
  const { data: banners, isLoading } = useBanners();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  const reorderBanners = useReorderBanners();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && banners) {
      const oldIndex = banners.findIndex((b) => b.id === active.id);
      const newIndex = banners.findIndex((b) => b.id === over.id);
      const reordered = arrayMove(banners, oldIndex, newIndex);
      reorderBanners.mutate(reordered.map((b) => b.id));
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingBanner(null);
    setDialogOpen(true);
  };

  const handleToggleActive = (banner: Banner) => {
    updateBanner.mutate({ id: banner.id, is_active: !banner.is_active });
  };

  const handleConfirmDelete = async () => {
    if (deletingBanner) {
      await deleteBanner.mutateAsync(deletingBanner.id);
      setDeletingBanner(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Banner
        </Button>
      </div>

      {banners?.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-card">
          <p className="text-muted-foreground mb-4">Nenhum banner cadastrado</p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Banner
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={banners?.map((b) => b.id) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {banners?.map((banner) => (
                <SortableBannerItem
                  key={banner.id}
                  banner={banner}
                  onEdit={() => handleEdit(banner)}
                  onDelete={() => setDeletingBanner(banner)}
                  onToggleActive={() => handleToggleActive(banner)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <BannerDialog open={dialogOpen} onOpenChange={setDialogOpen} banner={editingBanner} />

      <AlertDialog open={!!deletingBanner} onOpenChange={() => setDeletingBanner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o banner "{deletingBanner?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ========== REVIEWS TAB ==========
const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Aprovado', className: 'bg-primary/10 text-primary' },
  rejected: { label: 'Rejeitado', className: 'bg-destructive/10 text-destructive' },
};

function ReviewsTab() {
  const { reviews, loading, pendingCount, updateReviewStatus, addAdminReply, deleteReview } = useReviews();
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filteredReviews = reviews.filter(r => filter === 'all' || r.status === filter);

  const handleApprove = async (id: string) => {
    setUpdating(true);
    try {
      await updateReviewStatus(id, 'approved');
      toast.success('Avaliação aprovada');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async (id: string) => {
    setUpdating(true);
    try {
      await updateReviewStatus(id, 'rejected');
      toast.success('Avaliação rejeitada');
    } finally {
      setUpdating(false);
    }
  };

  const handleReply = async () => {
    if (!selectedReview || !replyText.trim()) return;
    setUpdating(true);
    try {
      await addAdminReply(selectedReview.id, replyText);
      toast.success('Resposta adicionada');
      setSelectedReview(null);
      setReplyText('');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReview(deleteId);
      toast.success('Avaliação excluída');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Todas ({reviews.length})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({reviews.filter(r => r.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="approved">Aprovadas ({reviews.filter(r => r.status === 'approved').length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitadas ({reviews.filter(r => r.status === 'rejected').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Avaliação</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma avaliação encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((review) => {
                  const status = statusConfig[review.status];
                  return (
                    <TableRow key={review.id}>
                      <TableCell>
                        <Link to={`/product/${review.product?.handle}`} className="text-sm hover:underline flex items-center gap-1">
                          {review.product?.title?.slice(0, 30) || 'Produto'}...
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <StarRating rating={review.rating} size="sm" />
                          <p className="text-xs text-muted-foreground line-clamp-1">{review.comment.slice(0, 50)}...</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{review.profile?.full_name || 'Cliente'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {format(new Date(review.created_at), 'dd/MM/yy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.className}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {review.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleApprove(review.id)} disabled={updating}>
                                <Check className="h-4 w-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleReject(review.id)} disabled={updating}>
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedReview(review); setReplyText(review.admin_reply || ''); }}>
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(review.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reply Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => { if (!open) setSelectedReview(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Avaliação</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{selectedReview.profile?.full_name}</span>
                  <StarRating rating={selectedReview.rating} size="sm" />
                </div>
                {selectedReview.title && <p className="font-medium mb-1">{selectedReview.title}</p>}
                <p className="text-sm text-muted-foreground">{selectedReview.comment}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sua resposta:</label>
                <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Obrigado pelo seu feedback..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReview(null)}>Cancelar</Button>
            <Button onClick={handleReply} disabled={updating || !replyText.trim()}>
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ========== ABOUT TAB ==========
interface AboutContent {
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  show_hero_text: boolean;
  story_title: string;
  story_paragraphs: string[];
  mission_quote: string;
  vision_title: string;
  vision_paragraphs: string[];
  team_image: string;
  video_url: string;
  cta_title: string;
  cta_subtitle: string;
}

const defaultAbout: AboutContent = {
  hero_title: 'Não vendemos roupa. Entregamos presença.',
  hero_subtitle: 'Conheça a história por trás da Vanguard Store e nossa missão de levar o melhor do mundo até você.',
  hero_image: '',
  show_hero_text: true,
  story_title: 'De onde viemos',
  story_paragraphs: [
    'A VANGUARD STORE nasceu com um propósito claro: entregar produtos importados de primeira linha com estilo e procedência — sem burocracia, sem complicação.',
    'Começamos pequeno, atendendo amigos próximos e familiares que queriam acesso ao que há de melhor no mercado internacional. O boca a boca fez o resto.',
    'Cada peça que entra no nosso catálogo passa por uma curadoria rigorosa. Não trabalhamos com quantidade — trabalhamos com confiança.',
  ],
  mission_quote: 'Nossa missão é transformar a experiência de quem consome moda, oferecendo acesso ao que há de melhor no mundo sem que você precise sair do Brasil — ou pagar preços absurdos.',
  vision_title: 'Para onde vamos',
  vision_paragraphs: [
    'Nosso objetivo é nos tornar a principal referência em importados premium no Brasil.',
    'Estamos constantemente expandindo nosso catálogo, buscando novas marcas e produtos que atendam aos padrões de qualidade que nossos clientes esperam.',
  ],
  team_image: '',
  video_url: '',
  cta_title: 'Se você está aqui, é porque não veio ao mundo pra ser comum.',
  cta_subtitle: 'Descubra produtos que combinam com quem você realmente é.',
};

function AboutTab() {
  const { data, isLoading, save, saving } = useSiteContent<AboutContent>('about_content');
  const [form, setForm] = useState<AboutContent>(defaultAbout);

  useEffect(() => {
    if (data) setForm({ ...defaultAbout, ...data });
  }, [data]);

  const updateField = (field: keyof AboutContent, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const updateParagraph = (field: 'story_paragraphs' | 'vision_paragraphs', index: number, value: string) => {
    setForm(prev => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card><CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Seção Hero</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="about-show-hero-text" className="text-sm">Exibir textos no hero</Label>
            <Switch id="about-show-hero-text" checked={form.show_hero_text !== false} onCheckedChange={v => updateField('show_hero_text', v)} />
          </div>
        </div>
        <div><Label>Título Principal</Label><Input value={form.hero_title} onChange={e => updateField('hero_title', e.target.value)} /></div>
        <div><Label>Subtítulo</Label><Textarea value={form.hero_subtitle} onChange={e => updateField('hero_subtitle', e.target.value)} rows={2} /></div>
        <div>
          <Label>Imagem de Fundo do Hero</Label>
          <MediaPicker value={form.hero_image || ''} onChange={url => updateField('hero_image', url)} label="Selecionar Imagem do Hero" />
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold">Nossa História</h3>
        <div><Label>Título da Seção</Label><Input value={form.story_title} onChange={e => updateField('story_title', e.target.value)} /></div>
        {form.story_paragraphs.map((p, i) => (
          <div key={i}><Label>Parágrafo {i + 1}</Label><Textarea value={p} onChange={e => updateParagraph('story_paragraphs', i, e.target.value)} rows={3} /></div>
        ))}
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold">Citação / Missão</h3>
        <div><Label>Citação</Label><Textarea value={form.mission_quote} onChange={e => updateField('mission_quote', e.target.value)} rows={3} /></div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold">Visão de Futuro</h3>
        <div><Label>Título</Label><Input value={form.vision_title} onChange={e => updateField('vision_title', e.target.value)} /></div>
        {form.vision_paragraphs.map((p, i) => (
          <div key={i}><Label>Parágrafo {i + 1}</Label><Textarea value={p} onChange={e => updateParagraph('vision_paragraphs', i, e.target.value)} rows={3} /></div>
        ))}
        <div>
          <Label>Imagem da Equipe</Label>
          <MediaPicker value={form.team_image || ''} onChange={url => updateField('team_image', url)} label="Selecionar Imagem da Equipe" />
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Video className="h-4 w-4" /> Vídeo Institucional</h3>
        <div>
          <Label>URL do YouTube (opcional)</Label>
          <Input value={form.video_url || ''} onChange={e => updateField('video_url', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          <p className="text-xs text-muted-foreground mt-1">O vídeo será exibido na página Sobre</p>
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold">Call to Action</h3>
        <div><Label>Título</Label><Input value={form.cta_title} onChange={e => updateField('cta_title', e.target.value)} /></div>
        <div><Label>Subtítulo</Label><Input value={form.cta_subtitle} onChange={e => updateField('cta_subtitle', e.target.value)} /></div>
      </CardContent></Card>

      <Button onClick={() => save(form)} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar Sobre
      </Button>
    </div>
  );
}

// ========== CONTACT TAB ==========
interface ContactContent {
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  show_hero_text: boolean;
  form_title: string;
  whatsapp_title: string;
  whatsapp_description: string;
  info_title: string;
}

const defaultContact: ContactContent = {
  hero_title: 'Precisa falar com a gente?',
  hero_subtitle: 'Estamos prontos para atender você. Escolha o canal de sua preferência.',
  hero_image: '',
  show_hero_text: true,
  form_title: 'Envie sua mensagem',
  whatsapp_title: 'Atendimento direto no WhatsApp',
  whatsapp_description: 'Prefere um atendimento mais direto? Fale conosco pelo WhatsApp e tire suas dúvidas em tempo real.',
  info_title: 'Informações Importantes',
};

function ContactTab() {
  const { data, isLoading, save, saving } = useSiteContent<ContactContent>('contact_content');
  const [form, setForm] = useState<ContactContent>(defaultContact);

  useEffect(() => {
    if (data) setForm({ ...defaultContact, ...data });
  }, [data]);

  const updateField = (field: keyof ContactContent, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card><CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Seção Hero</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="contact-show-hero-text" className="text-sm">Exibir textos no hero</Label>
            <Switch id="contact-show-hero-text" checked={form.show_hero_text !== false} onCheckedChange={v => updateField('show_hero_text', v)} />
          </div>
        </div>
        <div><Label>Título Principal</Label><Input value={form.hero_title} onChange={e => updateField('hero_title', e.target.value)} /></div>
        <div><Label>Subtítulo</Label><Textarea value={form.hero_subtitle} onChange={e => updateField('hero_subtitle', e.target.value)} rows={2} /></div>
        <div>
          <Label>Imagem de Fundo do Hero</Label>
          <MediaPicker value={form.hero_image || ''} onChange={url => updateField('hero_image', url)} label="Selecionar Imagem do Hero" />
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold">Formulário</h3>
        <div><Label>Título do Formulário</Label><Input value={form.form_title} onChange={e => updateField('form_title', e.target.value)} /></div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold">WhatsApp</h3>
        <div><Label>Título</Label><Input value={form.whatsapp_title} onChange={e => updateField('whatsapp_title', e.target.value)} /></div>
        <div><Label>Descrição</Label><Textarea value={form.whatsapp_description} onChange={e => updateField('whatsapp_description', e.target.value)} rows={3} /></div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold">Informações</h3>
        <div><Label>Título da Seção</Label><Input value={form.info_title} onChange={e => updateField('info_title', e.target.value)} /></div>
      </CardContent></Card>

      <Button onClick={() => save(form)} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar Contato
      </Button>
    </div>
  );
}

// ========== AUTH PAGE TAB ==========
interface AuthPageConfig {
  hero_bg_image: string;
  hero_bg_color: string;
  store_name: string;
  slogan: string;
  text_color: string;
}

const defaultAuthConfig: AuthPageConfig = {
  hero_bg_image: '',
  hero_bg_color: '#5a5a5a',
  store_name: 'VANGUARD STORE',
  slogan: 'Exclusividade que se veste',
  text_color: '#ffffff',
};

function AuthPageTab() {
  const { data, isLoading, save, saving } = useSiteContent<AuthPageConfig>('auth_page_config');
  const [form, setForm] = useState<AuthPageConfig>(defaultAuthConfig);

  useEffect(() => {
    if (data) setForm({ ...defaultAuthConfig, ...data });
  }, [data]);

  const handleSave = () => save(form);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Imagem de Fundo</Label>
              <MediaPicker
                value={form.hero_bg_image}
                onChange={(url) => setForm({ ...form, hero_bg_image: url })}
                label="Selecionar Imagem de Fundo"
              />
              {form.hero_bg_image && (
                <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, hero_bg_image: '' })}>
                  Remover imagem
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Cor de Fundo (fallback)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.hero_bg_color}
                  onChange={(e) => setForm({ ...form, hero_bg_color: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={form.hero_bg_color}
                  onChange={(e) => setForm({ ...form, hero_bg_color: e.target.value })}
                  className="max-w-[120px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome da Loja</Label>
              <Input
                value={form.store_name}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                placeholder="VANGUARD STORE"
              />
            </div>

            <div className="space-y-2">
              <Label>Slogan</Label>
              <Input
                value={form.slogan}
                onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                placeholder="Exclusividade que se veste"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor do Texto</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.text_color}
                  onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={form.text_color}
                  onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                  className="max-w-[120px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Login
        </Button>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label>Preview</Label>
        <div
          className="rounded-lg overflow-hidden aspect-[4/3] flex items-center justify-center relative"
          style={{
            backgroundColor: form.hero_bg_color,
            backgroundImage: form.hero_bg_image ? `url(${form.hero_bg_image})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="text-center z-10">
            <h2
              className="text-3xl font-bold tracking-wider mb-2"
              style={{ color: form.text_color, fontFamily: 'var(--font-display, inherit)' }}
            >
              {form.store_name || 'NOME DA LOJA'}
            </h2>
            <p
              className="text-lg font-light tracking-wide opacity-80"
              style={{ color: form.text_color }}
            >
              {form.slogan || 'Seu slogan aqui'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== RELEASES TAB ==========
interface ReleasesContent {
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  show_hero_text: boolean;
  testimonials: { name: string; text: string; location: string }[];
  cta_title: string;
  cta_subtitle: string;
}

const defaultReleases: ReleasesContent = {
  hero_badge: 'Novidades',
  hero_title: 'Lançamentos',
  hero_subtitle: 'Confira as últimas novidades em roupas, calçados e acessórios importados',
  hero_image: '',
  show_hero_text: true,
  testimonials: [
    { name: 'Ana Silva', text: 'Produtos de excelente qualidade! Atendimento impecável e entrega super rápida.', location: 'São Paulo, SP' },
    { name: 'Carlos Santos', text: 'Melhor loja de importados que já comprei. Produtos autênticos e preços justos.', location: 'Rio de Janeiro, RJ' },
    { name: 'Maria Oliveira', text: 'Amei minha compra! O tênis chegou perfeito e exatamente como nas fotos.', location: 'Belo Horizonte, MG' },
  ],
  cta_title: 'Não Encontrou o Que Procura?',
  cta_subtitle: 'Entre em contato conosco e encomende seu produto exclusivo',
};

function ReleasesTab() {
  const { data, isLoading, save, saving } = useSiteContent<ReleasesContent>('releases');
  const [form, setForm] = useState<ReleasesContent>(defaultReleases);

  useEffect(() => {
    if (data) setForm({ ...defaultReleases, ...data });
  }, [data]);

  const updateField = (field: keyof ReleasesContent, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateTestimonial = (index: number, field: string, value: string) => {
    const updated = [...form.testimonials];
    updated[index] = { ...updated[index], [field]: value };
    updateField('testimonials', updated);
  };

  const addTestimonial = () => {
    updateField('testimonials', [...form.testimonials, { name: '', text: '', location: '' }]);
  };

  const removeTestimonial = (index: number) => {
    updateField('testimonials', form.testimonials.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5" /> Hero</h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-hero-text" className="text-sm">Exibir textos no hero</Label>
              <Switch id="show-hero-text" checked={form.show_hero_text !== false} onCheckedChange={v => updateField('show_hero_text', v)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Badge</Label>
              <Input value={form.hero_badge} onChange={e => updateField('hero_badge', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.hero_title} onChange={e => updateField('hero_title', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subtítulo</Label>
            <Textarea value={form.hero_subtitle} onChange={e => updateField('hero_subtitle', e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Imagem de Fundo</Label>
            <MediaPicker value={form.hero_image} onChange={url => updateField('hero_image', url)} label="Selecionar Imagem de Fundo" />
          </div>
        </CardContent>
      </Card>

      {/* Testimonials */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Depoimentos</h3>
            <Button variant="outline" size="sm" onClick={addTestimonial}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
          </div>
          {form.testimonials.map((t, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Depoimento {i + 1}</span>
                <Button variant="ghost" size="icon" onClick={() => removeTestimonial(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input value={t.name} onChange={e => updateTestimonial(i, 'name', e.target.value)} placeholder="Nome do cliente" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Localização</Label>
                  <Input value={t.location} onChange={e => updateTestimonial(i, 'location', e.target.value)} placeholder="Cidade, UF" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Depoimento</Label>
                <Textarea value={t.text} onChange={e => updateTestimonial(i, 'text', e.target.value)} rows={2} placeholder="O que o cliente disse..." />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CTA */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-lg font-semibold">CTA (Chamada para Ação)</h3>
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={form.cta_title} onChange={e => updateField('cta_title', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Subtítulo</Label>
            <Textarea value={form.cta_subtitle} onChange={e => updateField('cta_subtitle', e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save(form)} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Lançamentos
        </Button>
      </div>
    </div>
  );
}

// ========== MAIN PAGE ==========
export default function Content() {
  const { pendingCount } = useReviews();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Conteúdo"
        subtitle="Gerencie páginas, navegação e conteúdo da loja"
      />

      <Tabs defaultValue="banners" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="navigation" className="gap-2">
            <PanelLeft className="h-4 w-4" />
            Navegação
          </TabsTrigger>
          <TabsTrigger value="banners" className="gap-2">
            <Image className="h-4 w-4" />
            Banners
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="h-4 w-4" />
            Avaliações
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-amber-100 text-amber-800">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-2">
            <Info className="h-4 w-4" />
            Sobre
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="h-4 w-4" />
            Contato
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <Scale className="h-4 w-4" />
            Legal
          </TabsTrigger>
          <TabsTrigger value="login" className="gap-2">
            <LogIn className="h-4 w-4" />
            Login
          </TabsTrigger>
          <TabsTrigger value="releases" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Lançamentos
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="navigation" className="mt-6">
          <NavigationTab />
        </TabsContent>

        <TabsContent value="banners" className="mt-6">
          <BannersTab />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <ReviewsTab />
        </TabsContent>

        <TabsContent value="about" className="mt-6">
          <AboutTab />
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <ContactTab />
        </TabsContent>

        <TabsContent value="legal" className="mt-6">
          <LegalTab />
        </TabsContent>

        <TabsContent value="login" className="mt-6">
          <AuthPageTab />
        </TabsContent>

        <TabsContent value="releases" className="mt-6">
          <ReleasesTab />
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}