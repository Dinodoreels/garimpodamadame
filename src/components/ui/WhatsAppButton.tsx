import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCMSThemeContext } from '@/providers/CMSThemeProvider';
import { useIntegrations } from '@/hooks/useIntegrations';

interface WhatsAppButtonProps {
  message?: string;
  className?: string;
  variant?: 'floating' | 'inline';
}

export function WhatsAppButton({ 
  message = 'Olá! Gostaria de mais informações.',
  className = '',
  variant = 'floating'
}: WhatsAppButtonProps) {
  const theme = useCMSThemeContext();
  const social = (theme?.social as Record<string, string>) || {};
  const { data: intConfig } = useIntegrations();
  const phoneNumber = intConfig?.contact_phone || social.whatsapp || '5511999999999';
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  if (variant === 'floating') {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-[5.5rem] md:bottom-6 right-4 md:right-6 z-40 bg-green-500 hover:bg-green-600 text-white p-3 md:p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    );
  }

  return (
    <Button
      asChild
      className={`bg-green-500 hover:bg-green-600 text-white ${className}`}
    >
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-5 w-5 mr-2" />
        WhatsApp
      </a>
    </Button>
  );
}