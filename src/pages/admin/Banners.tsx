import React, { useState } from 'react';
import { Plus, GripVertical, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import {
  Banner,
  useBanners,
  useUpdateBanner,
  useDeleteBanner,
  useReorderBanners,
} from '@/hooks/useBanners';

function SortableBannerItem({
  banner,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  banner: Banner;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-card border rounded-lg transition-shadow ${
        isDragging ? 'shadow-lg z-50' : ''
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Thumbnail */}
      <div className="w-24 h-14 rounded overflow-hidden flex-shrink-0 bg-muted">
        <img
          src={banner.image_url}
          alt={banner.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{banner.title}</h3>
        <p className="text-sm text-muted-foreground truncate">
          {banner.subtitle || 'Sem subtítulo'}
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        {banner.is_active ? (
          <Eye className="h-4 w-4 text-green-600" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
        <Switch
          checked={banner.is_active}
          onCheckedChange={onToggleActive}
          aria-label="Ativar/desativar banner"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export default function Banners() {
  const { data: banners, isLoading } = useBanners();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  const reorderBanners = useReorderBanners();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Banners</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os banners da página inicial
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Banner
        </Button>
      </div>

      {/* Banner List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : banners?.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-card">
          <p className="text-muted-foreground mb-4">Nenhum banner cadastrado</p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Banner
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={banners?.map((b) => b.id) || []}
            strategy={verticalListSortingStrategy}
          >
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

      {/* Dialog */}
      <BannerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        banner={editingBanner}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingBanner} onOpenChange={() => setDeletingBanner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o banner "{deletingBanner?.title}"? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
