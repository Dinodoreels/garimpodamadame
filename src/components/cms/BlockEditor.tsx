 import { useState, useEffect, useCallback } from 'react';
 import { type CMSSection, BLOCK_DEFINITIONS } from '@/hooks/useCMS';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Switch } from '@/components/ui/switch';
 import { Slider } from '@/components/ui/slider';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { X, Save, Loader2, Trash2, Plus } from 'lucide-react';
 import { MediaPicker } from './MediaPicker';
 import type { Json } from '@/integrations/supabase/types';
 
 interface BlockEditorProps {
   section: CMSSection;
   onUpdate: (sectionId: string, content: Json, settings: Json) => Promise<void>;
   onToggleVisibility?: (sectionId: string, isVisible: boolean) => Promise<void>;
   onClose: () => void;
 }
 
 export function BlockEditor({ section, onUpdate, onToggleVisibility, onClose }: BlockEditorProps) {
   const [content, setContent] = useState<Record<string, unknown>>(section.content as Record<string, unknown>);
   const [settings, setSettings] = useState<Record<string, unknown>>(section.settings as Record<string, unknown>);
   const [isSaving, setIsSaving] = useState(false);
 
   const blockDef = BLOCK_DEFINITIONS.find(b => b.type === section.type);
 
   // Reset state when section changes
   useEffect(() => {
     setContent(section.content as Record<string, unknown>);
     setSettings(section.settings as Record<string, unknown>);
   }, [section.id, section.content, section.settings]);
 
   const handleSave = async () => {
     setIsSaving(true);
     try {
       await onUpdate(section.id, content as Json, settings as Json);
     } finally {
       setIsSaving(false);
     }
   };
 
   const updateContent = (key: string, value: unknown) => {
     setContent(prev => ({ ...prev, [key]: value }));
   };
 
   const updateSettings = (key: string, value: unknown) => {
     setSettings(prev => ({ ...prev, [key]: value }));
   };
 
   return (
     <div className="h-full flex flex-col">
       {/* Header */}
       <div className="flex items-center justify-between p-4 border-b bg-muted/30">
         <div>
           <h3 className="font-medium text-sm">{blockDef?.label || section.type}</h3>
           <p className="text-xs text-muted-foreground">Editar propriedades</p>
         </div>
         <Button variant="ghost" size="icon" onClick={onClose}>
           <X className="h-4 w-4" />
         </Button>
       </div>
 
       {/* Visibility Toggle */}
       {onToggleVisibility && (
         <div className="flex items-center justify-between px-4 py-3 border-b">
           <div className="flex items-center gap-2">
             <Label htmlFor="visibility" className="text-sm">Visível</Label>
             {!section.is_visible && (
               <span className="text-xs text-muted-foreground">(oculto)</span>
             )}
           </div>
           <Switch 
             id="visibility"
             checked={section.is_visible} 
             onCheckedChange={(v) => onToggleVisibility(section.id, v)}
           />
         </div>
       )}
 
       {/* Form */}
       <div className="flex-1 overflow-auto p-4 space-y-4">
         {renderContentFields(section.type, content, updateContent)}
         
         <div className="border-t pt-4 mt-4">
           <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Configurações</p>
           {renderSettingsFields(section.type, settings, updateSettings)}
         </div>
       </div>
 
       {/* Footer */}
       <div className="p-4 border-t">
         <Button className="w-full" onClick={handleSave} disabled={isSaving}>
           {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
           Salvar Alterações
         </Button>
       </div>
     </div>
   );
 }
 
 function renderContentFields(
   type: string, 
   content: Record<string, unknown>, 
   update: (key: string, value: unknown) => void
 ) {
   switch (type) {
     case 'hero':
       return (
         <>
           <div className="space-y-2">
             <Label>Imagem de Fundo</Label>
             <MediaPicker 
               value={String(content.image_url || '')} 
               onChange={v => update('image_url', v)}
             />
           </div>
           <div className="space-y-2">
             <Label>Título</Label>
             <Input 
               value={String(content.title || '')} 
               onChange={e => update('title', e.target.value)} 
             />
           </div>
           <div className="space-y-2">
             <Label>Subtítulo</Label>
             <Input 
               value={String(content.subtitle || '')} 
               onChange={e => update('subtitle', e.target.value)} 
             />
           </div>
           <div className="space-y-2">
             <Label>Texto do Botão</Label>
             <Input 
               value={String(content.button_text || '')} 
               onChange={e => update('button_text', e.target.value)} 
             />
           </div>
           <div className="space-y-2">
             <Label>Link do Botão</Label>
             <Input 
               value={String(content.button_link || '')} 
               onChange={e => update('button_link', e.target.value)}
               placeholder="/catalog"
             />
           </div>
         </>
       );
 
     case 'text':
       return (
         <>
           <div className="space-y-2">
             <Label>Título (opcional)</Label>
             <Input 
               value={String(content.title || '')} 
               onChange={e => update('title', e.target.value)} 
             />
           </div>
           <div className="space-y-2">
             <Label>Conteúdo</Label>
             <Textarea 
               value={String(content.content || '')} 
               onChange={e => update('content', e.target.value)}
               rows={6}
             />
           </div>
         </>
       );
 
     case 'cta':
       return (
         <>
           <div className="space-y-2">
             <Label>Título</Label>
             <Input 
               value={String(content.title || '')} 
               onChange={e => update('title', e.target.value)} 
             />
           </div>
           <div className="space-y-2">
             <Label>Descrição</Label>
             <Textarea 
               value={String(content.description || '')} 
               onChange={e => update('description', e.target.value)}
               rows={3}
             />
           </div>
           <div className="space-y-2">
             <Label>Texto do Botão</Label>
             <Input 
               value={String(content.button_text || '')} 
               onChange={e => update('button_text', e.target.value)} 
             />
           </div>
           <div className="space-y-2">
             <Label>Link do Botão</Label>
             <Input 
               value={String(content.button_link || '')} 
               onChange={e => update('button_link', e.target.value)} 
             />
           </div>
         </>
       );
 
     case 'image':
       return (
         <>
           <div className="space-y-2">
             <Label>Imagem</Label>
             <MediaPicker 
               value={String(content.url || '')} 
               onChange={v => update('url', v)}
             />
           </div>
           <div className="space-y-2">
             <Label>Texto Alternativo</Label>
             <Input 
               value={String(content.alt_text || '')} 
               onChange={e => update('alt_text', e.target.value)} 
             />
           </div>
           <div className="space-y-2">
             <Label>Legenda (opcional)</Label>
             <Input 
               value={String(content.caption || '')} 
               onChange={e => update('caption', e.target.value)} 
             />
           </div>
         </>
       );
 
     case 'products':
       return (
         <>
           <div className="space-y-2">
             <Label>Título</Label>
             <Input 
               value={String(content.title || '')} 
               onChange={e => update('title', e.target.value)} 
             />
           </div>
           <div className="space-y-2">
             <Label>Subtítulo</Label>
             <Input 
               value={String(content.subtitle || '')} 
               onChange={e => update('subtitle', e.target.value)} 
             />
           </div>
           <div className="space-y-2">
             <Label>Filtro</Label>
             <Select value={String(content.filter || 'all')} onValueChange={v => update('filter', v)}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos</SelectItem>
                 <SelectItem value="new">Novidades</SelectItem>
                 <SelectItem value="promo">Promoções</SelectItem>
               </SelectContent>
             </Select>
           </div>
           <div className="space-y-2">
             <Label>Limite de Produtos</Label>
             <Input 
               type="number"
               value={Number(content.limit || 8)} 
               onChange={e => update('limit', parseInt(e.target.value) || 8)} 
             />
           </div>
         </>
       );
 
     case 'video':
       return (
         <div className="space-y-2">
           <Label>URL do YouTube</Label>
           <Input 
             value={String(content.url || '')} 
             onChange={e => update('url', e.target.value)}
             placeholder="https://youtube.com/watch?v=..."
           />
         </div>
       );
 
     case 'features':
       return (
         <FeaturesEditor content={content} update={update} />
       );
 
     case 'testimonials':
       return (
         <TestimonialsEditor content={content} update={update} />
       );
 
     case 'gallery':
       return (
         <GalleryEditor content={content} update={update} />
       );
 
     case 'form':
       return (
         <FormEditor content={content} update={update} />
       );
 
     default:
       return (
         <p className="text-sm text-muted-foreground">
           Editor para o bloco "{type}" em desenvolvimento.
         </p>
       );
   }
 }
 
 function renderSettingsFields(
   type: string, 
   settings: Record<string, unknown>, 
   update: (key: string, value: unknown) => void
 ) {
   switch (type) {
     case 'hero':
       return (
         <>
           <div className="space-y-2">
           <Label>Opacidade do Overlay ({String(settings.overlay_opacity || 50)}%)</Label>
             <Slider 
               value={[Number(settings.overlay_opacity || 50)]}
               onValueChange={([v]) => update('overlay_opacity', v)}
               max={100}
               step={5}
             />
           </div>
           <div className="space-y-2">
             <Label>Alinhamento do Texto</Label>
             <Select value={String(settings.text_align || 'center')} onValueChange={v => update('text_align', v)}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="left">Esquerda</SelectItem>
                 <SelectItem value="center">Centro</SelectItem>
                 <SelectItem value="right">Direita</SelectItem>
               </SelectContent>
             </Select>
           </div>
           <div className="space-y-2">
             <Label>Altura</Label>
             <Select value={String(settings.height || 'full')} onValueChange={v => update('height', v)}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="small">Pequeno</SelectItem>
                 <SelectItem value="medium">Médio</SelectItem>
                 <SelectItem value="full">Tela Cheia</SelectItem>
               </SelectContent>
             </Select>
           </div>
         </>
       );
 
     case 'text':
       return (
         <div className="space-y-2">
           <Label>Alinhamento</Label>
           <Select value={String(settings.align || 'left')} onValueChange={v => update('align', v)}>
             <SelectTrigger>
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="left">Esquerda</SelectItem>
               <SelectItem value="center">Centro</SelectItem>
               <SelectItem value="right">Direita</SelectItem>
             </SelectContent>
           </Select>
         </div>
       );
 
     case 'spacer':
       return (
         <div className="space-y-2">
           <Label>Altura (px): {String(settings.height || 64)}</Label>
           <Slider 
             value={[Number(settings.height || 64)]}
             onValueChange={([v]) => update('height', v)}
             min={16}
             max={200}
             step={8}
           />
         </div>
       );
 
     case 'video':
       return (
         <>
           <div className="flex items-center justify-between">
             <Label>Autoplay</Label>
             <Switch 
               checked={Boolean(settings.autoplay)} 
               onCheckedChange={v => update('autoplay', v)} 
             />
           </div>
           <div className="flex items-center justify-between">
             <Label>Mudo</Label>
             <Switch 
               checked={Boolean(settings.muted)} 
               onCheckedChange={v => update('muted', v)} 
             />
           </div>
         </>
       );
 
     case 'features':
     case 'gallery':
       return (
         <div className="space-y-2">
           <Label>Colunas</Label>
           <Select value={String(settings.columns || 3)} onValueChange={v => update('columns', parseInt(v))}>
             <SelectTrigger>
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="2">2 Colunas</SelectItem>
               <SelectItem value="3">3 Colunas</SelectItem>
               <SelectItem value="4">4 Colunas</SelectItem>
             </SelectContent>
           </Select>
         </div>
       );
 
     case 'testimonials':
       return (
         <div className="space-y-2">
           <Label>Colunas</Label>
           <Select value={String(settings.columns || 2)} onValueChange={v => update('columns', parseInt(v))}>
             <SelectTrigger>
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="1">1 Coluna</SelectItem>
               <SelectItem value="2">2 Colunas</SelectItem>
               <SelectItem value="3">3 Colunas</SelectItem>
             </SelectContent>
           </Select>
         </div>
       );
 
     case 'divider':
       return (
         <>
           <div className="space-y-2">
             <Label>Estilo</Label>
             <Select value={String(settings.style || 'solid')} onValueChange={v => update('style', v)}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="solid">Sólido</SelectItem>
                 <SelectItem value="dashed">Tracejado</SelectItem>
                 <SelectItem value="dotted">Pontilhado</SelectItem>
               </SelectContent>
             </Select>
           </div>
           <div className="space-y-2">
             <Label>Cor</Label>
             <Select value={String(settings.color || 'border')} onValueChange={v => update('color', v)}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="border">Padrão</SelectItem>
                 <SelectItem value="muted">Claro</SelectItem>
                 <SelectItem value="foreground">Escuro</SelectItem>
               </SelectContent>
             </Select>
           </div>
         </>
       );
 
     default:
       return (
         <p className="text-xs text-muted-foreground">
           Sem configurações adicionais.
         </p>
       );
   }
 }
 
 // =============================================
 // FEATURES EDITOR
 // =============================================
 
 interface FeatureItem {
   icon?: string;
   title?: string;
   description?: string;
 }
 
 function FeaturesEditor({ 
   content, 
   update 
 }: { 
   content: Record<string, unknown>; 
   update: (key: string, value: unknown) => void;
 }) {
   const items = (content.items as FeatureItem[]) || [];
   
   const ICON_OPTIONS = ['Star', 'Heart', 'Zap', 'Shield', 'Check', 'Clock', 'Gift', 'Truck', 'Award', 'ThumbsUp'];
 
   const updateItem = (index: number, key: string, value: string) => {
     const newItems = [...items];
     newItems[index] = { ...newItems[index], [key]: value };
     update('items', newItems);
   };
 
   const addItem = () => {
     update('items', [...items, { icon: 'Star', title: 'Novo Item', description: 'Descrição' }]);
   };
 
   const removeItem = (index: number) => {
     update('items', items.filter((_, i) => i !== index));
   };
 
   return (
     <div className="space-y-4">
       <div className="flex items-center justify-between">
         <Label>Recursos ({items.length})</Label>
         <Button variant="outline" size="sm" onClick={addItem}>
           <Plus className="h-3 w-3 mr-1" />
           Adicionar
         </Button>
       </div>
       
       {items.map((item, index) => (
         <div key={index} className="border rounded-lg p-3 space-y-3">
           <div className="flex items-center justify-between">
             <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(index)}>
               <Trash2 className="h-3 w-3 text-destructive" />
             </Button>
           </div>
           <Select value={item.icon || 'Star'} onValueChange={v => updateItem(index, 'icon', v)}>
             <SelectTrigger className="h-8 text-xs">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {ICON_OPTIONS.map(icon => (
                 <SelectItem key={icon} value={icon}>{icon}</SelectItem>
               ))}
             </SelectContent>
           </Select>
           <Input 
             placeholder="Título"
             value={item.title || ''} 
             onChange={e => updateItem(index, 'title', e.target.value)}
             className="h-8 text-sm"
           />
           <Textarea 
             placeholder="Descrição"
             value={item.description || ''} 
             onChange={e => updateItem(index, 'description', e.target.value)}
             rows={2}
             className="text-sm"
           />
         </div>
       ))}
     </div>
   );
 }
 
 // =============================================
 // TESTIMONIALS EDITOR
 // =============================================
 
 interface TestimonialItem {
   name?: string;
   text?: string;
   photo?: string;
 }
 
 function TestimonialsEditor({ 
   content, 
   update 
 }: { 
   content: Record<string, unknown>; 
   update: (key: string, value: unknown) => void;
 }) {
   const items = (content.items as TestimonialItem[]) || [];
 
   const updateItem = (index: number, key: string, value: string) => {
     const newItems = [...items];
     newItems[index] = { ...newItems[index], [key]: value };
     update('items', newItems);
   };
 
   const addItem = () => {
     update('items', [...items, { name: 'Cliente', text: 'Depoimento aqui...', photo: '' }]);
   };
 
   const removeItem = (index: number) => {
     update('items', items.filter((_, i) => i !== index));
   };
 
   return (
     <div className="space-y-4">
       <div className="flex items-center justify-between">
         <Label>Depoimentos ({items.length})</Label>
         <Button variant="outline" size="sm" onClick={addItem}>
           <Plus className="h-3 w-3 mr-1" />
           Adicionar
         </Button>
       </div>
       
       {items.map((item, index) => (
         <div key={index} className="border rounded-lg p-3 space-y-3">
           <div className="flex items-center justify-between">
             <span className="text-xs font-medium text-muted-foreground">Depoimento {index + 1}</span>
             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(index)}>
               <Trash2 className="h-3 w-3 text-destructive" />
             </Button>
           </div>
           <MediaPicker 
             value={item.photo || ''} 
             onChange={v => updateItem(index, 'photo', v)}
             label="Foto"
           />
           <Input 
             placeholder="Nome"
             value={item.name || ''} 
             onChange={e => updateItem(index, 'name', e.target.value)}
             className="h-8 text-sm"
           />
           <Textarea 
             placeholder="Depoimento"
             value={item.text || ''} 
             onChange={e => updateItem(index, 'text', e.target.value)}
             rows={3}
             className="text-sm"
           />
         </div>
       ))}
     </div>
   );
 }
 
 // =============================================
 // GALLERY EDITOR
 // =============================================
 
 function GalleryEditor({ 
   content, 
   update 
 }: { 
   content: Record<string, unknown>; 
   update: (key: string, value: unknown) => void;
 }) {
   const images = (content.images as string[]) || [];
 
   const addImage = (url: string) => {
     if (url) {
       update('images', [...images, url]);
     }
   };
 
   const removeImage = (index: number) => {
     update('images', images.filter((_, i) => i !== index));
   };
 
   return (
     <div className="space-y-4">
       <div className="flex items-center justify-between">
         <Label>Imagens ({images.length})</Label>
       </div>
       
       {images.length > 0 && (
         <div className="grid grid-cols-3 gap-2">
           {images.map((url, index) => (
             <div key={index} className="relative group aspect-square">
               <img 
                 src={url} 
                 alt={`Gallery ${index + 1}`}
                 className="w-full h-full object-cover rounded-md"
               />
               <Button
                 variant="destructive"
                 size="icon"
                 className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                 onClick={() => removeImage(index)}
               >
                 <Trash2 className="h-3 w-3" />
               </Button>
             </div>
           ))}
         </div>
       )}
       
       <MediaPicker 
         value=""
         onChange={addImage}
         label="+ Adicionar Imagem"
       />
     </div>
   );
 }
 
 // =============================================
 // FORM EDITOR
 // =============================================
 
 interface FormField {
   name: string;
   label: string;
   type: 'text' | 'email' | 'tel' | 'textarea';
   required: boolean;
 }
 
 function FormEditor({ 
   content, 
   update 
 }: { 
   content: Record<string, unknown>; 
   update: (key: string, value: unknown) => void;
 }) {
   const fields = (content.fields as FormField[]) || [];
 
   const updateField = (index: number, key: string, value: unknown) => {
     const newFields = [...fields];
     newFields[index] = { ...newFields[index], [key]: value };
     update('fields', newFields);
   };
 
   const addField = () => {
     update('fields', [...fields, { name: `field_${Date.now()}`, label: 'Novo Campo', type: 'text', required: false }]);
   };
 
   const removeField = (index: number) => {
     update('fields', fields.filter((_, i) => i !== index));
   };
 
   return (
     <div className="space-y-4">
       {/* Title & Description */}
       <div className="space-y-2">
         <Label>Título</Label>
         <Input 
           value={String(content.title || '')} 
           onChange={e => update('title', e.target.value)} 
         />
       </div>
       <div className="space-y-2">
         <Label>Descrição</Label>
         <Textarea 
           value={String(content.description || '')} 
           onChange={e => update('description', e.target.value)}
           rows={2}
         />
       </div>
 
       {/* Fields */}
       <div className="border-t pt-4">
         <div className="flex items-center justify-between mb-3">
           <Label>Campos ({fields.length})</Label>
           <Button variant="outline" size="sm" onClick={addField}>
             <Plus className="h-3 w-3 mr-1" />
             Adicionar
           </Button>
         </div>
         
         {fields.map((field, index) => (
           <div key={index} className="border rounded-lg p-3 space-y-2 mb-2">
             <div className="flex items-center justify-between">
               <span className="text-xs font-medium text-muted-foreground">Campo {index + 1}</span>
               <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeField(index)}>
                 <Trash2 className="h-3 w-3 text-destructive" />
               </Button>
             </div>
             <Input 
               placeholder="Label"
               value={field.label || ''} 
               onChange={e => updateField(index, 'label', e.target.value)}
               className="h-8 text-sm"
             />
             <div className="flex gap-2">
               <Select value={field.type} onValueChange={v => updateField(index, 'type', v)}>
                 <SelectTrigger className="h-8 text-xs flex-1">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="text">Texto</SelectItem>
                   <SelectItem value="email">E-mail</SelectItem>
                   <SelectItem value="tel">Telefone</SelectItem>
                   <SelectItem value="textarea">Área de Texto</SelectItem>
                 </SelectContent>
               </Select>
               <div className="flex items-center gap-1">
                 <Switch 
                   checked={field.required} 
                   onCheckedChange={v => updateField(index, 'required', v)}
                 />
                 <span className="text-xs text-muted-foreground">Obrig.</span>
               </div>
             </div>
           </div>
         ))}
       </div>
 
       {/* Button & WhatsApp */}
       <div className="border-t pt-4 space-y-3">
         <div className="space-y-2">
           <Label>Texto do Botão</Label>
           <Input 
             value={String(content.button_text || '')} 
             onChange={e => update('button_text', e.target.value)} 
           />
         </div>
         <div className="space-y-2">
           <Label>Mensagem de Sucesso</Label>
           <Input 
             value={String(content.success_message || '')} 
             onChange={e => update('success_message', e.target.value)} 
           />
         </div>
         <div className="space-y-2">
           <Label>Número WhatsApp (com DDD)</Label>
           <Input 
             value={String(content.whatsapp_number || '')} 
             onChange={e => update('whatsapp_number', e.target.value)} 
             placeholder="5511999999999"
           />
           <p className="text-xs text-muted-foreground">
             Deixe vazio para não enviar via WhatsApp
           </p>
         </div>
       </div>
     </div>
   );
 }