 import { useState, useRef } from 'react';
 import { useCMSMedia, useUploadCMSMedia } from '@/hooks/useCMS';
 import { Button } from '@/components/ui/button';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Image, Upload, Loader2, Check } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface MediaPickerProps {
   value: string;
   onChange: (url: string) => void;
   label?: string;
   accept?: string;
 }
 
 export function MediaPicker({ value, onChange, label = 'Selecionar Imagem', accept = 'image/*' }: MediaPickerProps) {
   const [open, setOpen] = useState(false);
   const [urlInput, setUrlInput] = useState('');
   const fileInputRef = useRef<HTMLInputElement>(null);
   
   const { data: media, isLoading } = useCMSMedia();
   const uploadMedia = useUploadCMSMedia();
 
   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       const result = await uploadMedia.mutateAsync(file);
       onChange(result.url);
       setOpen(false);
     }
   };
 
   const handleSelectMedia = (url: string) => {
     onChange(url);
     setOpen(false);
   };
 
   const handleUrlSubmit = () => {
     if (urlInput.trim()) {
       onChange(urlInput.trim());
       setUrlInput('');
       setOpen(false);
     }
   };
 
   return (
     <div className="space-y-2">
       {value && (
         <div className="relative rounded-lg overflow-hidden bg-muted">
            /\.(mp4|webm|mov)(\?|$)/i.test(value)
              ? <video src={value} controls className="w-full h-32 object-cover" />
              : <img src={value} alt="Preview" className="w-full h-32 object-cover" />
         </div>
       )}
       
       <Dialog open={open} onOpenChange={setOpen}>
         <DialogTrigger asChild>
           <Button variant="outline" size="sm" className="w-full gap-2">
             <Image className="h-4 w-4" />
             {value ? 'Trocar Imagem' : label}
           </Button>
         </DialogTrigger>
         <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
           <DialogHeader>
             <DialogTitle>Selecionar Imagem</DialogTitle>
           </DialogHeader>
           
           <Tabs defaultValue="library" className="flex-1 flex flex-col overflow-hidden">
             <TabsList className="grid grid-cols-3 shrink-0">
               <TabsTrigger value="library">Biblioteca</TabsTrigger>
               <TabsTrigger value="upload">Upload</TabsTrigger>
               <TabsTrigger value="url">URL</TabsTrigger>
             </TabsList>
             
             <TabsContent value="library" className="flex-1 overflow-auto mt-4">
               {isLoading ? (
                 <div className="flex items-center justify-center h-40">
                   <Loader2 className="h-6 w-6 animate-spin" />
                 </div>
               ) : media && media.length > 0 ? (
                 <div className="grid grid-cols-4 gap-2">
                   {media.map((item) => (
                     <button
                       key={item.id}
                       onClick={() => handleSelectMedia(item.url)}
                       className={cn(
                         "relative aspect-square overflow-hidden rounded-lg border-2 transition-all hover:border-primary",
                         value === item.url ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                       )}
                     >
                       <img 
                         src={item.url} 
                         alt={item.alt_text || item.file_name}
                         className="w-full h-full object-cover"
                       />
                       {value === item.url && (
                         <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                           <Check className="h-6 w-6 text-primary" />
                         </div>
                       )}
                     </button>
                   ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                   <Image className="h-10 w-10 mb-2 opacity-50" />
                   <p className="text-sm">Nenhuma imagem na biblioteca</p>
                 </div>
               )}
             </TabsContent>
             
             <TabsContent value="upload" className="flex-1 mt-4">
               <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                 <input
                   ref={fileInputRef}
                   type="file"
                    accept={accept}
                   onChange={handleFileChange}
                   className="hidden"
                 />
                 <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                 <Button 
                   variant="outline" 
                   onClick={() => fileInputRef.current?.click()}
                   disabled={uploadMedia.isPending}
                 >
                   {uploadMedia.isPending ? (
                     <>
                       <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                       Enviando...
                     </>
                   ) : (
                     'Escolher Arquivo'
                   )}
                 </Button>
                  <p className="text-xs text-muted-foreground mt-2">Imagem ou vídeo compatível</p>
               </div>
             </TabsContent>
             
             <TabsContent value="url" className="flex-1 mt-4">
               <div className="space-y-4">
                 <div className="space-y-2">
                   <Label>URL da Imagem</Label>
                   <Input
                     value={urlInput}
                     onChange={(e) => setUrlInput(e.target.value)}
                     placeholder="https://..."
                   />
                 </div>
                 <Button onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
                   Usar URL
                 </Button>
               </div>
             </TabsContent>
           </Tabs>
         </DialogContent>
       </Dialog>
     </div>
   );
 }