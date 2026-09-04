import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableImageItemProps {
  id: string;
  preview: string;
  isPrimary: boolean;
  onRemove: () => void;
  onSetPrimary: () => void;
}

export function SortableImageItem({
  id,
  preview,
  isPrimary,
  onRemove,
  onSetPrimary,
}: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group aspect-square rounded-md border overflow-hidden",
        isDragging ? "opacity-50 ring-2 ring-primary z-50" : "",
        isPrimary ? "ring-2 ring-amber-500" : "border-border"
      )}
    >
      {/* Drag Handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 p-1 bg-background/80 backdrop-blur-sm rounded cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Primary Badge */}
      {isPrimary && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 text-amber-950 text-[10px] font-medium rounded z-10">
          PRINCIPAL
        </div>
      )}

      {/* Image */}
      <img
        src={preview}
        alt="Preview"
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Action Buttons */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {/* Set as Primary */}
        <button
          type="button"
          onClick={onSetPrimary}
          className={cn(
            "p-1.5 rounded-full transition-colors",
            isPrimary
              ? "bg-amber-500 text-amber-950"
              : "bg-background/80 backdrop-blur-sm text-muted-foreground hover:bg-amber-500 hover:text-amber-950"
          )}
          title={isPrimary ? "Imagem principal" : "Definir como principal"}
        >
          <Star className={cn("h-3.5 w-3.5", isPrimary && "fill-current")} />
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 bg-destructive text-destructive-foreground rounded-full"
          title="Remover imagem"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Drag hint */}
      <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <p className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/80">
          Arraste para reordenar
        </p>
      </div>
    </div>
  );
}
