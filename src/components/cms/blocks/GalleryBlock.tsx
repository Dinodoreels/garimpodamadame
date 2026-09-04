 import { cn } from '@/lib/utils';
 
 interface GalleryBlockProps {
   content: {
     images?: string[];
   };
   settings: {
     columns?: number;
     gap?: number;
   };
 }
 
 export function GalleryBlock({ content, settings }: GalleryBlockProps) {
   const images = content.images || [];
   const columns = settings.columns || 3;
 
   if (images.length === 0) return null;
 
   const gridCols = {
     2: 'md:grid-cols-2',
     3: 'md:grid-cols-3',
     4: 'md:grid-cols-2 lg:grid-cols-4',
   }[columns] || 'md:grid-cols-3';
 
   return (
     <section className="py-8">
       <div className="container">
         <div className={cn("grid grid-cols-1 gap-4", gridCols)}>
           {images.map((url, index) => (
             <div key={index} className="aspect-square overflow-hidden rounded-lg">
               <img
                 src={url}
                 alt={`Gallery image ${index + 1}`}
                 className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
               />
             </div>
           ))}
         </div>
       </div>
     </section>
   );
 }