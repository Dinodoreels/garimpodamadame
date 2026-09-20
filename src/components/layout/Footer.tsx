import { Link } from 'react-router-dom';
import { Instagram, Phone, Mail, Shield, CreditCard, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { useCMSThemeContext } from '@/providers/CMSThemeProvider';
import { useIntegrations } from '@/hooks/useIntegrations';

export function Footer() {
  const [email, setEmail] = useState('');
   const theme = useCMSThemeContext();
   const { data: intConfig } = useIntegrations();
   
   // Use theme values or defaults — integrations config takes priority
   const siteName = intConfig?.store_name || theme?.name || 'O Garimpo Digital';
   const whatsappNumber = intConfig?.contact_phone || (theme?.social as Record<string, string>)?.whatsapp || '';
   const instagramHandle = (theme?.social as Record<string, string>)?.instagram || '';
   const logoUrl = theme?.logo_url || logo;
   
   // Dynamic texts
   const texts = ((theme as unknown as Record<string, unknown>)?.texts || {}) as Record<string, string>;
   const tagline = texts.footer_tagline || 'Achados especiais para você.';
   const description = texts.footer_description || 'Produtos selecionados com cuidado e atendimento personalizado.';
   const newsletterTitle = texts.footer_newsletter_title || 'Fique por dentro';
   const newsletterSubtitle = texts.footer_newsletter_subtitle || 'Receba novidades e ofertas exclusivas em primeira mão.';
   const contactEmail = intConfig?.contact_email || (theme?.social as Record<string, string>)?.email || texts.footer_email || '';
   const security1 = texts.footer_security_1 || 'Site 100% Seguro';
   const security2 = texts.footer_security_2 || 'Pix, crédito e débito';
   const security3 = texts.footer_security_3 || 'Entrega para todo Brasil';

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      toast.success('Inscrito com sucesso!', {
        description: 'Você receberá novidades em primeira mão.',
        position: 'top-center'
      });
      setEmail('');
    }
  };

  return (
    <footer className="bg-primary text-primary-foreground pb-20 md:pb-0">
      <div className="container py-12 lg:py-16">
        {/* Newsletter Section */}
        <div className="mb-12 pb-12 border-b border-border/20">
          <div className="max-w-md mx-auto text-center">
            <h3 className="font-display text-xl mb-2">{newsletterTitle}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {newsletterSubtitle}
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <Input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 h-12"
                required
              />
              <Button 
                type="submit" 
                className="bg-chrome hover:bg-chrome-dark text-white px-6 h-12 min-w-[100px]"
              >
                INSCREVER
              </Button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoUrl} alt={siteName} className="h-12 w-auto" />
              <span className="font-display text-lg font-semibold">
               {siteName}
              </span>
            </Link>
            <p className="font-display text-lg text-primary-foreground/80">
              {tagline}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {description}
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              {instagramHandle && <a 
               href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-all hover:scale-110 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Instagram className="h-5 w-5" />
              </a>}
              {whatsappNumber && <a 
               href={`https://wa.me/${whatsappNumber}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-all hover:scale-110 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Phone className="h-5 w-5" />
              </a>}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Navegação</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-chrome transition-colors min-h-[44px] flex items-center">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/releases" className="text-sm text-muted-foreground hover:text-chrome transition-colors min-h-[44px] flex items-center">
                  Lançamentos
                </Link>
              </li>
              <li>
                <Link to="/catalog" className="text-sm text-muted-foreground hover:text-chrome transition-colors min-h-[44px] flex items-center">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link to="/lote" className="text-sm text-muted-foreground hover:text-chrome transition-colors min-h-[44px] flex items-center">
                  Lotes
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-chrome transition-colors min-h-[44px] flex items-center">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/order-tracking" className="text-sm text-muted-foreground hover:text-chrome transition-colors min-h-[44px] flex items-center">
                  Rastrear Pedido
                </Link>
              </li>
            </ul>

            <h3 className="font-display text-lg font-semibold mb-4 mt-6">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/termos" className="text-sm text-muted-foreground hover:text-chrome transition-colors min-h-[44px] flex items-center">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-sm text-muted-foreground hover:text-chrome transition-colors min-h-[44px] flex items-center">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-sm text-muted-foreground hover:text-chrome transition-colors min-h-[44px] flex items-center">
                  Política de Cookies
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Contato</h3>
            <ul className="space-y-3">
              {whatsappNumber && <li className="flex items-center gap-3 text-sm text-muted-foreground min-h-[44px]">
                <Phone className="h-4 w-4 text-chrome flex-shrink-0" />
               <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="hover:text-chrome transition-colors">
                 +{whatsappNumber.slice(0,2)} {whatsappNumber.slice(2,4)} {whatsappNumber.slice(4,9)}-{whatsappNumber.slice(9)}
                </a>
              </li>}
              {contactEmail && <li className="flex items-center gap-3 text-sm text-muted-foreground min-h-[44px]">
                <Mail className="h-4 w-4 text-chrome flex-shrink-0" />
                <span>{contactEmail}</span>
              </li>}
              {instagramHandle && <li className="flex items-center gap-3 text-sm text-muted-foreground min-h-[44px]">
                <Instagram className="h-4 w-4 text-chrome flex-shrink-0" />
               <a href={`https://instagram.com/${instagramHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-chrome transition-colors">
                 {instagramHandle}
                </a>
              </li>}
            </ul>
          </div>

          {/* Security Badges */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Segurança</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Shield className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>{security1}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <CreditCard className="h-5 w-5 text-chrome flex-shrink-0" />
                <span>{security2}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Truck className="h-5 w-5 text-chrome flex-shrink-0" />
                <span>{security3}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/20 mt-10 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
           © {new Date().getFullYear()} {siteName}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
