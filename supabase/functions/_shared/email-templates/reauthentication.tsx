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
import { BrandFooter, BrandHeader, DEFAULT_BRANDING, brandStyles } from './_components.tsx'
import type { EmailBranding } from '../email-branding.ts'

interface ReauthenticationEmailProps {
  token: string
  siteName?: string
  branding?: EmailBranding
}

export const ReauthenticationEmail = ({ token, siteName, branding }: ReauthenticationEmailProps) => {
  const b = branding ?? { ...DEFAULT_BRANDING, storeName: siteName || DEFAULT_BRANDING.storeName }
  const s = brandStyles(b)
  const code = {
    fontFamily: 'Courier, monospace',
    fontSize: '28px',
    fontWeight: 'bold' as const,
    color: b.colors.primary,
    letterSpacing: '0.18em',
    textAlign: 'center' as const,
    padding: '16px',
    border: `1px dashed ${b.colors.primary}`,
    borderRadius: '4px',
    margin: '0 0 30px',
  }
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`Seu código de verificação ${b.storeName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader branding={b} />
          <Heading style={s.h1}>Código de verificação</Heading>
          <Text style={text}>Use o código abaixo para confirmar sua identidade:</Text>
          <Text style={code}>{token}</Text>
          <Text style={footer}>
            Este código expira em alguns minutos. Se você não solicitou, pode ignorar este email.
          </Text>
          <BrandFooter branding={b} />
        </Container>
      </Body>
    </Html>
  )
}

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const text = {
  fontSize: '15px',
  color: '#1a1a1a',
  lineHeight: '1.7',
  margin: '0 0 22px',
}
const footer = { fontSize: '12px', color: '#999', margin: '32px 0 0' }
