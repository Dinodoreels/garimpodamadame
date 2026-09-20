import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Html, Preview, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandFooter, BrandHeader, DEFAULT_BRANDING } from '../email-templates/_components.tsx'
import type { EmailBranding } from '../email-branding.ts'

interface MarketingMessageProps {
  subject?: string
  html?: string
  preheader?: string
  branding?: EmailBranding
}

const MarketingMessageEmail = ({ subject, html, preheader, branding }: MarketingMessageProps) => {
  const b = branding ?? DEFAULT_BRANDING
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{preheader || subject || 'Novidades de O Garimpo Digital'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader branding={b} />
          <Section dangerouslySetInnerHTML={{ __html: html || '<p>Confira as novidades da loja.</p>' }} />
          <BrandFooter branding={b} />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: MarketingMessageEmail,
  subject: (data: Record<string, unknown>) => String(data?.subject || 'Novidades — O Garimpo Digital'),
  displayName: 'Mensagem de campanha',
  previewData: {
    subject: 'Novidades — O Garimpo Digital',
    html: '<h2>Novidades selecionadas para você</h2><p>Confira os produtos disponíveis na loja.</p>',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }