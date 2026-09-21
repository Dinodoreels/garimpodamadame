import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandFooter, BrandHeader, DEFAULT_BRANDING } from '../email-templates/_components.tsx'
import type { EmailBranding } from '../email-branding.ts'

interface Props { customerName?: string; orderNumber?: string; amount?: string; refundType?: string; branding?: EmailBranding }
const Email = ({ customerName, orderNumber, amount, refundType, branding }: Props) => {
  const b = branding ?? DEFAULT_BRANDING
  return <Html lang="pt-BR" dir="ltr"><Head/><Preview>Seu reembolso foi aprovado</Preview><Body style={main}><Container style={container}><BrandHeader branding={b}/><Text style={hello}>Olá, {customerName || 'Cliente'}.</Text><Section style={statusCard}><Text style={eyebrow}>REEMBOLSO APROVADO</Text><Heading style={heading}>Já solicitamos a devolução</Heading><Text style={text}>O reembolso {refundType || ''} do pedido <strong>{orderNumber || ''}</strong> foi aprovado e enviado ao Mercado Pago.</Text></Section><Section style={valueCard}><Text style={label}>Valor solicitado</Text><Text style={value}>{amount || 'Valor informado'}</Text><Text style={note}>Avisaremos novamente quando o Mercado Pago confirmar que o dinheiro voltou.</Text></Section><Section style={buttonRow}><Button href="https://ogarimpodigital.com.br/account" style={{ ...button, backgroundColor: b.colors.primary, color: b.colors.primaryFg }}>Acompanhar pedido</Button></Section><BrandFooter branding={b}/></Container></Body></Html>
}
export const template = { component: Email, subject: (d: Record<string, any>) => `Reembolso aprovado — pedido ${d?.orderNumber || ''}`, displayName: 'Reembolso aprovado', previewData: { customerName: 'Cliente', orderNumber: 'PI20260001', amount: 'R$ 97,00', refundType: 'total' } } satisfies TemplateEntry
const main = { backgroundColor: '#f4f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
const container = { padding: '32px 20px', maxWidth: '600px', margin: '0 auto' }
const hello = { color: '#242424', fontSize: '16px', margin: '0 0 18px' }
const statusCard = { backgroundColor: '#ffffff', border: '1px solid #d8eadf', borderLeft: '5px solid #27945b', borderRadius: '8px', padding: '24px', margin: '0 0 14px' }
const eyebrow = { color: '#237a4d', fontSize: '12px', fontWeight: 700 as const, margin: '0 0 8px' }
const heading = { color: '#202124', fontSize: '22px', fontWeight: 600 as const, margin: '0 0 12px' }
const text = { color: '#444', fontSize: '15px', lineHeight: '1.6', margin: 0 }
const valueCard = { backgroundColor: '#ffffff', border: '1px solid #e2e4e8', borderRadius: '8px', padding: '22px 24px' }
const label = { color: '#666', fontSize: '13px', margin: '0 0 5px' }
const value = { color: '#202124', fontSize: '24px', fontWeight: 700 as const, margin: '0 0 12px' }
const note = { color: '#666', fontSize: '13px', lineHeight: '1.5', margin: 0 }
const buttonRow = { textAlign: 'center' as const, margin: '24px 0 8px' }
const button = { borderRadius: '4px', padding: '12px 24px', textDecoration: 'none', fontSize: '14px' }
