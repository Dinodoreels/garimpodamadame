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
import { BrandButton, BrandContentCard, BrandFooter, BrandHeader, BrandStatusCard, DEFAULT_BRANDING, brandStyles } from './_components.tsx'
import type { EmailBranding } from '../email-branding.ts'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
  branding?: EmailBranding
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
  branding,
}: EmailChangeEmailProps) => {
  const b = branding ?? { ...DEFAULT_BRANDING, storeName: siteName || DEFAULT_BRANDING.storeName }
  const s = brandStyles(b)
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`Confirme a alteração de email na ${b.storeName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader branding={b} />
          <BrandStatusCard branding={b} eyebrow="SEGURANÇA DA CONTA" title="Confirme a alteração de email" />
          <BrandContentCard><Text style={text}>
            Você pediu para alterar o email da sua conta na {b.storeName} de{' '}
            <Link href={`mailto:${oldEmail}`} style={s.link}>{oldEmail}</Link>{' '}
            para{' '}
            <Link href={`mailto:${newEmail}`} style={s.link}>{newEmail}</Link>.
          </Text>
          <Text style={text}>Clique no botão abaixo para confirmar a alteração:</Text>
          <BrandButton branding={b} href={confirmationUrl}>Confirmar alteração</BrandButton>
          </BrandContentCard>
          <Text style={footer}>
            Se você não solicitou esta alteração, proteja sua conta imediatamente.
          </Text>
          <BrandFooter branding={b} />
        </Container>
      </Body>
    </Html>
  )
}

export default EmailChangeEmail

const main = { backgroundColor: '#f3f3f3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '30px 22px', maxWidth: '600px', margin: '0 auto' }
const text = { fontSize: '15px', color: '#1a1a1a', lineHeight: '1.7', margin: '0 0 22px' }
const footer = { fontSize: '12px', color: '#999', margin: '32px 0 0' }
