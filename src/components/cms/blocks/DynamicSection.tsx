 import { type CMSSection } from '@/hooks/useCMS';
 import { HeroBlock } from './HeroBlock';
 import { TextBlock } from './TextBlock';
 import { CTABlock } from './CTABlock';
 import { ProductsBlock } from './ProductsBlock';
 import { ImageBlock } from './ImageBlock';
 import { FeaturesBlock } from './FeaturesBlock';
 import { TestimonialsBlock } from './TestimonialsBlock';
 import { GalleryBlock } from './GalleryBlock';
 import { VideoBlock } from './VideoBlock';
 import { SpacerBlock } from './SpacerBlock';
 import { DividerBlock } from './DividerBlock';
 import { FormBlock } from './FormBlock';
 
 interface DynamicSectionProps {
   section: CMSSection;
 }
 
 export function DynamicSection({ section }: DynamicSectionProps) {
   if (!section.is_visible) return null;
 
   const content = section.content as Record<string, unknown>;
   const settings = section.settings as Record<string, unknown>;
 
   switch (section.type) {
     case 'hero':
       return <HeroBlock content={content} settings={settings} />;
     case 'text':
       return <TextBlock content={content} settings={settings} />;
     case 'cta':
       return <CTABlock content={content} settings={settings} />;
     case 'products':
       return <ProductsBlock content={content} />;
     case 'image':
       return <ImageBlock content={content} settings={settings} />;
     case 'features':
       return <FeaturesBlock content={content} settings={settings} />;
     case 'testimonials':
       return <TestimonialsBlock content={content} settings={settings} />;
     case 'gallery':
       return <GalleryBlock content={content} settings={settings} />;
     case 'video':
       return <VideoBlock content={content} settings={settings} />;
     case 'spacer':
       return <SpacerBlock settings={settings} />;
     case 'divider':
       return <DividerBlock settings={settings} />;
     case 'form':
       return <FormBlock content={content} settings={settings} />;
     default:
       return null;
   }
 }