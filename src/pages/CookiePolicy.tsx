import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

function CookiesFallback() {
  return (
    <>
      <h1 className="text-3xl font-display font-bold mb-4">Política de Cookies</h1>
      <p className="text-lg text-chrome font-medium mb-2">VANGUARD STORE</p>
      <p className="text-sm text-muted-foreground mb-8">
        Versão jurídica reforçada e compatível com LGPD, Meta e Google<br />
        Última atualização: 30/01/2026
      </p>
      <div className="prose prose-neutral max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">1. O que são Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            Cookies são pequenos arquivos de texto armazenados no dispositivo do usuário quando ele acessa o site Vanguard Store.
          </p>
        </section>
      </div>
    </>
  );
}

export default function CookiePolicy() {
  return <LegalPageLayout settingsKey="legal_cookies" fallback={<CookiesFallback />} />;
}
