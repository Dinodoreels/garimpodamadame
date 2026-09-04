 import React from 'react';
 import { type CMSSection, BLOCK_DEFINITIONS } from '@/hooks/useCMS';
 import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
 import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
 import { CSS } from '@dnd-kit/utilities';
 import { cn } from '@/lib/utils';
 import { Button } from '@/components/ui/button';
 import { GripVertical, Trash2, Eye, EyeOff, Loader2, Plus } from 'lucide-react';
 
 interface EditorCanvasProps {
   sections: CMSSection[];
   selectedSectionId: string | null;
   onSelectSection: (id: string | null) => void;
   onReorder: (sections: CMSSection[]) => void;
   onDeleteSection: (id: string) => void;
   isLoading?: boolean;
 }
 
 export const EditorCanvas = React.forwardRef<HTMLDivElement, EditorCanvasProps>(
   function EditorCanvas({ 
       sections, 
       selectedSectionId, 
       onSelectSection, 
       onReorder,
       onDeleteSection,
       isLoading 
     }, ref) {
   const sensors = useSensors(
     useSensor(PointerSensor),
     useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
   );
 
   const handleDragEnd = (event: DragEndEvent) => {
     const { active, over } = event;
     if (over && active.id !== over.id) {
       const oldIndex = sections.findIndex(s => s.id === active.id);
       const newIndex = sections.findIndex(s => s.id === over.id);
       const newSections = [...sections];
       const [removed] = newSections.splice(oldIndex, 1);
       newSections.splice(newIndex, 0, removed);
       onReorder(newSections);
     }
   };
 
   if (isLoading) {
     return (
       <div ref={ref} className="flex items-center justify-center h-64">
         <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   if (sections.length === 0) {
     return (
       <div ref={ref} className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-muted-foreground/20 rounded-lg">
         <Plus className="h-10 w-10 text-muted-foreground/40 mb-3" />
         <p className="text-muted-foreground text-sm">Nenhum bloco ainda</p>
         <p className="text-muted-foreground/60 text-xs mt-1">Adicione blocos pelo painel esquerdo</p>
       </div>
     );
   }
 
   return (
     <div ref={ref} className="max-w-3xl mx-auto">
       <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
         <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
           <div className="space-y-3">
             {sections.map((section) => (
               <SortableBlock
                 key={section.id}
                 section={section}
                 isSelected={selectedSectionId === section.id}
                 onSelect={() => onSelectSection(section.id)}
                 onDelete={() => onDeleteSection(section.id)}
               />
             ))}
           </div>
         </SortableContext>
       </DndContext>
     </div>
   );
 }
 );
 
 interface SortableBlockProps {
   section: CMSSection;
   isSelected: boolean;
   onSelect: () => void;
   onDelete: () => void;
 }
 
 function SortableBlock({ section, isSelected, onSelect, onDelete }: SortableBlockProps) {
   const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
 
   const style = {
     transform: CSS.Transform.toString(transform),
     transition,
   };
 
   const blockDef = BLOCK_DEFINITIONS.find(b => b.type === section.type);
   const content = section.content as Record<string, unknown>;
 
   return (
     <div
       ref={setNodeRef}
       style={style}
       className={cn(
         "group bg-background border rounded-lg overflow-hidden transition-all",
         isSelected && "ring-2 ring-primary",
         isDragging && "opacity-50",
         !section.is_visible && "opacity-50"
       )}
     >
       {/* Block Header */}
       <div 
         className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b cursor-pointer"
         onClick={onSelect}
       >
         <button
           className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
           {...attributes}
           {...listeners}
         >
           <GripVertical className="h-4 w-4" />
         </button>
         <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex-1">
           {blockDef?.label || section.type}
         </span>
         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           {!section.is_visible && <EyeOff className="h-3 w-3 text-muted-foreground" />}
           <Button
             variant="ghost"
             size="icon"
             className="h-6 w-6 text-destructive hover:text-destructive"
             onClick={(e) => { e.stopPropagation(); onDelete(); }}
           >
             <Trash2 className="h-3 w-3" />
           </Button>
         </div>
       </div>
 
       {/* Block Preview */}
       <div className="p-4 min-h-[60px]" onClick={onSelect}>
         <BlockPreview type={section.type} content={content} />
       </div>
     </div>
   );
 }
 
 function BlockPreview({ type, content }: { type: string; content: Record<string, unknown> }) {
   switch (type) {
     case 'hero':
       return (
         <div className="text-center">
           <h3 className="text-lg font-semibold">{String(content.title || 'Título')}</h3>
           <p className="text-sm text-muted-foreground">{String(content.subtitle || 'Subtítulo')}</p>
           {content.button_text && (
             <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-xs rounded">
               {String(content.button_text)}
             </span>
           )}
         </div>
       );
     case 'text':
       return (
         <div>
           {content.title && <h4 className="font-medium mb-1">{String(content.title)}</h4>}
           <p className="text-sm text-muted-foreground line-clamp-2">
             {String(content.content || 'Texto...')}
           </p>
         </div>
       );
     case 'cta':
       return (
         <div className="bg-primary/5 p-3 rounded text-center">
           <h4 className="font-medium">{String(content.title || 'Chamada')}</h4>
           <p className="text-xs text-muted-foreground">{String(content.description || '')}</p>
         </div>
       );
     case 'products':
       return (
         <div className="text-center text-muted-foreground text-sm">
           <span>🛍️ Carrossel de Produtos ({String(content.limit || 8)} itens)</span>
         </div>
       );
     case 'features':
       const items = (content.items as Array<{title: string}>) || [];
       return (
         <div className="flex gap-2 flex-wrap">
           {items.slice(0, 3).map((item, i) => (
             <span key={i} className="px-2 py-1 bg-muted rounded text-xs">{item.title}</span>
           ))}
           {items.length > 3 && <span className="text-xs text-muted-foreground">+{items.length - 3}</span>}
         </div>
       );
     case 'spacer':
       return (
         <div className="text-center text-muted-foreground text-xs">
           Espaçamento: {String((content as { height?: number }).height || 64)}px
         </div>
       );
     case 'divider':
       return <hr className="border-muted-foreground/20" />;
     default:
       return (
         <div className="text-center text-muted-foreground text-sm">
           {type}
         </div>
       );
   }
 }