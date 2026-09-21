import { forwardRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useCookieConsent, CookiePreferences } from '@/hooks/useCookieConsent';
import { cn } from '@/lib/utils';

export const CookieConsent = forwardRef<HTMLDivElement, Record<string, never>>(function CookieConsent(_, ref) {
  const {
    showBanner,
    preferences,
    acceptAll,
    rejectAll,
    savePreferences,
    closeBanner,
  } = useCookieConsent();

  const [showSettings, setShowSettings] = useState(false);
  const [tempPreferences, setTempPreferences] = useState<CookiePreferences>(preferences);

  useEffect(() => {
    if (showBanner) setTempPreferences(preferences);
  }, [showBanner, preferences]);

  if (!showBanner) return (
    <Button variant="outline" size="sm" className="fixed bottom-4 left-4 z-40 bg-background/95 shadow-sm" onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}>
      <Cookie className="mr-2 h-4 w-4" /> Preferências de cookies
    </Button>
  );

  const handleSavePreferences = () => {
    savePreferences(tempPreferences);
  };

  return (
    <div ref={ref} className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="container max-w-4xl">
        <div className="bg-card border rounded-lg shadow-lg p-4 md:p-6">
          {/* Main Content */}
          <div className="flex items-start gap-4">
            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <Cookie className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-sm md:text-base flex items-center gap-2">
                    <Cookie className="h-4 w-4 md:hidden" />
                    Usamos cookies para melhorar sua experiência
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Utilizamos cookies para personalizar conteúdo e anúncios, fornecer recursos de mídia social e analisar nosso tráfego.{' '}
                    <Link to="/cookies" className="underline hover:text-foreground">
                      Saiba mais
                    </Link>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex flex-shrink-0"
                  onClick={rejectAll}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Settings Toggle */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Personalizar cookies
              </button>

              {/* Settings Panel */}
              {showSettings && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">Cookies Essenciais</p>
                      <p className="text-xs text-muted-foreground">
                        Necessários para o funcionamento do site
                      </p>
                    </div>
                    <Switch checked={true} disabled />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">Cookies Analíticos</p>
                      <p className="text-xs text-muted-foreground">
                        Nos ajudam a entender como você usa o site
                      </p>
                    </div>
                    <Switch
                      checked={tempPreferences.analytics}
                      onCheckedChange={(checked) =>
                        setTempPreferences({ ...tempPreferences, analytics: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">Cookies de Marketing</p>
                      <p className="text-xs text-muted-foreground">
                        Usados para exibir anúncios relevantes
                      </p>
                    </div>
                    <Switch
                      checked={tempPreferences.marketing}
                      onCheckedChange={(checked) =>
                        setTempPreferences({ ...tempPreferences, marketing: checked })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rejectAll}
                  className="sm:order-1"
                >
                  Recusar
                </Button>
                {showSettings && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSavePreferences}
                    className="sm:order-2"
                  >
                    Salvar Preferências
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={acceptAll}
                  className={cn(
                    "bg-primary hover:bg-primary/90",
                    showSettings ? "sm:order-3" : "sm:order-2 sm:ml-auto"
                  )}
                >
                  Aceitar Todos
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
