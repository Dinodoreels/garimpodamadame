import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { config } = await req.json()
    if (!config) {
      return new Response(JSON.stringify({ ok: false, error: 'Config não fornecida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const provider = config.active_provider
    const fromEmail = config.from_email || config.smtp?.user || 'noreply@example.com'
    const fromName = config.from_name || 'Loja'
    const toEmail = user.email

    if (!toEmail) {
      return new Response(JSON.stringify({ ok: false, error: 'Usuário sem email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const subject = '✅ Email de teste - Configuração funcionando!'
    const body = `Olá! Este é um email de teste enviado via ${provider?.toUpperCase() || 'provedor não definido'}.\n\nSua configuração de email está funcionando corretamente.`
    const htmlBody = `<h2>✅ Email de teste</h2><p>Olá! Este é um email de teste enviado via <strong>${provider?.toUpperCase() || 'provedor não definido'}</strong>.</p><p>Sua configuração de email está funcionando corretamente.</p>`

    if (provider === 'resend') {
      const apiKey = config.resend?.api_key
      if (!apiKey) {
        return new Response(JSON.stringify({ ok: false, error: 'API Key do Resend não configurada' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [toEmail],
          subject,
          html: htmlBody,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        return new Response(JSON.stringify({ ok: false, error: result.message || JSON.stringify(result) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ ok: true, provider: 'resend' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (provider === 'sendgrid') {
      const apiKey = config.sendgrid?.api_key
      if (!apiKey) {
        return new Response(JSON.stringify({ ok: false, error: 'API Key do SendGrid não configurada' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toEmail }] }],
          from: { email: fromEmail, name: fromName },
          subject,
          content: [
            { type: 'text/plain', value: body },
            { type: 'text/html', value: htmlBody },
          ],
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        return new Response(JSON.stringify({ ok: false, error: errText }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ ok: true, provider: 'sendgrid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (provider === 'smtp') {
      return new Response(JSON.stringify({
        ok: false,
        error: 'SMTP direto não é suportado em Edge Functions. Use Resend ou SendGrid para envio real de emails.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: false, error: 'Provedor não configurado' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in test-email:', error)
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
