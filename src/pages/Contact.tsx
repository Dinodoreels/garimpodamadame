import { useState } from 'react';
import { Phone, Mail, MapPin, Send, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useCMSPageBySlugOrHome } from '@/hooks/useCMS';
import { CMSPageRenderer } from '@/components/cms/CMSPageRenderer';
import { useCMSThemeContext } from '@/providers/CMSThemeProvider';
import { useSiteContent } from '@/hooks/useSiteContent';
import { useIntegrations } from '@/hooks/useIntegrations';

interface ContactContent {
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  show_hero_text: boolean;
  form_title: string;
  whatsapp_title: string;
  whatsapp_description: string;
  info_title: string;
}

function StaticContactPage() {
  const theme = useCMSThemeContext();
  const social = (theme?.social as Record<string, string>) || {};
  const { data: intConfig } = useIntegrations();
  const whatsappNumber = intConfig?.contact_phone || social.whatsapp || '5511999999999';
  const emailContact = intConfig?.contact_email || social.email || 'atendimento@principeimports.com.br';
  const addressText = social.address || 'Envio a partir de São Paulo - SP';
  const hoursText = social.hours || 'De segunda a sábado, das 9h às 18h';

  const { data: content } = useSiteContent<ContactContent>('contact_content');

  const hero_title = content?.hero_title || 'Precisa falar com a gente?';
  const hero_subtitle = content?.hero_subtitle || 'Estamos prontos para atender você. Escolha o canal de sua preferência.';
  const form_title = content?.form_title || 'Envie sua mensagem';
  const whatsapp_title = content?.whatsapp_title || 'Atendimento direto no WhatsApp';
  const whatsapp_description = content?.whatsapp_description || 'Prefere um atendimento mais direto? Fale conosco pelo WhatsApp e tire suas dúvidas em tempo real.';
  const info_title = content?.info_title || 'Informações Importantes';
  const hero_image = content?.hero_image || '';

  const infoItems = [
    { icon: MapPin, label: 'Endereço', value: addressText },
    { icon: Clock, label: 'Suporte de Pedidos', value: hoursText },
    { icon: Mail, label: 'E-mail de Suporte', value: emailContact },
  ];

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Mensagem enviada!', { description: 'Entraremos em contato em breve.' });
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative bg-primary text-primary-foreground py-16 lg:py-20 overflow-hidden">
          {hero_image && (
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${hero_image})` }} />
          )}
          {hero_image && <div className="absolute inset-0 bg-black/60" />}
          <div className="container relative z-10">
            {content?.show_hero_text !== false && (
              <>
                <span className="inline-block border border-chrome text-chrome px-4 py-1 rounded-full text-sm font-medium mb-6">Contato</span>
                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">{hero_title}</h1>
                <p className="text-lg text-muted-foreground max-w-lg">{hero_subtitle}</p>
              </>
            )}
          </div>
        </section>

        <section className="py-12 lg:py-20">
          <div className="container relative z-10">
            <div className="grid lg:grid-cols-2 gap-12">
              <Card className="border-border">
                <CardContent className="pt-6">
                  <h2 className="font-display text-xl font-bold mb-6">{form_title}</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div><Label htmlFor="name">Nome</Label><Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Seu nome" required /></div>
                      <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="seu@email.com" required /></div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div><Label htmlFor="phone">Telefone</Label><Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(11) 99999-9999" /></div>
                      <div><Label htmlFor="subject">Assunto</Label><Input id="subject" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="Sobre o que deseja falar?" /></div>
                    </div>
                    <div><Label htmlFor="message">Mensagem</Label><Textarea id="message" value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="Escreva sua mensagem aqui..." rows={5} required /></div>
                    <Button type="submit" className="w-full bg-chrome hover:bg-chrome-dark text-primary" disabled={isSubmitting}>
                      <Send className="h-4 w-4 mr-2" />{isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="space-y-8">
                <Card className="bg-primary text-primary-foreground border-0">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center"><MessageCircle className="h-6 w-6 text-white" /></div>
                      <div>
                        <h3 className="font-semibold text-lg">{whatsapp_title}</h3>
                        <p className="text-sm text-muted-foreground">Resposta rápida e personalizada</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-6">{whatsapp_description}</p>
                    <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"><Phone className="h-4 w-4 mr-2" />Chamar no WhatsApp</Button>
                    </a>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-6">{info_title}</h3>
                    <div className="space-y-4">
                      {infoItems.map(item => (
                        <div key={item.label} className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-chrome/10 flex items-center justify-center flex-shrink-0"><item.icon className="h-5 w-5 text-chrome" /></div>
                          <div><p className="text-sm text-muted-foreground">{item.label}</p><p className="font-medium">{item.value}</p></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      
    </div>
  );
}

export default function Contact() {
  const { data: cmsPage, isLoading } = useCMSPageBySlugOrHome('contact');

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12">
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-32 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (cmsPage) return <CMSPageRenderer page={cmsPage} />;
  return <StaticContactPage />;
}
