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
import { BrandButton, BrandFooter, BrandHeader, DEFAULT_BRANDING, brandStyles } from './_components.tsx'
import type { EmailBranding } from '../email-branding.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  branding?: EmailBranding
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  branding,
}: RecoveryEmailProps) => {
  const b = branding ?? { ...DEFAULT_BRANDING, storeName: siteName || DEFAULT_BRANDING.storeName }
  const s = brandStyles(b)
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`Redefina sua senha na ${b.storeName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader branding={b} />
          <Heading style={s.h1}>Redefinir senha</Heading>
          <Text style={text}>
            Recebemos um pedido para redefinir a senha da sua conta na {b.storeName}. Clique no botão abaixo para escolher uma nova senha.
          </Text>
          <BrandButton branding={b} href={confirmationUrl}>Redefinir senha</BrandButton>
          <Text style={footer}>
            Se você não pediu para redefinir a senha, pode ignorar este email. Sua senha continuará a mesma.
          </Text>
          <BrandFooter branding={b} />
        </Container>
      </Body>
    </Html>
  )
}

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const text = {
  fontSize: '15px',
  color: '#1a1a1a',
  lineHeight: '1.7',
  margin: '0 0 22px',
}
const footer = { fontSize: '12px', color: '#999', margin: '32px 0 0' }
