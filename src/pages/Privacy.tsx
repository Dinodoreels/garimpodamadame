import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

function PrivacyFallback() {
  return (
    <>
      <h1 className="text-3xl font-display font-bold mb-4">Política de Privacidade e Proteção de Dados</h1>
      <p className="text-lg text-chrome font-medium mb-2">VANGUARD STORE</p>
      <p className="text-sm text-muted-foreground mb-8">
        Versão jurídica reforçada e blindada (LGPD Ready)<br />
        Última atualização: 30/01/2026
      </p>
      <div className="prose prose-neutral max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">1. Aceitação e Ciência do Titular</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ao acessar, navegar, cadastrar-se ou realizar compras no site Vanguard Store,
            o titular dos dados declara que leu integralmente esta Política de Privacidade e concorda com o tratamento de seus dados pessoais.
          </p>
        </section>
      </div>
    </>
  );
}

export default function Privacy() {
  return <LegalPageLayout settingsKey="legal_privacy" fallback={<PrivacyFallback />} />;
}
