 import { cn } from '@/lib/utils';
 
 interface ImageBlockProps {
   content: {
     url?: string;
     alt_text?: string;
     caption?: string;
   };
   settings: {
     width?: 'full' | 'large' | 'medium';
     rounded?: boolean;
   };
 }
 
 export function ImageBlock({ content, settings }: ImageBlockProps) {
   if (!content.url) return null;
 
   const widthClass = {
     full: 'w-full',
     large: 'max-w-4xl mx-auto',
     medium: 'max-w-2xl mx-auto',
   }[settings.width || 'full'];
 
   return (
     <section className="py-8">
       <div className={cn("container", widthClass)}>
         <img
           src={content.url}
           alt={content.alt_text || ''}
           className={cn(
             "w-full h-auto",
             settings.rounded && "rounded-lg"
           )}
         />
         {content.caption && (
           <p className="text-center text-sm text-muted-foreground mt-3">
             {content.caption}
           </p>
         )}
       </div>
     </section>
   );
 }