 interface SpacerBlockProps {
   settings: {
     height?: number;
   };
 }
 
 export function SpacerBlock({ settings }: SpacerBlockProps) {
   const height = settings.height || 64;
 
   return <div style={{ height: `${height}px` }} />;
 }