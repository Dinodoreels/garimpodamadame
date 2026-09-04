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
  storeName: 'Loja',
  logoUrl: '',
  siteUrl: 'https://storenataliapardal.com',
  colors: { primary: '#0a0a0a', primaryFg: '#ffffff', accent: '#6b6660' },
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
      fontSize: '24px',
      fontWeight: 300 as const,
      color: b.colors.primary,
      letterSpacing: '-0.01em',
      margin: '0 0 20px',
    },
  }
}

const containerStyle = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
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
      <Section style={{ margin: '0 0 24px' }}>
        <Img
          src={branding.logoUrl}
          alt={branding.storeName}
          style={{ maxHeight: '48px', maxWidth: '220px', objectFit: 'contain' }}
        />
      </Section>
    )
  }
  return <Text style={{ ...brandTextStyle, color: branding.colors.primary }}>{branding.storeName}</Text>
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
      <Hr style={{ borderColor: '#ececec', margin: '32px 0 16px' }} />
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
    <Button href={href} style={brandStyles(branding).button}>
      {children}
    </Button>
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