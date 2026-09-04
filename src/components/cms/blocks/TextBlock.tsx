 import { cn } from '@/lib/utils';
 
 interface TextBlockProps {
   content: {
     title?: string;
     content?: string;
   };
   settings: {
     align?: 'left' | 'center' | 'right';
     max_width?: string;
   };
 }
 
 export function TextBlock({ content, settings }: TextBlockProps) {
   return (
     <section className="py-12 lg:py-16">
       <div className={cn(
         "container max-w-prose mx-auto",
         settings.align === 'center' && "text-center",
         settings.align === 'right' && "text-right",
       )}>
         {content.title && (
           <h2 className="font-display text-2xl lg:text-3xl font-light tracking-wide mb-6">
             {content.title}
           </h2>
         )}
         {content.content && (
           <div className="prose prose-neutral dark:prose-invert max-w-none">
             {content.content.split('\n').map((paragraph, i) => (
               <p key={i} className="text-muted-foreground leading-relaxed">
                 {paragraph}
               </p>
             ))}
           </div>
         )}
       </div>
     </section>
   );
 }