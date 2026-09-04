import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { html, subject, toEmail } = await req.json()
    const recipient = toEmail || user.email
    if (!recipient) return json({ ok: false, error: 'Sem destinatário' }, 400)

    // Load integrations email config
    const { data: settings } = await supabase.from('site_settings').select('value').eq('key', 'integrations').maybeSingle()
    const config = (settings?.value as any)?.email
    if (!config?.active_provider) return json({ ok: false, error: 'Configure um provedor de email em Integrações' })

    const fromEmail = config.from_email || 'noreply@example.com'
    const fromName = config.from_name || 'Loja'
    const finalHtml = String(html || '').replace(/{{unsubscribe_url}}/g, '#')

    if (config.active_provider === 'resend') {
      const apiKey = config.resend?.api_key
      if (!apiKey) return json({ ok: false, error: 'API Key Resend ausente' })
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: [recipient], subject: subject || '(sem assunto)', html: finalHtml }),
      })
      const r = await res.json()
      if (!res.ok) return json({ ok: false, error: r.message || JSON.stringify(r) })
      return json({ ok: true })
    }
    if (config.active_provider === 'sendgrid') {
      const apiKey = config.sendgrid?.api_key
      if (!apiKey) return json({ ok: false, error: 'API Key SendGrid ausente' })
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipient }] }],
          from: { email: fromEmail, name: fromName },
          subject: subject || '(sem assunto)',
          content: [{ type: 'text/html', value: finalHtml }],
        }),
      })
      if (!res.ok) return json({ ok: false, error: await res.text() })
      return json({ ok: true })
    }
    return json({ ok: false, error: 'Provedor não suportado para envio (use Resend ou SendGrid)' })
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
