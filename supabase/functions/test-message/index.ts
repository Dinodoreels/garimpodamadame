import { createClient } from 'npm:@supabase/supabase-js@2'
import { getEmailBranding } from '../_shared/email-branding.ts'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auth: require admin
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id)
    const isAdmin = (roles || []).some((r: any) => r.role === 'admin')
    if (!isAdmin) {
      return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { channel, recipient, message: customMessage, subject: customSubject } = await req.json()
    if (!channel || !recipient) {
      return new Response(JSON.stringify({ ok: false, error: 'channel and recipient required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: settingsRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'integrations')
      .maybeSingle()

    const config = (settingsRow?.value as any) || {}
    const message = customMessage || `✅ Mensagem de teste do sistema — ${new Date().toLocaleString('pt-BR')}`
    const subject = customSubject || 'Teste de integração'

    if (channel === 'whatsapp') {
      const wa = config.whatsapp || {}
      const provider = wa.active_provider
      if (!provider) return json({ ok: false, error: 'Nenhum provedor de WhatsApp ativo' })
      const phone = recipient.replace(/\D/g, '')
      let res: Response
      try {
        if (provider === 'evolution') {
          const evo = wa.evolution || {}
          res = await fetch(`${evo.base_url}/message/sendText/${evo.instance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evo.api_key },
            body: JSON.stringify({ number: phone, text: message }),
          })
        } else if (provider === 'zapi') {
          const z = wa.zapi || {}
          res = await fetch(`https://api.z-api.io/instances/${z.instance_id}/token/${z.token}/send-text`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message }),
          })
        } else if (provider === 'wppconnect') {
          const w = wa.wppconnect || {}
          res = await fetch(`${w.base_url}/api/${w.session}/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${w.secret_key}` },
            body: JSON.stringify({ phone, message }),
          })
        } else if (provider === 'uazapi') {
          const u = wa.uazapi || {}
          const baseUrl = (u.base_url || 'https://free.uazapi.com').replace(/\/$/, '')
          if (!u.instance_token) {
            return json({ ok: false, provider, error: 'Token da instância UAZAPI não configurado. Cole o Token da Instância em Integrações → WhatsApp → UAZAPI.' })
          }
          // 1) Check instance status first to give a clear message when disconnected
          try {
            const statusRes = await fetch(`${baseUrl}/instance/status`, {
              method: 'GET',
              headers: { 'token': u.instance_token },
            })
            const statusText = await statusRes.text().catch(() => '')
            let statusJson: any = null
            try { statusJson = JSON.parse(statusText) } catch {}
            const state = String(
              statusJson?.instance?.status ||
              statusJson?.status ||
              statusJson?.state ||
              ''
            ).toLowerCase()
            if (state && state !== 'connected') {
              return json({
                ok: false,
                provider,
                status: 409,
                error: `WhatsApp desconectado (estado: ${state}). Abra o painel UAZAPI, entre na instância e leia o QR Code novamente.`,
                response: statusText.substring(0, 500),
                action: { label: 'Abrir painel UAZAPI', url: baseUrl },
              })
            }
          } catch (_e) {
            // ignore status check failure and try sending anyway
          }
          // 2) Send text
          res = await fetch(`${baseUrl}/send/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'token': u.instance_token },
            body: JSON.stringify({ number: phone, text: message }),
          })
          // 3) Translate common UAZAPI session errors
          if (!res.ok) {
            const text = await res.text().catch(() => '')
            const lower = text.toLowerCase()
            if (lower.includes('disconnected') || lower.includes('not reconnectable') || lower.includes('session')) {
              return json({
                ok: false,
                provider,
                status: res.status,
                error: 'Sessão do WhatsApp caiu na UAZAPI. Abra o painel, entre na instância e leia o QR Code de novo para reconectar.',
                response: text.substring(0, 500),
                action: { label: 'Abrir painel UAZAPI', url: baseUrl },
              })
            }
            return json({ ok: false, provider, status: res.status, response: text.substring(0, 500) })
          }
        } else if (provider === 'twilio') {
          const tw = wa.twilio || {}
          const auth = btoa(`${tw.account_sid}:${tw.auth_token}`)
          const body = new URLSearchParams({ To: `whatsapp:+${phone}`, From: `whatsapp:${tw.phone}`, Body: message })
          res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${tw.account_sid}/Messages.json`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          })
        } else if (provider === 'meta') {
          const m = wa.meta || {}
          res = await fetch(`https://graph.facebook.com/v18.0/${m.phone_number_id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${m.access_token}` },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } }),
          })
        } else if (provider === 'webhook') {
          const wh = wa.webhook || {}
          if (!wh.url) return json({ ok: false, error: 'Webhook sem URL configurada' })
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (wh.bearer_token) headers['Authorization'] = `Bearer ${wh.bearer_token}`
          if (wh.custom_header_name && wh.custom_header_value) headers[wh.custom_header_name] = wh.custom_header_value
          res = await fetch(wh.url, {
            method: wh.method || 'POST', headers,
            body: JSON.stringify({ phone, message, event: 'test', timestamp: new Date().toISOString() }),
          })
        } else {
          return json({ ok: false, error: `Provedor desconhecido: ${provider}` })
        }
        const text = await res.text().catch(() => '')
        return json({ ok: res.ok, provider, status: res.status, response: text.substring(0, 500) })
      } catch (e: any) {
        return json({ ok: false, provider, error: e?.message || String(e) })
      }
    }

    if (channel === 'email') {
      try {
        const branding = await getEmailBranding(supabase)
        const result = await sendTemplateEmail('customer-notification', recipient, {
          idempotencyKey: `test-${user.id}-${Date.now()}`,
          templateData: {
            subject,
            title: subject,
            bodyText: message,
            ctaLabel: 'Visitar loja',
            ctaUrl: branding.siteUrl || 'https://ogarimpodigital.com.br',
            preheader: 'Mensagem de teste',
            branding,
          },
        })
        if (result.sent) return json({ ok: true, provider: 'lovable-email', status: 202, response: 'accepted for delivery' })
        return json({ ok: false, provider: 'lovable-email', error: result.reason })
      } catch (e: any) {
        return json({ ok: false, provider: 'lovable-email', error: e?.message || String(e) })
      }
    }

    return json({ ok: false, error: `Canal desconhecido: ${channel}` })
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: String(error?.message || error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
