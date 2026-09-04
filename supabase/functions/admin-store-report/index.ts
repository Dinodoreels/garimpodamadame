import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function periodLabel(period: string): string {
  if (period === 'daily') return 'Diário'
  if (period === 'weekly') return 'Semanal'
  return 'Mensal'
}

function getDateRange(period: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date()
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59))

  let start: Date
  let prevStart: Date
  let prevEnd: Date

  if (period === 'daily') {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
    prevEnd = new Date(start.getTime() - 1)
    prevStart = new Date(Date.UTC(prevEnd.getUTCFullYear(), prevEnd.getUTCMonth(), prevEnd.getUTCDate(), 0, 0, 0))
  } else if (period === 'weekly') {
    const dayOfWeek = now.getUTCDay()
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset, 0, 0, 0))
    prevEnd = new Date(start.getTime() - 1)
    prevStart = new Date(prevEnd.getTime() - 6 * 86400000)
    prevStart = new Date(Date.UTC(prevStart.getUTCFullYear(), prevStart.getUTCMonth(), prevStart.getUTCDate(), 0, 0, 0))
  } else {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
    prevStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0))
    prevEnd = new Date(start.getTime() - 1)
  }

  return { start, end, prevStart, prevEnd }
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

    const { period = 'daily' } = await req.json()
    console.log('admin-store-report: generating', period, 'report')

    const { start, end, prevStart, prevEnd } = getDateRange(period)
    const startISO = start.toISOString()
    const endISO = end.toISOString()
    const prevStartISO = prevStart.toISOString()
    const prevEndISO = prevEnd.toISOString()

    // Fetch integrations config for WhatsApp
    const { data: settingsRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'integrations')
      .maybeSingle()

    const config = settingsRow?.value as any
    // Use dedicated admin reports WhatsApp config, fallback to general whatsapp
    const adminWa = config?.admin_reports?.whatsapp
    const whatsappConfig = (adminWa?.active_provider) ? adminWa : config?.whatsapp
    const adminReports = config?.admin_reports || {}
    const channelKey = period === 'weekly' ? 'weekly_channel' : period === 'monthly' ? 'monthly_channel' : 'daily_channel'
    const channel: 'whatsapp' | 'email' | 'both' = adminReports[channelKey] || 'whatsapp'
    const wantsWhats = channel === 'whatsapp' || channel === 'both'
    const wantsEmail = channel === 'email' || channel === 'both'
    const emailRecipients: string[] = Array.isArray(adminReports.email_recipients) ? adminReports.email_recipients : []

    if (wantsWhats && !whatsappConfig?.active_provider && !wantsEmail) {
      return new Response(JSON.stringify({ ok: false, reason: 'no_whatsapp_provider' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Fetch orders for current & previous period ──
    const { data: currentOrders } = await supabase
      .from('orders')
      .select('id, total, subtotal, status, source, created_by, created_at')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const { data: prevOrders } = await supabase
      .from('orders')
      .select('id, total')
      .gte('created_at', prevStartISO)
      .lte('created_at', prevEndISO)

    const orders = currentOrders || []
    const paidStatuses = ['confirmed', 'paid', 'shipped', 'delivered']
    const paidOrders = orders.filter(o => paidStatuses.includes(o.status))

    const revenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0)
    const prevRevenue = (prevOrders || [])
      .filter((o: any) => paidStatuses.includes(o.status))
      .reduce((s: number, o: any) => s + (o.total || 0), 0)

    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue * 100) : 0
    const changeStr = revenueChange >= 0 ? `+${revenueChange.toFixed(0)}%` : `${revenueChange.toFixed(0)}%`
    const ticketMedio = paidOrders.length > 0 ? revenue / paidOrders.length : 0

    // ── Top 5 products ──
    const orderIds = paidOrders.map(o => o.id)
    let topProducts: { title: string; qty: number; revenue: number; stock: number }[] = []
    let noSalesProducts: string[] = []

    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from('order_items')
        .select('product_title, quantity, total_price, product_id')
        .in('order_id', orderIds)

      const productMap: Record<string, { title: string; qty: number; revenue: number; productId: string | null }> = {}
      for (const item of (items || [])) {
        const key = item.product_title
        if (!productMap[key]) productMap[key] = { title: key, qty: 0, revenue: 0, productId: item.product_id }
        productMap[key].qty += item.quantity
        productMap[key].revenue += item.total_price
      }

      const sorted = Object.values(productMap).sort((a, b) => b.qty - a.qty)
      const top5 = sorted.slice(0, 5)

      // Get stock for top products
      const productIds = top5.map(p => p.productId).filter(Boolean) as string[]
      let stockMap: Record<string, number> = {}
      if (productIds.length > 0) {
        const { data: variants } = await supabase
          .from('product_variants')
          .select('product_id, inventory_quantity')
          .in('product_id', productIds)

        for (const v of (variants || [])) {
          stockMap[v.product_id] = (stockMap[v.product_id] || 0) + v.inventory_quantity
        }
      }

      topProducts = top5.map(p => ({
        title: p.title,
        qty: p.qty,
        revenue: p.revenue,
        stock: p.productId ? (stockMap[p.productId] ?? 0) : 0,
      }))

      // Products with no sales
      const soldProductIds = new Set(Object.values(productMap).map(p => p.productId).filter(Boolean))
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, title')
        .eq('status', 'active')
        .limit(100)

      noSalesProducts = (allProducts || [])
        .filter(p => !soldProductIds.has(p.id))
        .slice(0, 5)
        .map(p => p.title)
    }

    // ── Top seller ──
    const sellerMap: Record<string, number> = {}
    for (const o of paidOrders) {
      if (o.created_by) {
        sellerMap[o.created_by] = (sellerMap[o.created_by] || 0) + 1
      }
    }
    let topSellerName = 'N/A'
    let topSellerCount = 0
    const topSellerId = Object.entries(sellerMap).sort((a, b) => b[1] - a[1])[0]
    if (topSellerId) {
      topSellerCount = topSellerId[1]
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', topSellerId[0])
        .maybeSingle()
      topSellerName = profile?.full_name || 'Desconhecido'
    }

    // ── Sales channels ──
    const channelMap: Record<string, number> = {}
    for (const o of paidOrders) {
      const source = o.source || 'website'
      channelMap[source] = (channelMap[source] || 0) + 1
    }
    const channelLabels: Record<string, string> = { website: 'Site', whatsapp: 'WhatsApp', manual: 'Manual', store: 'Loja' }
    const channels = Object.entries(channelMap)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${channelLabels[k] || k} (${v})`)
      .join(' | ')

    // ── Pending orders ──
    const pendingCount = orders.filter(o => ['pending', 'pending_payment'].includes(o.status)).length

    // ── New customers ──
    const { count: newCustomers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    // ── Format message ──
    const dateStr = start.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const prevWord = period === 'daily' ? 'vs ontem' : period === 'weekly' ? 'vs semana anterior' : 'vs mês anterior'

    let msg = `📊 *Resumo ${periodLabel(period)} - ${dateStr}*\n\n`
    msg += `💰 *Receita:* ${formatBRL(revenue)} (${changeStr} ${prevWord})\n`
    msg += `🛒 *Pedidos:* ${paidOrders.length} | Ticket médio: ${formatBRL(ticketMedio)}\n`
    msg += `👥 *Novos clientes:* ${newCustomers || 0}\n\n`

    if (topProducts.length > 0) {
      msg += `🏆 *Top ${topProducts.length} Produtos:*\n`
      topProducts.forEach((p, i) => {
        const stockWarning = p.stock <= 5 ? ' ⚠️' : ''
        msg += `${i + 1}. ${p.title} - ${p.qty} un (${formatBRL(p.revenue)}) | Estoque: ${p.stock}${stockWarning}\n`
      })
      msg += '\n'
    }

    if (noSalesProducts.length > 0) {
      msg += `📦 *Sem vendas no período:* ${noSalesProducts.join(', ')}\n\n`
    }

    msg += `👤 *Top Vendedor:* ${topSellerName} (${topSellerCount} pedidos)\n`
    if (channels) msg += `📱 *Top Canal:* ${channels}\n`
    if (pendingCount > 0) msg += `\n⏳ *Pendentes:* ${pendingCount} pedidos aguardando pagamento`

    console.log('Report message generated, length:', msg.length)

    // ── Email dispatch ──
    const emailResults: { recipient: string; status: string }[] = []
    if (wantsEmail && emailRecipients.length > 0) {
      const title = `Resumo ${periodLabel(period)} — ${dateStr}`
      for (const recipient of emailRecipients) {
        const clean = String(recipient).trim()
        if (!clean) continue
        try {
          const { error } = await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'admin-report',
              recipientEmail: clean,
              idempotencyKey: `admin-report-${period}-${startISO.slice(0, 10)}-${clean}`,
              templateData: { title, subtitle: prevWord, bodyText: msg.replace(/\*/g, '') },
            },
          })
          emailResults.push({ recipient: clean, status: error ? `failed:${error.message}` : 'sent' })
        } catch (e) {
          emailResults.push({ recipient: clean, status: `error:${String(e)}` })
        }
      }
    }

    // ── Send to all admins via WhatsApp ──
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')

    const adminIds = (adminRoles || []).map((r: any) => r.user_id)
    const results: { userId: string; status: string }[] = []

    if (wantsWhats && whatsappConfig?.active_provider && adminIds.length > 0) {
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, phone')
        .in('id', adminIds)

      const provider = whatsappConfig.active_provider

      for (const admin of (adminProfiles || [])) {
        if (!admin.phone) {
          results.push({ userId: admin.id, status: 'no_phone' })
          continue
        }

        try {
          let res: Response | null = null

          if (provider === 'evolution') {
            const evo = whatsappConfig.evolution || {}
            res = await fetch(`${evo.base_url}/message/sendText/${evo.instance}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': evo.api_key },
              body: JSON.stringify({ number: admin.phone, text: msg }),
            })
          } else if (provider === 'zapi') {
            const zapi = whatsappConfig.zapi || {}
            res = await fetch(`https://api.z-api.io/instances/${zapi.instance_id}/token/${zapi.token}/send-text`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: admin.phone, message: msg }),
            })
          } else if (provider === 'wppconnect') {
            const wpp = whatsappConfig.wppconnect || {}
            res = await fetch(`${wpp.base_url}/api/${wpp.session}/send-message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wpp.secret_key}` },
              body: JSON.stringify({ phone: admin.phone, message: msg }),
            })
          } else if (provider === 'twilio') {
            const tw = whatsappConfig.twilio || {}
            const authStr = btoa(`${tw.account_sid}:${tw.auth_token}`)
            const body = new URLSearchParams({
              To: `whatsapp:${admin.phone}`,
              From: `whatsapp:${tw.phone}`,
              Body: msg,
            })
            res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${tw.account_sid}/Messages.json`, {
              method: 'POST',
              headers: { 'Authorization': `Basic ${authStr}`, 'Content-Type': 'application/x-www-form-urlencoded' },
              body,
            })
          } else if (provider === 'meta') {
            const meta = whatsappConfig.meta || {}
            res = await fetch(`https://graph.facebook.com/v18.0/${meta.phone_number_id}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${meta.access_token}` },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: admin.phone,
                type: 'text',
                text: { body: msg },
              }),
            })
          }

          results.push({ userId: admin.id, status: res?.ok ? 'sent' : `failed:${res?.status}` })
        } catch (e) {
          console.error(`Error sending report to admin ${admin.id}:`, e)
          results.push({ userId: admin.id, status: 'error' })
        }
      }
    }

    console.log('admin-store-report: done, results:', results)
    return new Response(JSON.stringify({ ok: true, period, channel, results, email_results: emailResults, message_preview: msg.substring(0, 200) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in admin-store-report:', error)
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
