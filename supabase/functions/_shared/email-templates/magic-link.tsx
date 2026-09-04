/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandButton, BrandFooter, BrandHeader, CouponBlock, DEFAULT_BRANDING, brandStyles } from './_components.tsx'
import type { EmailBranding } from '../email-branding.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  branding?: EmailBranding
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  branding,
}: MagicLinkEmailProps) => {
  const b = branding ?? { ...DEFAULT_BRANDING, storeName: siteName || DEFAULT_BRANDING.storeName }
  const s = brandStyles(b)
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`Seu link de acesso à ${b.storeName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader branding={b} />
          <Heading style={s.h1}>Seu link de acesso</Heading>
          <Text style={text}>
            Clique no botão abaixo para entrar na sua conta da {b.storeName}. Este link expira em alguns minutos.
          </Text>
          <BrandButton branding={b} href={confirmationUrl}>Entrar</BrandButton>
          <CouponBlock coupon={b.activeCoupon} branding={b} />
          <Text style={footer}>
            Se você não solicitou este link, pode ignorar este email.
          </Text>
          <BrandFooter branding={b} />
        </Container>
      </Body>
    </Html>
  )
}

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const text = {
  fontSize: '15px',
  color: '#1a1a1a',
  lineHeight: '1.7',
  margin: '0 0 22px',
}
const footer = { fontSize: '12px', color: '#999', margin: '32px 0 0' }
