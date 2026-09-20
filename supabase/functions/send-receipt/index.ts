import { createClient } from 'npm:@supabase/supabase-js@2'
import { getEmailBranding, type EmailBranding } from '../_shared/email-branding.ts'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', paid: 'Pago', processing: 'Processando',
  shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado',
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX', credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito', boleto: 'Boleto',
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

const fmtDateTime = (d: string) => {
  const dt = new Date(d)
  return `${dt.toLocaleDateString('pt-BR')} às ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function buildText(order: any, items: any[], profile: any, storeName: string) {
  const lines = [
    '📄 COMPROVANTE DE COMPRA',
    `🏪 ${storeName}`,
    '',
    `Pedido: #${order.order_number}`,
    `Data: ${fmtDate(order.created_at)}`,
  ]
  if (profile?.full_name) lines.push(`Cliente: ${profile.full_name}`)
  if (profile?.cpf) lines.push(`CPF: ${profile.cpf}`)
  lines.push('', 'ITENS:')
  items.forEach((i: any) => {
    lines.push(`- ${i.quantity}x ${i.product_title} - ${fmt(i.unit_price)} = ${fmt(i.total_price)}`)
  })
  lines.push('', `Subtotal: ${fmt(order.subtotal)}`)
  if (order.discount_amount > 0) lines.push(`Desconto: -${fmt(order.discount_amount)}`)
  lines.push(`Frete: ${fmt(order.shipping_cost || 0)}`)
  lines.push(`*TOTAL: ${fmt(order.total)}*`)
  lines.push('', `Pagamento: ${PAYMENT_LABELS[order.payment_method] || order.payment_method || 'N/A'}`)
  lines.push(`Status: ${STATUS_LABELS[order.status] || order.status}`)
  lines.push('', 'Obrigado pela compra! 🙏')
  return lines.join('\n')
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c] as string))
}

function buildHTML(order: any, items: any[], profile: any, branding: EmailBranding) {
  const storeName = branding.storeName
  const primary = branding.colors.primary
  const accent = branding.colors.accent
  const addr = order.shipping_address
  const disc = order.discount_amount || 0
  const logoBlock = branding.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(storeName)}" style="max-height:48px;max-width:220px;object-fit:contain;margin:0 auto 12px;display:block"/>`
    : `<h1 style="font-size:22px;letter-spacing:2px;margin:0;color:${primary}">${escapeHtml(storeName.toUpperCase())}</h1>`
  const coupon = branding.activeCoupon
  const couponBlock = coupon
    ? `<div style="border:1px dashed ${primary};padding:18px 20px;text-align:center;margin:28px 0 0;border-radius:4px">
        <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${accent};margin-bottom:6px">Campanha em destaque</div>
        <div style="font-size:14px;color:${primary};margin-bottom:10px;line-height:1.5">${escapeHtml(coupon.headline).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</div>
        ${coupon.code ? `<div style="font-size:20px;font-weight:600;letter-spacing:0.08em;color:${primary};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;margin-bottom:6px">${escapeHtml(coupon.code)}</div>` : ''}
        ${coupon.description ? `<div style="font-size:11px;color:${accent}">${escapeHtml(coupon.description)}</div>` : ''}
      </div>`
    : ''
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Comprovante - ${order.order_number}</title>
<style>
body{font-family:'Segoe UI',sans-serif;color:#1a1a1a;padding:40px;max-width:700px;margin:0 auto;background:#ffffff}
.hdr{text-align:center;border-bottom:2px solid ${primary};padding-bottom:16px;margin-bottom:24px}
.hdr p{font-size:12px;color:#666;margin:4px 0 0}
.sec{font-size:13px;margin-top:20px}
.sec h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:8px}
table{width:100%;border-collapse:collapse;margin:12px 0}
th{text-align:left;font-size:11px;text-transform:uppercase;color:#888;padding:8px 4px;border-bottom:1px solid #ddd}
td{padding:8px 4px;font-size:13px;border-bottom:1px solid #f0f0f0}
td:last-child,th:last-child{text-align:right}
.tot .r{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
.tot .g{font-size:16px;font-weight:700;border-top:2px solid ${primary};padding-top:10px;margin-top:8px;color:${primary}}
.tot .d{color:#16a34a}
.ft{text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #ddd;font-size:11px;color:#999}
</style></head><body>
<div class="hdr">${logoBlock}<p>COMPROVANTE DE COMPRA</p></div>
<div class="sec"><h3>Dados do Pedido</h3>
<p>Pedido: #${order.order_number} | Data: ${fmtDateTime(order.created_at)}</p>
<p>Status: ${STATUS_LABELS[order.status] || order.status} | Pagamento: ${PAYMENT_LABELS[order.payment_method] || order.payment_method || 'N/A'}</p></div>
${profile ? `<div class="sec"><h3>Cliente</h3><p>${profile.full_name || ''}${profile.cpf ? ` - CPF: ${profile.cpf}` : ''}${profile.phone ? ` - Tel: ${profile.phone}` : ''}</p></div>` : ''}
${addr ? `<div class="sec"><h3>Endereço</h3><p>${addr.recipient_name || ''}<br>${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}<br>${addr.neighborhood} - ${addr.city}/${addr.state} - CEP: ${addr.zip_code}</p></div>` : ''}
<div class="sec"><h3>Itens</h3></div>
<table><thead><tr><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead><tbody>
${items.map((i: any) => `<tr><td>${i.product_title}</td><td>${i.quantity}</td><td>${fmt(i.unit_price)}</td><td>${fmt(i.total_price)}</td></tr>`).join('')}
</tbody></table>
<div class="tot">
<div class="r"><span>Subtotal</span><span>${fmt(order.subtotal)}</span></div>
${disc > 0 ? `<div class="r d"><span>Desconto${order.discount_code ? ` (${order.discount_code})` : ''}</span><span>-${fmt(disc)}</span></div>` : ''}
<div class="r"><span>Frete</span><span>${fmt(order.shipping_cost || 0)}</span></div>
<div class="r g"><span>TOTAL</span><span>${fmt(order.total)}</span></div>
</div>
${couponBlock}
<div class="ft"><p>Documento sem valor fiscal. Emitido em ${fmtDateTime(new Date().toISOString())}.</p><p>Obrigado pela preferência!</p></div>
</body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { orderId } = await req.json()
    if (!orderId) {
      return new Response(JSON.stringify({ ok: false, error: 'orderId required' }), { status: 400, headers: corsHeaders })
    }

    // Fetch order + items + profile
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, order_items(*), profiles:user_id(full_name, phone, cpf)')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return new Response(JSON.stringify({ ok: false, error: 'Order not found' }), { status: 404, headers: corsHeaders })
    }

    const profile = (order as any).profiles
    const items = (order as any).order_items || []
    const guestInfo = order.guest_info as any

    // Resolve customer contact info
    let customerPhone = profile?.phone || ''
    let customerEmail = ''
    const customerName = profile?.full_name || guestInfo?.name || 'Cliente'

    if (guestInfo?.email) customerEmail = guestInfo.email
    if (order.user_id && !customerEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id)
      customerEmail = authUser?.user?.email || ''
    }

    // Fetch integrations config
    const { data: settingsRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'integrations')
      .maybeSingle()

    const config = settingsRow?.value as any
    const branding = await getEmailBranding(supabase)
    const storeName = branding.storeName

    const textReceipt = buildText(order, items, profile, storeName)
    const htmlReceipt = buildHTML(order, items, profile, branding)

    const results: string[] = []

    // Send via WhatsApp
    if (config && customerPhone) {
      const whatsapp = config.whatsapp || {}
      const provider = whatsapp.active_provider
      try {
        if (provider === 'evolution') {
          const evo = whatsapp.evolution || {}
          const res = await fetch(`${evo.base_url}/message/sendText/${evo.instance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evo.api_key },
            body: JSON.stringify({ number: customerPhone, text: textReceipt }),
          })
          results.push(`WhatsApp(evolution):${res.status}`)
        } else if (provider === 'zapi') {
          const zapi = whatsapp.zapi || {}
          const res = await fetch(`https://api.z-api.io/instances/${zapi.instance_id}/token/${zapi.token}/send-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: customerPhone, message: textReceipt }),
          })
          results.push(`WhatsApp(zapi):${res.status}`)
        } else if (provider === 'wppconnect') {
          const wpp = whatsapp.wppconnect || {}
          const res = await fetch(`${wpp.base_url}/api/${wpp.session}/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wpp.secret_key}` },
            body: JSON.stringify({ phone: customerPhone, message: textReceipt }),
          })
          results.push(`WhatsApp(wppconnect):${res.status}`)
        } else if (provider === 'twilio') {
          const tw = whatsapp.twilio || {}
          const auth = btoa(`${tw.account_sid}:${tw.auth_token}`)
          const body = new URLSearchParams({ To: `whatsapp:${customerPhone}`, From: `whatsapp:${tw.phone}`, Body: textReceipt })
          const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${tw.account_sid}/Messages.json`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          })
          results.push(`WhatsApp(twilio):${res.status}`)
        } else if (provider === 'meta') {
          const meta = whatsapp.meta || {}
          const res = await fetch(`https://graph.facebook.com/v18.0/${meta.phone_number_id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${meta.access_token}` },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: customerPhone, type: 'text', text: { body: textReceipt } }),
          })
          results.push(`WhatsApp(meta):${res.status}`)
        }
      } catch (e) {
        console.error('WhatsApp error:', e)
        results.push('WhatsApp:error')
      }
    }

    // Send via Email
    if (customerEmail) {
      try {
        const emailResult = await sendTemplateEmail('customer-notification', customerEmail, {
          idempotencyKey: `purchase-receipt-${order.id}`,
          templateData: {
            subject: `Comprovante de compra — Pedido #${order.order_number}`,
            title: 'Comprovante de compra',
            subtitle: `Pedido #${order.order_number}`,
            bodyText: textReceipt.replace(/[*📄🏪🙏]/g, '').trim(),
            ctaLabel: 'Acompanhar pedido',
            ctaUrl: `${branding.siteUrl}/rastreio/${order.order_number}`,
            preheader: `Comprovante do pedido #${order.order_number}`,
            branding,
            showCampaignCoupon: false,
          },
        })
        results.push(`Email:${emailResult.sent ? 'sent' : emailResult.reason}`)
      } catch (e) {
        console.error('Email error:', e)
        results.push('Email:error')
      }
    }

    console.log('send-receipt results:', results)
    return new Response(JSON.stringify({ ok: true, results, customerName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in send-receipt:', error)
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
