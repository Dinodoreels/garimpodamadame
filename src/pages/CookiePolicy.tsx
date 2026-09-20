import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { DEFAULT_COOKIES } from '@/lib/legalContent';
import { Button } from '@/components/ui/button';

function CookiesFallback() {
  return <><h1 className="text-3xl font-display font-bold mb-4">{DEFAULT_COOKIES.page_title}</h1><p className="text-lg font-medium mb-2">{DEFAULT_COOKIES.subtitle}</p><p className="text-sm text-muted-foreground mb-4">Versão {DEFAULT_COOKIES.version} · Vigência: {DEFAULT_COOKIES.effective_at}</p><p className="mb-8 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{DEFAULT_COOKIES.review_notice}</p><div className="space-y-8">{DEFAULT_COOKIES.sections.map(section => <section key={section.title}><h2 className="text-xl font-semibold mb-4">{section.title}</h2>{section.content.split('\n\n').map(paragraph => <p key={paragraph} className="text-muted-foreground leading-relaxed mb-4">{paragraph}</p>)}</section>)}</div><Button className="mt-8" variant="outline" onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}>Preferências de cookies</Button></>;
}

export default function CookiePolicy() {
  return <LegalPageLayout settingsKey="legal_cookies" fallback={<CookiesFallback />} />;
}
