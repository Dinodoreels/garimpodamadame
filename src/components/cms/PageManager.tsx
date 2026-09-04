import { useState } from 'react';
import { type CMSPage, useCreateCMSPage, useUpdateCMSPage, useDeleteCMSPage, useSystemPages, useCreateSystemPage, SYSTEM_PAGES } from '@/hooks/useCMS';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, FileText, Home, Globe, Trash2, Pencil, Loader2, Layout, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PageManagerProps {
  pages: CMSPage[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
}

export function PageManager({ pages, selectedPageId, onSelectPage }: PageManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CMSPage | null>(null);
  const [formData, setFormData] = useState({ title: '', slug: '', is_home: false });
  
  const createPage = useCreateCMSPage();
  const updatePage = useUpdateCMSPage();
  const deletePage = useDeleteCMSPage();
  const { systemPages } = useSystemPages();
  const { createSystemPage, isPending: isCreatingSystem } = useCreateSystemPage();

  // Filter out system pages from regular pages list
  const systemSlugs = SYSTEM_PAGES.map(s => s.slug);
  const customPages = pages.filter(p => !systemSlugs.includes(p.slug) && !p.is_home);

  const openNewDialog = () => {
    setEditingPage(null);
    setFormData({ title: '', slug: '', is_home: false });
    setIsDialogOpen(true);
  };

  const openEditDialog = (page: CMSPage) => {
    setEditingPage(page);
    setFormData({ title: page.title, slug: page.slug, is_home: page.is_home });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.slug) return;

    const slug = formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    if (editingPage) {
      await updatePage.mutateAsync({ id: editingPage.id, ...formData, slug });
    } else {
      const newPage = await createPage.mutateAsync({ ...formData, slug });
      onSelectPage(newPage.id);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deletePage.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
    if (selectedPageId === deleteConfirm.id && pages.length > 1) {
      const remaining = pages.find(p => p.id !== deleteConfirm.id);
      if (remaining) onSelectPage(remaining.id);
    }
  };

  const handleCreateSystemPage = async (sysDef: typeof SYSTEM_PAGES[0]) => {
    const newPage = await createSystemPage(sysDef);
    onSelectPage(newPage.id);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const isSystemPage = (page: CMSPage) => {
    return systemSlugs.includes(page.slug) || page.is_home;
  };

  return (
    <div className="space-y-4">
      {/* System Pages Section */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Páginas do Sistema
        </p>
        <div className="space-y-1">
          {systemPages.map((sys) => (
            <div
              key={sys.slug}
              className={cn(
                "group flex items-center gap-2 p-2 rounded-md transition-colors",
                sys.exists && selectedPageId === sys.page?.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
            >
              <Layout className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{sys.title}</p>
                  {sys.exists && sys.page?.is_published && (
                    <Globe className="h-3 w-3 text-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{sys.route}</p>
              </div>
              {sys.exists ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => sys.page && onSelectPage(sys.page.id)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={isCreatingSystem}
                  onClick={() => handleCreateSystemPage(sys)}
                >
                  {isCreatingSystem ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-1" />
                      Criar
                    </>
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Páginas Customizadas
          </p>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={openNewDialog}>
            <Plus className="h-3 w-3 mr-1" />
            Nova
          </Button>
        </div>

        <div className="space-y-1">
          {customPages.map((page) => (
            <div
              key={page.id}
              className={cn(
                "group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                selectedPageId === page.id 
                  ? "bg-primary/10 text-primary" 
                  : "hover:bg-muted"
              )}
              onClick={() => onSelectPage(page.id)}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{page.title}</p>
                <p className="text-xs text-muted-foreground">/p/{page.slug}</p>
              </div>
              <div className="flex items-center gap-1">
                {page.is_published && (
                  <Globe className="h-3 w-3 text-emerald-500" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); openEditDialog(page); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(page); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {customPages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma página customizada
          </p>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPage ? 'Editar Página' : 'Nova Página'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input 
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    title,
                    slug: editingPage ? prev.slug : generateSlug(title)
                  }));
                }}
                placeholder="Nome da Página"
              />
            </div>
            <div className="space-y-2">
              <Label>URL (slug)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/p/</span>
                <Input 
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="nome-da-pagina"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleSubmit}
              disabled={createPage.isPending || updatePage.isPending}
            >
              {(createPage.isPending || updatePage.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingPage ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir página?</AlertDialogTitle>
            <AlertDialogDescription>
              A página "{deleteConfirm?.title}" e todos os seus blocos serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletePage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
