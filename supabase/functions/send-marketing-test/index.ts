import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getEmailBranding } from '../_shared/email-branding.ts'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ ok: false, error: 'Não autorizado' }, 401)
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return json({ ok: false, error: 'Não autorizado' }, 401)

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id)
    if (!(roles || []).some((role: { role: string }) => role.role === 'admin')) {
      return json({ ok: false, error: 'Sem permissão' }, 403)
    }

    const { html, subject, toEmail } = await req.json()
    const recipient = toEmail || user.email
    if (!recipient) return json({ ok: false, error: 'Sem destinatário' }, 400)

    const branding = await getEmailBranding(supabase)
    const result = await sendTemplateEmail('marketing-message', recipient, {
      idempotencyKey: `marketing-test-${user.id}-${Date.now()}`,
      templateData: {
        subject: subject || 'Novidades — O Garimpo Digital',
        html: String(html || '').replace(/{{unsubscribe_url}}/g, '#'),
        branding,
      },
    })
    return json({ ok: result.sent, reason: result.sent ? undefined : result.reason })
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
