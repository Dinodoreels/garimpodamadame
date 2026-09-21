/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Button,
  Container,
  Hr,
  Img,
  Link,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { EmailBranding, EmailCoupon } from '../email-branding.ts'

export const DEFAULT_BRANDING: EmailBranding = {
  storeName: 'O Garimpo Digital',
  logoUrl: 'https://ogarimpodigital.com.br/__l5e/assets-v1/f92206c5-3e2c-438c-9a85-78016eff682a/logo-o-garimpo-digital.png',
  siteUrl: 'https://ogarimpodigital.com.br',
  colors: { primary: '#d10078', primaryFg: '#ffffff', accent: '#b77900' },
  activeCoupon: null,
}

export function brandStyles(b: EmailBranding) {
  return {
    button: {
      backgroundColor: b.colors.primary,
      color: b.colors.primaryFg,
      fontSize: '14px',
      fontWeight: 500 as const,
      letterSpacing: '0.04em',
      borderRadius: '4px',
      padding: '12px 28px',
      textDecoration: 'none',
      display: 'inline-block',
    },
    link: { color: b.colors.primary, textDecoration: 'underline' },
    h1: {
      fontSize: '23px',
      fontWeight: 700 as const,
      color: '#202124',
      letterSpacing: '0',
      margin: '0 0 14px',
    },
  }
}

const containerStyle = { padding: '30px 22px', maxWidth: '600px', margin: '0 auto' }
const brandTextStyle = {
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  fontWeight: 600 as const,
  margin: '0 0 24px',
}

export const Brand = {
  Container: ({ children }: { children: React.ReactNode }) => (
    <Container style={containerStyle}>{children}</Container>
  ),
}

export function BrandHeader({ branding }: { branding: EmailBranding }) {
  if (branding.logoUrl) {
    return (
      <Section style={{ margin: '0 0 24px', padding: '0 4px', textAlign: 'center' as const }}>
        <Img
          src={branding.logoUrl}
          alt={branding.storeName}
          style={{ maxHeight: '82px', maxWidth: '210px', objectFit: 'contain', margin: '0 auto' }}
        />
      </Section>
    )
  }
  return <Text style={{ ...brandTextStyle, color: branding.colors.primary, textAlign: 'center' as const }}>{branding.storeName}</Text>
}

export function BrandStatusCard({
  branding,
  eyebrow,
  title,
  children,
}: {
  branding: EmailBranding
  eyebrow?: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <Section style={{ backgroundColor: '#ffffff', border: '1px solid #dfe2e6', borderLeft: `5px solid ${branding.colors.primary}`, borderRadius: '8px', padding: '24px', margin: '0 0 14px' }}>
      {eyebrow ? <Text style={{ color: branding.colors.primary, fontSize: '12px', fontWeight: 700, margin: '0 0 8px' }}>{eyebrow}</Text> : null}
      <Text style={{ color: '#202124', fontSize: '23px', fontWeight: 700, lineHeight: '1.3', margin: children ? '0 0 12px' : '0' }}>{title}</Text>
      {children}
    </Section>
  )
}

export function BrandContentCard({ children }: { children: React.ReactNode }) {
  return <Section style={{ backgroundColor: '#ffffff', border: '1px solid #e2e4e8', borderRadius: '8px', padding: '24px', margin: '0 0 14px' }}>{children}</Section>
}

export function CouponBlock({ coupon, branding }: { coupon?: EmailCoupon | null; branding: EmailBranding }) {
  if (!coupon || !coupon.headline) return null
  const headlineNodes = renderBoldMarkup(coupon.headline)
  return (
    <Section
      style={{
        border: `1px dashed ${branding.colors.primary}`,
        padding: '18px 20px',
        textAlign: 'center' as const,
        margin: '28px 0 0',
        borderRadius: '4px',
      }}
    >
      <Text
        style={{
          fontSize: '10px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase' as const,
          color: branding.colors.accent,
          margin: '0 0 6px',
        }}
      >
        Campanha em destaque
      </Text>
      <Text style={{ fontSize: '14px', color: branding.colors.primary, margin: '0 0 10px', lineHeight: 1.5 }}>
        {headlineNodes}
      </Text>
      {coupon.code ? (
        <Text
          style={{
            fontSize: '20px',
            fontWeight: 600 as const,
            letterSpacing: '0.08em',
            color: branding.colors.primary,
            margin: '0 0 6px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          {coupon.code}
        </Text>
      ) : null}
      {coupon.description ? (
        <Text style={{ fontSize: '11px', color: branding.colors.accent, margin: 0 }}>{coupon.description}</Text>
      ) : null}
    </Section>
  )
}

export function BrandFooter({ branding }: { branding: EmailBranding }) {
  const host = (() => {
    try {
      return new URL(branding.siteUrl).host
    } catch {
      return branding.siteUrl
    }
  })()
  return (
    <>
      <Hr style={{ borderColor: '#dfe2e6', margin: '30px 0 16px' }} />
      <Text style={{ fontSize: '12px', color: '#666', margin: '0 0 4px', textAlign: 'center' as const }}>
        {branding.storeName} ·{' '}
        <Link href={branding.siteUrl} style={{ color: branding.colors.primary, textDecoration: 'underline' }}>
          {host}
        </Link>
      </Text>
      <Text style={{ fontSize: '11px', color: '#999', margin: 0, textAlign: 'center' as const }}>
        Você está recebendo este email porque é cliente da {branding.storeName}.
      </Text>
    </>
  )
}

export function BrandButton({
  branding,
  href,
  children,
}: {
  branding: EmailBranding
  href: string
  children: React.ReactNode
}) {
  return (
    <Section style={{ textAlign: 'center' as const, margin: '24px 0 8px' }}>
      <Button href={href} style={brandStyles(branding).button}>
        {children}
      </Button>
    </Section>
  )
}

// Render simple **bold** markup inside coupon headlines.
function renderBoldMarkup(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}