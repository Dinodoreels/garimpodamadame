import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  BrandFooter,
  BrandHeader,
  CouponBlock,
  DEFAULT_BRANDING,
  brandStyles,
} from '../email-templates/_components.tsx'
import type { EmailBranding, EmailCoupon } from '../email-branding.ts'

interface CustomerNotificationProps {
  /** Headline shown above the body (e.g. "Pedido PI20260001 confirmado"). */
  title?: string
  /** Short subtitle below the title. */
  subtitle?: string
  /** Main message body. Plain text; line breaks preserved. */
  bodyText?: string
  /** Optional CTA button label. */
  ctaLabel?: string
  /** Optional CTA button URL. */
  ctaUrl?: string
  /** Optional order-specific coupon code to highlight (overrides campaign block). */
  coupon?: string
  /** Optional pre-header text. */
  preheader?: string
  /** Branding (logo, colors, store name). Falls back to defaults. */
  branding?: EmailBranding
  /** Set false to hide campaign coupon footer block. */
  showCampaignCoupon?: boolean
}

const CustomerNotificationEmail = ({
  title,
  subtitle,
  bodyText,
  ctaLabel,
  ctaUrl,
  coupon,
  preheader,
  branding,
  showCampaignCoupon = true,
}: CustomerNotificationProps) => {
  const b = branding ?? DEFAULT_BRANDING
  const s = brandStyles(b)
  const finalTitle = title || 'Aviso da loja'
  const finalBody = bodyText || ''
  const finalPreheader = preheader || subtitle || finalTitle
  const orderCoupon: EmailCoupon | null = coupon
    ? { headline: 'Seu cupom exclusivo', code: coupon }
    : null
  const campaignCoupon = showCampaignCoupon ? b.activeCoupon : null

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{finalPreheader}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader branding={b} />

          <Heading style={{ ...s.h1, margin: '0 0 8px' }}>{finalTitle}</Heading>
          {subtitle ? <Text style={sub}>{subtitle}</Text> : null}

          <Hr style={hr} />

          <Section>
            <Text style={bodyStyle}>{finalBody}</Text>
          </Section>

          {orderCoupon ? (
            <Section style={{ ...couponBox, borderColor: b.colors.primary }}>
              <Text style={couponLabel}>SEU CUPOM</Text>
              <Text style={{ ...couponCode, color: b.colors.primary }}>{orderCoupon.code}</Text>
            </Section>
          ) : null}

          {ctaLabel && ctaUrl ? (
            <Section style={ctaRow}>
              <Button href={ctaUrl} style={s.button}>
                {ctaLabel}
              </Button>
            </Section>
          ) : null}

          <CouponBlock coupon={campaignCoupon} branding={b} />

          <BrandFooter branding={b} />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CustomerNotificationEmail,
  subject: (data: Record<string, any>) =>
    data?.subject || data?.title || `[${data?.branding?.storeName || 'Loja'}] Aviso`,
  displayName: 'Notificação ao cliente',
  previewData: {
    title: 'Pedido PI20260001 confirmado',
    subtitle: 'Obrigado pela compra!',
    bodyText:
      'Olá Maria! Seu pedido foi confirmado e já está sendo preparado. Total: R$ 249,90.\n\nEm breve enviaremos o código de rastreio.',
    ctaLabel: 'Acompanhar pedido',
    ctaUrl: 'https://storenataliapardal.com/pedido/PI20260001',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const sub = { fontSize: '14px', color: '#666', margin: '0 0 12px' }
const hr = { borderColor: '#ececec', margin: '24px 0' }
const bodyStyle = {
  fontSize: '15px',
  lineHeight: '1.7',
  color: '#1a1a1a',
  whiteSpace: 'pre-wrap' as const,
  margin: 0,
}
const couponBox = {
  border: '1px dashed #0a0a0a',
  padding: '16px 20px',
  textAlign: 'center' as const,
  margin: '24px 0',
  borderRadius: '4px',
}
const couponLabel = {
  fontSize: '10px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: '#666',
  margin: '0 0 4px',
}
const couponCode = {
  fontSize: '22px',
  fontWeight: 600 as const,
  letterSpacing: '0.06em',
  color: '#0a0a0a',
  margin: 0,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
}
const ctaRow = { textAlign: 'center' as const, margin: '24px 0 8px' }