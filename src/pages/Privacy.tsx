import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { DEFAULT_PRIVACY } from '@/lib/legalContent';

function PrivacyFallback() {
  return <><h1 className="text-3xl font-display font-bold mb-4">{DEFAULT_PRIVACY.page_title}</h1><p className="text-lg font-medium mb-2">{DEFAULT_PRIVACY.subtitle}</p><p className="text-sm text-muted-foreground mb-4">Versão {DEFAULT_PRIVACY.version} · Vigência: {DEFAULT_PRIVACY.effective_at}</p><p className="mb-8 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{DEFAULT_PRIVACY.review_notice}</p><div className="space-y-8">{DEFAULT_PRIVACY.sections.map(section => <section key={section.title}><h2 className="text-xl font-semibold mb-4">{section.title}</h2>{section.content.split('\n\n').map(paragraph => <p key={paragraph} className="text-muted-foreground leading-relaxed mb-4">{paragraph}</p>)}</section>)}</div></>;
}

export default function Privacy() {
  return <LegalPageLayout settingsKey="legal_privacy" fallback={<PrivacyFallback />} />;
}
