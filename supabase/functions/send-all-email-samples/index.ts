import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient, corsHeaders } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'
import { getEmailBranding } from '../_shared/email-branding.ts'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const SITE_NAME = 'O Garimpo Digital'
const SITE_URL = 'https://ogarimpodigital.com.br'
const SENDER_DOMAIN = 'notify.ogarimpodigital.com.br'
const FROM = `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`
const BodySchema = z.object({ email: z.string().email().max(254) })

type Sample = { label: string; subject: string; element: React.ReactElement }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!url || !serviceKey || !apiKey) throw new Error('Serviço de email indisponível')

    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const admin = createClient(url, serviceKey)
    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return json({ error: 'Não autorizado' }, 401)
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id)
    if (!(roles || []).some((row: { role: string }) => row.role === 'admin')) {
      return json({ error: 'Sem permissão' }, 403)
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)
    const recipient = parsed.data.email
    const branding = await getEmailBranding(admin)
    const safeLink = SITE_URL
    const registered = (name: string, data: Record<string, unknown>) => {
      const entry = TEMPLATES[name]
      if (!entry) throw new Error(`Modelo ${name} indisponível`)
      return React.createElement(entry.component, { ...data, branding })
    }

    const samples: Sample[] = [
      { label: 'signup', subject: '[AMOSTRA] Confirme seu email — O Garimpo Digital', element: React.createElement(SignupEmail, { siteName: SITE_NAME, siteUrl: SITE_URL, recipient, confirmationUrl: safeLink, branding }) },
      { label: 'invite', subject: '[AMOSTRA] Seu convite — O Garimpo Digital', element: React.createElement(InviteEmail, { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: safeLink, branding }) },
      { label: 'magiclink', subject: '[AMOSTRA] Seu link de acesso — O Garimpo Digital', element: React.createElement(MagicLinkEmail, { siteName: SITE_NAME, confirmationUrl: safeLink, branding }) },
      { label: 'recovery', subject: '[AMOSTRA] Redefina sua senha — O Garimpo Digital', element: React.createElement(RecoveryEmail, { siteName: SITE_NAME, confirmationUrl: safeLink, branding }) },
      { label: 'email-change', subject: '[AMOSTRA] Confirme seu novo email — O Garimpo Digital', element: React.createElement(EmailChangeEmail, { siteName: SITE_NAME, oldEmail: 'email-atual@exemplo.com', email: recipient, newEmail: recipient, confirmationUrl: safeLink, branding }) },
      { label: 'reauthentication', subject: '[AMOSTRA] Seu código de verificação — O Garimpo Digital', element: React.createElement(ReauthenticationEmail, { token: '123456', siteName: SITE_NAME, branding }) },
      { label: 'customer-notification', subject: '[AMOSTRA] Pedido confirmado — O Garimpo Digital', element: registered('customer-notification', { title: 'Pedido PI20260001 confirmado', subtitle: 'Obrigado pela compra!', bodyText: 'Olá! Seu pedido foi confirmado e já está sendo preparado.\n\nEsta é uma amostra e não representa uma compra real.', ctaLabel: 'Visitar loja', ctaUrl: SITE_URL }) },
      { label: 'marketing-message', subject: '[AMOSTRA] Novidades — O Garimpo Digital', element: registered('marketing-message', { subject: 'Novidades — O Garimpo Digital', preheader: 'Amostra de campanha', html: '<h2>Novidades selecionadas para você</h2><p>Esta é uma amostra do email de campanha da loja.</p>' }) },
      { label: 'admin-report', subject: '[AMOSTRA] Relatório administrativo — O Garimpo Digital', element: registered('admin-report', { title: 'Relatório administrativo de amostra', subtitle: 'Dados demonstrativos', bodyText: 'Pedidos: 3\nReceita: R$ 291,00\n\nEsta é uma amostra sem dados reais.' }) },
      { label: 'refund-approved', subject: '[AMOSTRA] Reembolso aprovado — O Garimpo Digital', element: registered('refund-approved', { customerName: 'Cliente', orderNumber: 'PI20260001', amount: 'R$ 97,00', refundType: 'total' }) },
      { label: 'refund-confirmation', subject: '[AMOSTRA] Dinheiro devolvido — O Garimpo Digital', element: registered('refund-confirmation', { customerName: 'Cliente', orderNumber: 'PI20260001', amount: 'R$ 97,00', refundType: 'total' }) },
    ]

    const batchId = crypto.randomUUID()
    const results: Array<{ label: string; sent: boolean; reason?: string }> = []
    for (const sample of samples) {
      try {
        const html = await renderAsync(sample.element)
        const text = await renderAsync(sample.element, { plainText: true })
        await sendLovableEmail({
          to: recipient,
          from: FROM,
          sender_domain: SENDER_DOMAIN,
          subject: sample.subject,
          html,
          text,
          purpose: 'transactional',
          label: `sample-${sample.label}`,
          idempotency_key: `all-email-samples-${batchId}-${sample.label}`,
        }, { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') })
        results.push({ label: sample.label, sent: true })
      } catch (error) {
        const reason = error instanceof EmailAPIError ? error.code : error instanceof Error ? error.message : String(error)
        results.push({ label: sample.label, sent: false, reason })
      }
    }

    return json({ ok: results.every((result) => result.sent), sent: results.filter((result) => result.sent).length, total: samples.length, results })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Falha ao enviar amostras' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}