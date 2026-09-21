/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandButton, BrandContentCard, BrandFooter, BrandHeader, BrandStatusCard, CouponBlock, DEFAULT_BRANDING } from './_components.tsx'
import type { EmailBranding } from '../email-branding.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  branding?: EmailBranding
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
  branding,
}: InviteEmailProps) => {
  const b = branding ?? { ...DEFAULT_BRANDING, storeName: siteName || DEFAULT_BRANDING.storeName, siteUrl: siteUrl || DEFAULT_BRANDING.siteUrl }
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`Você foi convidada para a ${b.storeName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader branding={b} />
          <BrandStatusCard branding={b} eyebrow="CONVITE" title="Você foi convidada" />
          <BrandContentCard><Text style={text}>
            Você recebeu um convite para acessar a{' '}
            <Link href={b.siteUrl} style={{ color: b.colors.primary, textDecoration: 'underline' }}>
              <strong>{b.storeName}</strong>
            </Link>
            . Clique no botão abaixo para aceitar o convite e criar sua conta.
          </Text>
          <BrandButton branding={b} href={confirmationUrl}>Aceitar convite</BrandButton>
          </BrandContentCard>
          <CouponBlock coupon={b.activeCoupon} branding={b} />
          <Text style={footer}>
            Se você não esperava este convite, pode ignorar este email.
          </Text>
          <BrandFooter branding={b} />
        </Container>
      </Body>
    </Html>
  )
}

export default InviteEmail

const main = { backgroundColor: '#f3f3f3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '30px 22px', maxWidth: '600px', margin: '0 auto' }
const text = {
  fontSize: '15px',
  color: '#1a1a1a',
  lineHeight: '1.7',
  margin: '0 0 22px',
}
const footer = { fontSize: '12px', color: '#999', margin: '32px 0 0' }
