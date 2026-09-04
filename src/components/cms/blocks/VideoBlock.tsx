 interface VideoBlockProps {
   content: {
     url?: string;
   };
   settings: {
     autoplay?: boolean;
     muted?: boolean;
   };
 }
 
 function getYouTubeId(url: string): string | null {
   const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?/]+)/);
   return match ? match[1] : null;
 }
 
 export function VideoBlock({ content, settings }: VideoBlockProps) {
   if (!content.url) return null;
 
   const videoId = getYouTubeId(content.url);
   if (!videoId) return null;
 
   const params = new URLSearchParams({
     autoplay: settings.autoplay ? '1' : '0',
     mute: settings.muted ? '1' : '0',
     rel: '0',
   });
 
   return (
     <section className="py-8">
       <div className="container max-w-4xl mx-auto">
         <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
           <iframe
             src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
             title="Video"
             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
             allowFullScreen
             className="absolute inset-0 w-full h-full"
           />
         </div>
       </div>
     </section>
   );
 }