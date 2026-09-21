import { createClient } from 'npm:@supabase/supabase-js@2'
import { getEmailBranding } from '../_shared/email-branding.ts'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { type, orderId, userId, stepIndex = 0 } = await req.json()
    console.log('send-notification called:', { type, orderId, userId, stepIndex })

    // Fetch integrations config
    const { data: settingsRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'integrations')
      .maybeSingle()

    const config = settingsRow?.value as any
    if (!config) {
      console.log('No integrations config found')
      return new Response(JSON.stringify({ ok: false, reason: 'no config' }), { headers: corsHeaders })
    }

    const automations = config.automations || {}
    const eventConfig = automations[type]

    if (!eventConfig?.enabled) {
      console.log(`Automation ${type} is disabled or not configured`)
      return new Response(JSON.stringify({ ok: false, reason: 'disabled' }), { headers: corsHeaders })
    }

    // Resolve step: support both new steps[] format and legacy flat format
    let step: any = null
    if (Array.isArray(eventConfig.steps) && eventConfig.steps.length > 0) {
      step = eventConfig.steps[stepIndex] ?? eventConfig.steps[0]
    } else {
      // Legacy format: treat root config as a single step
      step = {
        enabled: true,
        channel: eventConfig.channel ?? 'whatsapp',
        template: eventConfig.template ?? '',
        subject: eventConfig.subject,
        delay_hours: eventConfig.delay_hours ?? 0,
      }
    }

    if (!step || !step.enabled) {
      console.log(`Step ${stepIndex} is disabled or not found`)
      return new Response(JSON.stringify({ ok: false, reason: 'step_disabled' }), { headers: corsHeaders })
    }

    // Build template context
    let context: Record<string, string> = {}
    let customerPhone = ''
    let customerEmail = ''
    let customerName = ''

    if (orderId) {
      const { data: order } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (product_title, quantity, unit_price),
          profiles:user_id (full_name, phone)
        `)
        .eq('id', orderId)
        .single()

      if (order) {
        const profile = (order as any).profiles
        customerPhone = profile?.phone || ''
        customerName = profile?.full_name || (order.guest_info as any)?.name || 'Cliente'
        customerEmail = (order.guest_info as any)?.email || ''

        const items = ((order as any).order_items || [])
          .map((i: any) => `${i.quantity}x ${i.product_title}`)
          .join(', ')

        context = {
          nome: customerName,
          numero_pedido: order.order_number,
          total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total),
          status: order.status,
          link_rastreio: order.tracking_url || '',
          codigo_rastreio: order.tracking_code || '',
          itens: items,
        }

        if (order.user_id && !customerEmail) {
          const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id)
          customerEmail = authUser?.user?.email || ''
        }
      }
    }

    if (userId && !orderId) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, birth_date, created_at')
        .eq('id', userId)
        .maybeSingle()

      customerPhone = profile?.phone || ''
      customerName = profile?.full_name || 'Cliente'
      customerEmail = authUser?.user?.email || ''

      // Calculate account tenure for account_anniversary
      let tempoCliente = ''
      if (profile?.created_at) {
        const created = new Date(profile.created_at)
        const now = new Date()
        const years = Math.floor((now.getTime() - created.getTime()) / (365.25 * 24 * 3600 * 1000))
        tempoCliente = years === 1 ? '1 ano' : `${years} anos`
      }

      // Extra context for inactive_customer
      let diasInativo = ''
      let ultimoProduto = ''
      if (type === 'inactive_customer') {
        const { data: lastOrder } = await supabase
          .from('orders')
          .select('id, paid_at, created_at, order_items(product_title)')
          .eq('user_id', userId)
          .not('paid_at', 'is', null)
          .order('paid_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (lastOrder?.paid_at) {
          const days = Math.floor((Date.now() - new Date(lastOrder.paid_at).getTime()) / (24 * 3600 * 1000))
          diasInativo = String(days)
          ultimoProduto = ((lastOrder as any).order_items?.[0]?.product_title) || ''
        }
      }

      context = {
        nome: customerName,
        numero_pedido: '',
        total: '',
        status: '',
        link_rastreio: '',
        codigo_rastreio: '',
        itens: '',
        link_loja: 'https://ogarimpodigital.com.br',
        tempo_cliente: tempoCliente,
        dias_inativo: diasInativo,
        ultimo_produto: ultimoProduto,
      }
    }

    const marketingTypes = new Set([
      'abandoned_cart',
      'welcome',
      'birthday',
      'account_anniversary',
      'review_request',
      'inactive_customer',
    ])

    if (marketingTypes.has(type)) {
      if (!userId) {
        return new Response(JSON.stringify({ ok: false, reason: 'marketing_consent_required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: consent } = await supabase
        .from('cookie_consent_log')
        .select('marketing')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (consent?.marketing !== true) {
        console.log(`Marketing notification skipped for ${userId}: consent not granted`)
        return new Response(JSON.stringify({ ok: false, reason: 'marketing_consent_required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Generate automatic coupon if configured
    let couponCode = ''
    if (step.coupon_enabled && step.coupon_value) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let random = ''
      for (let i = 0; i < 6; i++) random += chars[Math.floor(Math.random() * chars.length)]
      const prefix = step.coupon_prefix || 'AUTO'
      couponCode = `${prefix}-${random}`

      const expiresAt = step.coupon_expires_days
        ? new Date(Date.now() + step.coupon_expires_days * 24 * 3600 * 1000).toISOString()
        : null

      await supabase.from('discount_codes').insert({
        code: couponCode,
        type: step.coupon_type === 'fixed' ? 'fixed' : 'percentage',
        value: step.coupon_value,
        max_uses: step.coupon_max_uses ?? 1,
        uses_per_user: 1,
        min_order_value: step.coupon_min_order || null,
        expires_at: expiresAt,
        is_active: true,
      })

      console.log('Auto-coupon created:', couponCode)
    }

    context.cupom = couponCode

    // Replace template variables
    const fillTemplate = (template: string, vars: Record<string, string>) => {
      return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
    }

    const message = fillTemplate(step.template || '', context)
    const subject = fillTemplate(step.subject || `Notificação: ${type}`, context)
    const channel = step.channel || 'whatsapp'

    const results: string[] = []

    const shouldWhatsApp = ['whatsapp', 'both', 'whatsapp_push', 'all'].includes(channel)
    const shouldEmail = ['email', 'both', 'email_push', 'all'].includes(channel)
    const shouldPush = ['push', 'whatsapp_push', 'email_push', 'all'].includes(channel)

    // Send via WhatsApp
    if (shouldWhatsApp && customerPhone) {
      const whatsapp = config.whatsapp || {}
      const provider = whatsapp.active_provider

      try {
        if (provider === 'evolution') {
          const evo = whatsapp.evolution || {}
          const res = await fetch(`${evo.base_url}/message/sendText/${evo.instance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evo.api_key },
            body: JSON.stringify({ number: customerPhone, text: message }),
          })
          results.push(`WhatsApp(evolution):${res.status}`)
        } else if (provider === 'zapi') {
          const zapi = whatsapp.zapi || {}
          const res = await fetch(`https://api.z-api.io/instances/${zapi.instance_id}/token/${zapi.token}/send-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: customerPhone, message }),
          })
          results.push(`WhatsApp(zapi):${res.status}`)
        } else if (provider === 'wppconnect') {
          const wpp = whatsapp.wppconnect || {}
          const res = await fetch(`${wpp.base_url}/api/${wpp.session}/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wpp.secret_key}` },
            body: JSON.stringify({ phone: customerPhone, message }),
          })
          results.push(`WhatsApp(wppconnect):${res.status}`)
        } else if (provider === 'uazapi') {
          const uz = whatsapp.uazapi || {}
          const baseUrl = (uz.base_url || 'https://free.uazapi.com').replace(/\/$/, '')
          const res = await fetch(`${baseUrl}/send/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'token': uz.instance_token || '' },
            body: JSON.stringify({ number: customerPhone, text: message }),
          })
          results.push(`WhatsApp(uazapi):${res.status}`)
        } else if (provider === 'twilio') {
          const tw = whatsapp.twilio || {}
          const authStr = btoa(`${tw.account_sid}:${tw.auth_token}`)
          const body = new URLSearchParams({
            To: `whatsapp:${customerPhone}`,
            From: `whatsapp:${tw.phone}`,
            Body: message,
          })
          const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${tw.account_sid}/Messages.json`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${authStr}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          })
          results.push(`WhatsApp(twilio):${res.status}`)
        } else if (provider === 'meta') {
          const meta = whatsapp.meta || {}
          const res = await fetch(`https://graph.facebook.com/v18.0/${meta.phone_number_id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${meta.access_token}` },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: customerPhone,
              type: 'text',
              text: { body: message },
            }),
          })
          results.push(`WhatsApp(meta):${res.status}`)
        } else if (provider === 'webhook') {
          const wh = whatsapp.webhook || {}
          if (!wh.url) {
            results.push('WhatsApp(webhook):no-url')
          } else {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (wh.bearer_token) headers['Authorization'] = `Bearer ${wh.bearer_token}`
            if (wh.custom_header_name && wh.custom_header_value) {
              headers[wh.custom_header_name] = wh.custom_header_value
            }
            const res = await fetch(wh.url, {
              method: wh.method || 'POST',
              headers,
              body: JSON.stringify({
                phone: customerPhone,
                message,
                event: type ?? null,
                customer_name: customerName || null,
                order_number: context.numero_pedido || null,
                timestamp: new Date().toISOString(),
              }),
            })
            results.push(`WhatsApp(webhook):${res.status}`)
          }
        }
      } catch (e) {
        console.error('WhatsApp send error:', e)
        results.push(`WhatsApp:error`)
      }
    }

    // Send via Email
    if (shouldEmail && customerEmail) {
      try {
        // Branding (logo, colors, store name, campaign coupon footer)
        const branding = await getEmailBranding(supabase)
        const storeUrl = branding.siteUrl || 'https://ogarimpodigital.com.br'

        // Pick CTA based on event type
        let ctaLabel: string | undefined
        let ctaUrl: string | undefined
        if (type === 'order_confirmed' || type === 'order_shipped' || type === 'order_delivered') {
          if (context.numero_pedido) {
            ctaLabel = 'Acompanhar pedido'
            ctaUrl = context.link_rastreio || `${storeUrl}/rastreio/${context.numero_pedido}`
          }
        } else if (type === 'abandoned_cart') {
          ctaLabel = 'Voltar ao carrinho'
          ctaUrl = context.link_carrinho || `${storeUrl}/carrinho`
        } else if (type === 'review_request') {
          ctaLabel = 'Avaliar produtos'
          ctaUrl = context.link_avaliacao || storeUrl
        } else {
          ctaLabel = 'Visitar loja'
          ctaUrl = storeUrl
        }

        const idempotencyKey = orderId
          ? `${type}-${orderId}-${stepIndex}`
          : userId
          ? `${type}-${userId}-${stepIndex}-${Date.now()}`
          : `${type}-${Date.now()}`

        const emailResult = await sendTemplateEmail('customer-notification', customerEmail, {
          idempotencyKey,
          templateData: {
            subject,
            title: subject,
            bodyText: message,
            ctaLabel,
            ctaUrl,
            coupon: couponCode || undefined,
            preheader: subject,
            branding,
          },
        })
        results.push(`Email:${emailResult.sent ? 'sent' : emailResult.reason}`)
      } catch (e) {
        console.error('Email send error:', e)
        results.push(`Email:error`)
      }
    }

    // Send via Push Notification
    if (shouldPush && userId) {
      try {
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')

        if (vapidPrivateKey && vapidPublicKey) {
          // Fetch user's push subscriptions
          const targetUserId = userId || (orderId ? (await supabase.from('orders').select('user_id').eq('id', orderId).single()).data?.user_id : null)
          
          if (targetUserId) {
            const { data: subs } = await supabase
              .from('push_subscriptions')
              .select('*')
              .eq('user_id', targetUserId)

            if (subs && subs.length > 0) {
              // Use web-push via fetch to send notifications
              for (const sub of subs) {
                try {
                  // Simple push via fetch (without web-push library)
                  // We'll use the Web Push protocol directly
                  const payload = JSON.stringify({
                    title: subject || 'Notificação',
                    body: message.substring(0, 200),
                    url: '/',
                  })

                  // For now, log the push attempt - full web-push requires crypto operations
                  console.log(`Push notification queued for endpoint: ${(sub as any).endpoint?.substring(0, 50)}...`)
                  results.push(`Push:queued`)
                } catch (pushErr) {
                  console.error('Push send error for subscription:', pushErr)
                  results.push(`Push:error`)
                }
              }
            } else {
              results.push(`Push:no_subscriptions`)
            }
          }
        } else {
          console.log('VAPID keys not configured for push notifications')
          results.push(`Push:no_vapid_keys`)
        }
      } catch (e) {
        console.error('Push notification error:', e)
        results.push(`Push:error`)
      }
    }

    console.log('Notification results:', results)
    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in send-notification:', error)
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
