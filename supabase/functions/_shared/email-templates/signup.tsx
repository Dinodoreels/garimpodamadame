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
import {
  BrandButton,
  BrandContentCard,
  BrandFooter,
  BrandHeader,
  BrandStatusCard,
  CouponBlock,
  DEFAULT_BRANDING,
  brandStyles,
} from './_components.tsx'
import type { EmailBranding } from '../email-branding.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  branding?: EmailBranding
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  branding,
}: SignupEmailProps) => {
  const b = branding ?? { ...DEFAULT_BRANDING, storeName: siteName || DEFAULT_BRANDING.storeName, siteUrl: siteUrl || DEFAULT_BRANDING.siteUrl }
  const s = brandStyles(b)
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`Confirme seu email na ${b.storeName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader branding={b} />
          <BrandStatusCard branding={b} eyebrow="CONTA CRIADA" title="Confirme seu email">
            <Text style={text}>
            Obrigada por se cadastrar na{' '}
            <Link href={b.siteUrl} style={s.link}>
              <strong>{b.storeName}</strong>
            </Link>
            .
            </Text>
          </BrandStatusCard>
          <BrandContentCard>
            <Text style={text}>
            Confirme seu endereço (
            <Link href={`mailto:${recipient}`} style={s.link}>
              {recipient}
            </Link>
            ) clicando no botão abaixo para ativar sua conta.
            </Text>
            <BrandButton branding={b} href={confirmationUrl}>Confirmar email</BrandButton>
          </BrandContentCard>
          <CouponBlock coupon={b.activeCoupon} branding={b} />
          <Text style={footer}>
            Se você não criou esta conta, pode ignorar este email com segurança.
          </Text>
          <BrandFooter branding={b} />
        </Container>
      </Body>
    </Html>
  )
}

export default SignupEmail

const main = { backgroundColor: '#f3f3f3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '30px 22px', maxWidth: '600px', margin: '0 auto' }
const text = {
  fontSize: '15px',
  color: '#1a1a1a',
  lineHeight: '1.7',
  margin: '0 0 18px',
}
const footer = { fontSize: '12px', color: '#999', margin: '32px 0 0' }
