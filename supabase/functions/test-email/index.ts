import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getEmailBranding } from '../_shared/email-branding.ts'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

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

    const toEmail = user.email

    if (!toEmail) {
      return new Response(JSON.stringify({ ok: false, error: 'Usuário sem email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const branding = await getEmailBranding(supabase)
    const result = await sendTemplateEmail('customer-notification', toEmail, {
      idempotencyKey: `email-test-${user.id}-${Date.now()}`,
      templateData: {
        subject: 'Email de teste — O Garimpo Digital',
        title: 'Email configurado corretamente',
        bodyText: 'Este é um email de teste de O Garimpo Digital.',
        ctaLabel: 'Visitar loja',
        ctaUrl: branding.siteUrl,
        branding,
      },
    })
    return new Response(JSON.stringify({ ok: result.sent, provider: 'lovable-email', reason: result.sent ? undefined : result.reason }), {
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
