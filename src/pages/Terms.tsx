import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

function TermsFallback() {
  return (
    <>
      <h1 className="text-3xl font-display font-bold mb-4">Termos de Uso e Condições Gerais</h1>
      <p className="text-lg text-chrome font-medium mb-2">VANGUARD STORE</p>
      <p className="text-sm text-muted-foreground mb-8">
        Documento oficial – versão jurídica blindada<br />
        Última atualização: 30/01/2026
      </p>
      <div className="prose prose-neutral max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">1. Aceitação Integral e Natureza Contratual</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Ao acessar, navegar, cadastrar-se ou realizar qualquer compra no site Vanguard Store,
            o usuário declara, de forma livre, consciente e inequívoca, que leu integralmente estes Termos de Uso,
            compreendeu todas as cláusulas, concorda com todas as condições e possui capacidade civil plena para contratar.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-4">2. Definições</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para fins deste documento, Site refere-se à plataforma digital acessível por meio do domínio oficial da Vanguard Store.
          </p>
        </section>
      </div>
    </>
  );
}

export default function Terms() {
  return <LegalPageLayout settingsKey="legal_terms" fallback={<TermsFallback />} />;
}
