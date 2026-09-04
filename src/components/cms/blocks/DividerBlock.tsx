 import { cn } from '@/lib/utils';
 
 interface DividerBlockProps {
   settings: {
     style?: 'solid' | 'dashed' | 'dotted';
     color?: 'border' | 'muted' | 'foreground';
   };
 }
 
 export function DividerBlock({ settings }: DividerBlockProps) {
   const style = settings.style || 'solid';
   const color = settings.color || 'border';
 
   const colorClass = {
     border: 'border-border',
     muted: 'border-muted-foreground/20',
     foreground: 'border-foreground/30',
   }[color];
 
   return (
     <div className="container py-4">
       <hr className={cn(
         "border-t",
         colorClass,
         style === 'dashed' && 'border-dashed',
         style === 'dotted' && 'border-dotted',
       )} />
     </div>
   );
 }