 import React from 'react';
 import { BLOCK_DEFINITIONS, type BlockType } from '@/hooks/useCMS';
 import { Button } from '@/components/ui/button';
 import { 
   Image, 
   Type, 
   ImageIcon, 
   MousePointerClick, 
   LayoutGrid, 
   ShoppingBag,
   Quote,
   Images,
   Play,
   MoveVertical,
   Minus,
   MessageSquare,
 } from 'lucide-react';
 
 const ICONS: Record<string, React.ElementType> = {
   Image,
   Type,
   ImageIcon,
   MousePointerClick,
   LayoutGrid,
   ShoppingBag,
   Quote,
   Images,
   Play,
   MoveVertical,
   Minus,
   MessageSquare,
 };
 
 interface BlockPaletteProps {
   onAddBlock: (type: BlockType) => void;
 }
 
 export const BlockPalette = React.forwardRef<HTMLDivElement, BlockPaletteProps>(
   function BlockPalette({ onAddBlock }, ref) {
     return (
       <div ref={ref} className="space-y-2">
         <p className="text-xs text-muted-foreground mb-3">
           Clique para adicionar um bloco à página
         </p>
         <div className="grid grid-cols-2 gap-2">
           {BLOCK_DEFINITIONS.map((block) => {
             const Icon = ICONS[block.icon] || LayoutGrid;
             return (
               <Button
                 key={block.type}
                 variant="outline"
                 className="h-auto py-3 flex flex-col items-center gap-1.5 text-xs font-normal hover:bg-primary/5 hover:border-primary/30"
                 onClick={() => onAddBlock(block.type)}
               >
                 <Icon className="h-5 w-5 text-muted-foreground" />
                 <span className="text-[11px] text-center leading-tight">{block.label}</span>
               </Button>
             );
           })}
         </div>
       </div>
     );
   }
 );