 import { cn } from '@/lib/utils';
 import { Quote } from 'lucide-react';
 
 interface TestimonialItem {
   name?: string;
   text?: string;
   photo?: string;
 }
 
 interface TestimonialsBlockProps {
   content: {
     items?: TestimonialItem[];
   };
   settings: {
     columns?: number;
   };
 }
 
 export function TestimonialsBlock({ content, settings }: TestimonialsBlockProps) {
   const items = content.items || [];
   const columns = settings.columns || 2;
 
   const gridCols = {
     1: '',
     2: 'md:grid-cols-2',
     3: 'md:grid-cols-3',
   }[columns] || 'md:grid-cols-2';
 
   return (
     <section className="py-12 lg:py-16 bg-muted/30">
       <div className="container">
         <div className={cn("grid grid-cols-1 gap-6", gridCols)}>
           {items.map((item, index) => (
             <div 
               key={index} 
               className="bg-background p-6 rounded-lg shadow-sm"
             >
               <Quote className="h-8 w-8 text-primary/20 mb-4" />
               <p className="text-muted-foreground mb-4 italic">
                 "{item.text}"
               </p>
               <div className="flex items-center gap-3">
                 {item.photo && (
                   <img 
                     src={item.photo} 
                     alt={item.name} 
                     className="w-10 h-10 rounded-full object-cover"
                   />
                 )}
                 <span className="font-medium">{item.name}</span>
               </div>
             </div>
           ))}
         </div>
       </div>
     </section>
   );
 }