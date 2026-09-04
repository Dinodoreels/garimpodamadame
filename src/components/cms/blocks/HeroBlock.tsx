 import { Link } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 
 interface HeroBlockProps {
   content: {
     title?: string;
     subtitle?: string;
     image_url?: string;
     button_text?: string;
     button_link?: string;
   };
   settings: {
     overlay_opacity?: number;
     text_align?: 'left' | 'center' | 'right';
     height?: 'small' | 'medium' | 'full';
   };
 }
 
 export function HeroBlock({ content, settings }: HeroBlockProps) {
   const heightClass = {
     small: 'min-h-[40vh]',
     medium: 'min-h-[60vh]',
     full: 'min-h-[85vh]',
   }[settings.height || 'full'];
 
   return (
     <section className={cn("relative overflow-hidden", heightClass)}>
       {content.image_url && (
         <div 
           className="absolute inset-0 bg-cover bg-center"
           style={{ backgroundImage: `url(${content.image_url})` }}
         />
       )}
       <div 
         className="absolute inset-0 bg-black"
         style={{ opacity: (settings.overlay_opacity || 50) / 100 }}
       />
       <div className={cn(
         "container relative z-10 flex flex-col justify-center h-full py-16",
         settings.text_align === 'center' && "items-center text-center",
         settings.text_align === 'right' && "items-end text-right",
         settings.text_align === 'left' && "items-start text-left",
       )}>
         <h1 className="font-display text-4xl lg:text-6xl text-white mb-4">
           {content.title}
         </h1>
         {content.subtitle && (
           <p className="text-lg text-white/70 mb-8 max-w-xl">
             {content.subtitle}
           </p>
         )}
          {content.button_text && content.button_link && (() => {
            const isExternal = content.button_link!.startsWith('http') || content.button_link!.startsWith('mailto:') || content.button_link!.startsWith('tel:');
            return (
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="border-white/30 text-white hover:bg-white/10"
              >
                {isExternal ? (
                  <a href={content.button_link} target="_blank" rel="noopener noreferrer">{content.button_text}</a>
                ) : (
                  <Link to={content.button_link!}>{content.button_text}</Link>
                )}
              </Button>
            );
          })()}
       </div>
     </section>
   );
 }