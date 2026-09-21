import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandContentCard, BrandHeader, BrandStatusCard, DEFAULT_BRANDING } from '../email-templates/_components.tsx'
import type { EmailBranding } from '../email-branding.ts'

interface AdminReportProps {
  title?: string
  subtitle?: string
  bodyText?: string
  branding?: EmailBranding
}

const AdminReportEmail = ({ title, subtitle, bodyText, branding }: AdminReportProps) => {
  const b = branding ?? DEFAULT_BRANDING
  const finalTitle = title || 'Relatório administrativo'
  const finalBody = bodyText || ''

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{finalTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader branding={b} />
          <BrandStatusCard branding={b} eyebrow="RELATÓRIO ADMINISTRATIVO" title={finalTitle}>
            {subtitle ? <Text style={sub}>{subtitle}</Text> : null}
          </BrandStatusCard>
          <BrandContentCard>
            <pre style={pre}>{finalBody}</pre>
          </BrandContentCard>
          <Text style={footer}>
            Você recebeu este email porque é administrador da loja {b.storeName}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminReportEmail,
  subject: (data: Record<string, any>) =>
    data?.title
      ? `[${data?.branding?.storeName || 'O Garimpo Digital'}] ${data.title}`
      : `[${data?.branding?.storeName || 'O Garimpo Digital'}] Relatório`,
  displayName: 'Relatório administrativo',
  previewData: {
    title: 'Resumo Diário — 22/05/2026',
    subtitle: 'Período: hoje',
    bodyText:
      '💰 Receita: R$ 3.450,00 (+12% vs ontem)\n🛒 Pedidos: 18 | Ticket médio: R$ 191,67\n👥 Novos clientes: 5\n\n🏆 Top Produtos:\n1. Camiseta Preta — 8 un',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#f3f3f3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '30px 22px', maxWidth: '600px', margin: '0 auto' }
const sub = { fontSize: '13px', color: '#666', margin: '0 0 12px' }
const pre = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#1a1a1a',
  whiteSpace: 'pre-wrap' as const,
  margin: 0,
}
const footer = { fontSize: '11px', color: '#999', margin: '20px 0 0', textAlign: 'center' as const }