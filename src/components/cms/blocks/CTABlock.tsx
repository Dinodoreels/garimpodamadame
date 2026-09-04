 import { Link } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 
 interface CTABlockProps {
   content: {
     title?: string;
     description?: string;
     button_text?: string;
     button_link?: string;
   };
   settings: {
     bg_color?: string;
     text_color?: string;
   };
 }
 
 export function CTABlock({ content }: CTABlockProps) {
   return (
     <section className="py-16 lg:py-24 bg-primary text-primary-foreground">
       <div className="container text-center">
         <h2 className="font-display text-3xl lg:text-4xl font-light mb-4">
           {content.title}
         </h2>
         {content.description && (
           <p className="text-primary-foreground/70 max-w-xl mx-auto mb-8">
             {content.description}
           </p>
         )}
          {content.button_text && content.button_link && (() => {
            const isExternal = content.button_link!.startsWith('http') || content.button_link!.startsWith('mailto:') || content.button_link!.startsWith('tel:');
            return (
              <Button 
                asChild 
                variant="secondary" 
                size="lg"
                className="tracking-wider"
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