import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CheckCircle, Send, Loader2 } from 'lucide-react';
import { useCMSThemeContext } from '@/providers/CMSThemeProvider';
import { useIntegrations } from '@/hooks/useIntegrations';
 
 interface FormField {
   name: string;
   label: string;
   type: 'text' | 'email' | 'tel' | 'textarea';
   required: boolean;
   placeholder?: string;
 }
 
 interface FormBlockProps {
   content: {
     title?: string;
     description?: string;
     fields?: FormField[];
     button_text?: string;
     success_message?: string;
     whatsapp_number?: string;
   };
   settings: {
     action?: 'whatsapp' | 'message';
     show_border?: boolean;
   };
 }
 
export function FormBlock({ content, settings }: FormBlockProps) {
    const theme = useCMSThemeContext();
    const { data: intConfig } = useIntegrations();
    const globalWhatsapp = intConfig?.contact_phone || (theme?.social as Record<string, string>)?.whatsapp || '';
    const [formData, setFormData] = useState<Record<string, string>>({});
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [submitted, setSubmitted] = useState(false);
   const [errors, setErrors] = useState<Record<string, string>>({});
 
   const fields: FormField[] = content.fields || [
     { name: 'name', label: 'Nome', type: 'text', required: true },
     { name: 'email', label: 'E-mail', type: 'email', required: true },
     { name: 'phone', label: 'Telefone', type: 'tel', required: false },
     { name: 'message', label: 'Mensagem', type: 'textarea', required: true },
   ];
 
   const validateForm = (): boolean => {
     const newErrors: Record<string, string> = {};
     
     fields.forEach(field => {
       const value = formData[field.name]?.trim() || '';
       
       if (field.required && !value) {
         newErrors[field.name] = `${field.label} é obrigatório`;
       }
       
       if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
         newErrors[field.name] = 'E-mail inválido';
       }
     });
     
     setErrors(newErrors);
     return Object.keys(newErrors).length === 0;
   };
 
   const handleSubmit = async (e: FormEvent) => {
     e.preventDefault();
     
     if (!validateForm()) return;
     
     setIsSubmitting(true);
     
     try {
        const whatsappNumber = content.whatsapp_number || globalWhatsapp;
        if (settings.action === 'whatsapp' && whatsappNumber) {
         // Format message for WhatsApp
         const messageParts = fields.map(field => {
           const value = formData[field.name] || '';
           return `*${field.label}:* ${value}`;
         });
         const message = messageParts.join('\n');
         
          // Clean phone number
          const phone = whatsappNumber.replace(/\D/g, '');
         
         window.open(
           `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
           '_blank'
         );
       }
       
       // Simulate delay for better UX
       await new Promise(resolve => setTimeout(resolve, 500));
       
       setSubmitted(true);
     } finally {
       setIsSubmitting(false);
     }
   };
 
   const handleChange = (name: string, value: string) => {
     setFormData(prev => ({ ...prev, [name]: value }));
     // Clear error when user types
     if (errors[name]) {
       setErrors(prev => ({ ...prev, [name]: '' }));
     }
   };
 
   if (submitted) {
     return (
       <section className="py-12 lg:py-20">
         <div className="container max-w-lg text-center">
           <div className="flex flex-col items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
             </div>
             <h3 className="font-display text-2xl">
               {content.success_message || 'Mensagem enviada com sucesso!'}
             </h3>
             <p className="text-muted-foreground">
               Entraremos em contato em breve.
             </p>
             <Button 
               variant="outline" 
               onClick={() => {
                 setSubmitted(false);
                 setFormData({});
               }}
             >
               Enviar outra mensagem
             </Button>
           </div>
         </div>
       </section>
     );
   }
 
   return (
     <section className="py-12 lg:py-20">
       <div className="container max-w-2xl">
         {(content.title || content.description) && (
           <div className="text-center mb-8">
             {content.title && (
               <h2 className="font-display text-3xl lg:text-4xl font-light mb-3">
                 {content.title}
               </h2>
             )}
             {content.description && (
               <p className="text-muted-foreground max-w-md mx-auto">
                 {content.description}
               </p>
             )}
           </div>
         )}
 
         <form 
           onSubmit={handleSubmit}
           className={cn(
             "space-y-6",
             settings.show_border && "border rounded-lg p-6 lg:p-8"
           )}
         >
           <div className="grid gap-6 sm:grid-cols-2">
             {fields.map((field) => {
               const isFullWidth = field.type === 'textarea';
               
               return (
                 <div 
                   key={field.name} 
                   className={cn("space-y-2", isFullWidth && "sm:col-span-2")}
                 >
                   <Label htmlFor={field.name}>
                     {field.label}
                     {field.required && <span className="text-destructive ml-1">*</span>}
                   </Label>
                   
                   {field.type === 'textarea' ? (
                     <Textarea
                       id={field.name}
                       value={formData[field.name] || ''}
                       onChange={(e) => handleChange(field.name, e.target.value)}
                       placeholder={field.placeholder}
                       rows={5}
                       className={cn(errors[field.name] && "border-destructive")}
                     />
                   ) : (
                     <Input
                       id={field.name}
                       type={field.type}
                       value={formData[field.name] || ''}
                       onChange={(e) => handleChange(field.name, e.target.value)}
                       placeholder={field.placeholder}
                       className={cn(errors[field.name] && "border-destructive")}
                     />
                   )}
                   
                   {errors[field.name] && (
                     <p className="text-xs text-destructive">{errors[field.name]}</p>
                   )}
                 </div>
               );
             })}
           </div>
 
           <Button 
             type="submit" 
             size="lg" 
             className="w-full sm:w-auto"
             disabled={isSubmitting}
           >
             {isSubmitting ? (
               <Loader2 className="h-4 w-4 mr-2 animate-spin" />
             ) : (
               <Send className="h-4 w-4 mr-2" />
             )}
             {content.button_text || 'Enviar'}
           </Button>
         </form>
       </div>
     </section>
   );
 }