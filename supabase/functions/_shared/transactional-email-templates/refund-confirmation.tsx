import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandFooter, BrandHeader, DEFAULT_BRANDING, brandStyles } from '../email-templates/_components.tsx'
import type { EmailBranding } from '../email-branding.ts'

interface RefundConfirmationProps {
  customerName?: string
  orderNumber?: string
  amount?: string
  refundType?: string
  branding?: EmailBranding
}

const RefundConfirmationEmail = ({ customerName, orderNumber, amount, refundType, branding }: RefundConfirmationProps) => {
  const b = branding ?? DEFAULT_BRANDING
  const s = brandStyles(b)
  const name = customerName || 'Cliente'
  const order = orderNumber || 'seu pedido'
  const value = amount || 'o valor informado'

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>Reembolso confirmado para o pedido {order}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader branding={b} />
          <Heading style={s.h1}>Reembolso confirmado</Heading>
          <Text style={text}>Olá, {name}.</Text>
          <Text style={text}>
            O reembolso {refundType || ''} de <strong>{value}</strong> referente ao pedido <strong>{order}</strong> foi confirmado pelo Mercado Pago.
          </Text>
          <Text style={text}>O prazo para o valor aparecer depende do meio de pagamento e da instituição financeira utilizada.</Text>
          <Section style={buttonRow}>
            <Button href="https://ogarimpodigital.com.br/account" style={s.button}>Ver meus pedidos</Button>
          </Section>
          <BrandFooter branding={b} />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RefundConfirmationEmail,
  subject: (data: Record<string, any>) => `Reembolso confirmado — pedido ${data?.orderNumber || ''}`,
  displayName: 'Confirmação de reembolso',
  previewData: {
    customerName: 'Cliente',
    orderNumber: 'PI20260001',
    amount: 'R$ 97,00',
    refundType: 'total',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const text = { color: '#1a1a1a', fontSize: '15px', lineHeight: '1.7' }
const buttonRow = { textAlign: 'center' as const, margin: '28px 0 8px' }