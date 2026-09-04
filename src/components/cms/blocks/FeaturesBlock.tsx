 import { cn } from '@/lib/utils';
 import { Star, Heart, Zap, Shield, Check, Clock, Gift, Truck, Award, ThumbsUp, type LucideIcon } from 'lucide-react';
 
 interface FeatureItem {
   icon?: string;
   title?: string;
   description?: string;
 }
 
 interface FeaturesBlockProps {
   content: {
     items?: FeatureItem[];
   };
   settings: {
     columns?: number;
   };
 }
 
 const iconMap: Record<string, LucideIcon> = {
   Star, Heart, Zap, Shield, Check, Clock, Gift, Truck, Award, ThumbsUp,
 };
 
 export function FeaturesBlock({ content, settings }: FeaturesBlockProps) {
   const items = content.items || [];
   const columns = settings.columns || 3;
 
   const gridCols = {
     2: 'md:grid-cols-2',
     3: 'md:grid-cols-3',
     4: 'md:grid-cols-2 lg:grid-cols-4',
   }[columns] || 'md:grid-cols-3';
 
   return (
     <section className="py-12 lg:py-16">
       <div className="container">
         <div className={cn("grid grid-cols-1 gap-8", gridCols)}>
 	  {items.map((item, index) => {
             const IconComponent = item.icon ? iconMap[item.icon] : null;
 
             return (
               <div key={index} className="text-center">
                 {IconComponent && (
                   <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                     <IconComponent className="h-6 w-6" />
                   </div>
                 )}
                 <h3 className="font-medium text-lg mb-2">{item.title}</h3>
                 <p className="text-muted-foreground text-sm">{item.description}</p>
               </div>
             );
           })}
         </div>
       </div>
     </section>
   );
 }