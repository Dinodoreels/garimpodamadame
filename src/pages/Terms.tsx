import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { DEFAULT_TERMS } from '@/lib/legalContent';

function TermsFallback() { return <LegalFallback document={DEFAULT_TERMS} />; }

function LegalFallback({ document }: { document: typeof DEFAULT_TERMS }) {
  return <><h1 className="text-3xl font-display font-bold mb-4">{document.page_title}</h1><p className="text-lg font-medium mb-2">{document.subtitle}</p><p className="text-sm text-muted-foreground mb-4">Versão {document.version} · Vigência: {document.effective_at}</p><p className="mb-8 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{document.review_notice}</p><div className="space-y-8">{document.sections.map(section => <section key={section.title}><h2 className="text-xl font-semibold mb-4">{section.title}</h2>{section.content.split('\n\n').map(paragraph => <p key={paragraph} className="text-muted-foreground leading-relaxed mb-4">{paragraph}</p>)}</section>)}</div></>;
}

export default function Terms() {
  return <LegalPageLayout settingsKey="legal_terms" fallback={<TermsFallback />} />;
}
