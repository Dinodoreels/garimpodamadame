import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getEmailBranding } from '../_shared/email-branding.ts'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const formatBRL = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

async function sendWhatsApp(whatsappConfig: any, phone: string, msg: string) {
  const provider = whatsappConfig.active_provider
  try {
    if (provider === 'evolution') {
      const evo = whatsappConfig.evolution || {}
      return await fetch(`${evo.base_url}/message/sendText/${evo.instance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evo.api_key },
        body: JSON.stringify({ number: phone, text: msg }),
      })
    }
    if (provider === 'zapi') {
      const z = whatsappConfig.zapi || {}
      return await fetch(`https://api.z-api.io/instances/${z.instance_id}/token/${z.token}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: msg }),
      })
    }
    if (provider === 'uazapi') {
      const u = whatsappConfig.uazapi || {}
      return await fetch(`${u.base_url}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'token': u.instance_token },
        body: JSON.stringify({ number: phone, text: msg }),
      })
    }
    if (provider === 'meta') {
      const m = whatsappConfig.meta || {}
      return await fetch(`https://graph.facebook.com/v18.0/${m.phone_number_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${m.access_token}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: msg } }),
      })
    }
  } catch (e) {
    console.error('sendWhatsApp error:', e)
  }
  return null
}

async function broadcastToAdmins(supabase: any, whatsappConfig: any, msg: string) {
  const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin')
  const ids = (roles || []).map((r: any) => r.user_id)
  if (ids.length === 0) return { sent: 0 }
  const { data: profiles } = await supabase.from('profiles').select('id, phone').in('id', ids)
  let sent = 0
  for (const p of (profiles || [])) {
    if (!p.phone) continue
    const res = await sendWhatsApp(whatsappConfig, p.phone, msg)
    if (res?.ok) sent++
  }
  return { sent }
}

async function broadcastEmail(supabase: any, recipients: string[], title: string, msg: string, key: string) {
  let sent = 0
  const branding = await getEmailBranding(supabase)
  for (const r of recipients) {
    const clean = String(r).trim()
    if (!clean) continue
    try {
      const result = await sendTemplateEmail('admin-report', clean, {
        idempotencyKey: `${key}-${clean}`,
        templateData: { title, bodyText: msg.replace(/\*/g, ''), branding },
      })
      if (result.sent) sent++
    } catch (e) { console.error('email dispatch error', e) }
  }
  return { email_sent: sent }
}

async function dispatch(supabase: any, wa: any, recipients: string[], channel: string, title: string, msg: string, key: string) {
  const wantsWa = channel === 'whatsapp' || channel === 'both' || !channel
  const wantsEmail = channel === 'email' || channel === 'both'
  const out: any = {}
  if (wantsWa && wa?.active_provider) {
    Object.assign(out, await broadcastToAdmins(supabase, wa, msg))
  }
  if (wantsEmail && recipients.length > 0) {
    Object.assign(out, await broadcastEmail(supabase, recipients, title, msg, key))
  }
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json().catch(() => ({}))
    const event: string = body.event_type
    if (!event) {
      return new Response(JSON.stringify({ ok: false, error: 'event_type required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: settings } = await supabase.from('site_settings').select('value').eq('key', 'integrations').maybeSingle()
    const config = settings?.value as any
    const adminReports = config?.admin_reports || {}
    const wa = adminReports.whatsapp?.active_provider ? adminReports.whatsapp : config?.whatsapp
    const emailRecipients: string[] = Array.isArray(adminReports.email_recipients) ? adminReports.email_recipients : []
    const channel: string = adminReports.alerts_channel || 'whatsapp'
    const hasWa = !!wa?.active_provider
    const hasEmail = (channel === 'email' || channel === 'both') && emailRecipients.length > 0
    if (!hasWa && !hasEmail) {
      return new Response(JSON.stringify({ ok: false, reason: 'no_whatsapp_provider' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const alertsCfg = adminReports.cash_register_alerts || {}

    // ── Event: cash register closed ──
    if (event === 'cash_register_closed') {
      if (!alertsCfg.close_register_summary && !alertsCfg.divergence_threshold) {
        return new Response(JSON.stringify({ ok: true, skipped: 'disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { register_id } = body
      const { data: reg } = await supabase.from('cash_registers').select('*').eq('id', register_id).maybeSingle()
      if (!reg) {
        return new Response(JSON.stringify({ ok: false, error: 'register not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const { data: mvs } = await supabase.from('cash_movements').select('type, amount').eq('register_id', register_id)
      const sales = (mvs || []).filter((m: any) => m.type === 'sale').reduce((s: number, m: any) => s + Number(m.amount), 0)
      const salesCount = (mvs || []).filter((m: any) => m.type === 'sale').length
      const sup = (mvs || []).filter((m: any) => m.type === 'supply').reduce((s: number, m: any) => s + Number(m.amount), 0)
      const wit = (mvs || []).filter((m: any) => m.type === 'withdrawal').reduce((s: number, m: any) => s + Number(m.amount), 0)
      const diff = Number(reg.difference || 0)
      const threshold = Number(alertsCfg.divergence_threshold || 0)

      let opName = 'Operador'
      if (reg.closed_by) {
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', reg.closed_by).maybeSingle()
        if (prof?.full_name) opName = prof.full_name
      }
      const closedAt = reg.closed_at ? new Date(reg.closed_at) : new Date()
      const dateStr = closedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

      let msg = `🔒 *Caixa Fechado — ${dateStr}*\n\n`
      msg += `👤 Operador: ${opName}\n`
      msg += `💰 Vendas: ${formatBRL(sales)} (${salesCount})\n`
      msg += `⬆️ Suprimentos: ${formatBRL(sup)}\n`
      msg += `⬇️ Sangrias: ${formatBRL(wit)}\n`
      msg += `📊 Esperado: ${formatBRL(Number(reg.expected_amount || 0))}\n`
      msg += `💵 Fechamento: ${formatBRL(Number(reg.closing_amount || 0))}\n`
      const divEmoji = diff === 0 ? '✅' : Math.abs(diff) >= threshold ? '🚨' : '⚠️'
      msg += `${divEmoji} Diferença: ${formatBRL(diff)}\n`
      if (reg.notes) msg += `\n📝 ${reg.notes}`

      const send = alertsCfg.close_register_summary || (threshold > 0 && Math.abs(diff) >= threshold)
      if (!send) {
        return new Response(JSON.stringify({ ok: true, skipped: 'no_trigger_match' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const result = await dispatch(supabase, wa, emailRecipients, channel, `Caixa Fechado — ${dateStr}`, msg, `cash-closed-${register_id}`)
      return new Response(JSON.stringify({ ok: true, event, ...result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── Event: unclosed register check ──
    if (event === 'unclosed_register_check') {
      if (!alertsCfg.unclosed_register_alert) {
        return new Response(JSON.stringify({ ok: true, skipped: 'disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const cutoff = new Date(Date.now() - 14 * 3600 * 1000).toISOString()
      const { data: regs } = await supabase.from('cash_registers').select('id, opened_at, opened_by, opening_amount').eq('status', 'open').lt('opened_at', cutoff)
      const list = regs || []
      if (list.length === 0) {
        return new Response(JSON.stringify({ ok: true, alerts: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const userIds = list.map((r: any) => r.opened_by).filter(Boolean)
      const nameMap = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
        ;(profs || []).forEach((p: any) => nameMap.set(p.id, p.full_name || 'Operador'))
      }
      let msg = `⚠️ *Caixa(s) aberto(s) há +14h*\n\n`
      list.forEach((r: any) => {
        const hours = Math.round((Date.now() - new Date(r.opened_at).getTime()) / 3600000)
        msg += `• ${nameMap.get(r.opened_by) || 'Operador'} — há ${hours}h (abertura ${formatBRL(Number(r.opening_amount))})\n`
      })
      msg += `\nLembre o operador de fechar o caixa.`
      const result = await dispatch(supabase, wa, emailRecipients, channel, 'Caixa aberto há +14h', msg, `unclosed-${cutoff}`)
      return new Response(JSON.stringify({ ok: true, event, alerts: list.length, ...result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── Event: expense due check ──
    if (event === 'expense_due_check') {
      const dueCfg = adminReports.expense_due_alerts
      if (!dueCfg?.enabled) {
        return new Response(JSON.stringify({ ok: true, skipped: 'disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const days = Number(dueCfg.days_before || 3)
      const today = new Date()
      const todayStr = today.toISOString().slice(0, 10)
      const limit = new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10)
      const { data: exps } = await supabase.from('expenses').select('description, amount, due_date, supplier').is('paid_at', null).lte('due_date', limit).order('due_date', { ascending: true })
      const list = exps || []
      if (list.length === 0) {
        return new Response(JSON.stringify({ ok: true, alerts: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const overdue = list.filter((e: any) => e.due_date < todayStr)
      const upcoming = list.filter((e: any) => e.due_date >= todayStr)
      const sum = list.reduce((s: number, e: any) => s + Number(e.amount), 0)
      let msg = `💸 *Despesas a vencer / vencidas*\n\n`
      msg += `Total: ${formatBRL(sum)} (${list.length})\n\n`
      if (overdue.length > 0) {
        msg += `🚨 *Vencidas (${overdue.length}):*\n`
        overdue.slice(0, 10).forEach((e: any) => {
          const d = new Date(e.due_date).toLocaleDateString('pt-BR')
          msg += `• ${e.description} — ${formatBRL(Number(e.amount))} (venc. ${d})\n`
        })
        msg += '\n'
      }
      if (upcoming.length > 0) {
        msg += `⏳ *Próximas ${days} dias (${upcoming.length}):*\n`
        upcoming.slice(0, 10).forEach((e: any) => {
          const d = new Date(e.due_date).toLocaleDateString('pt-BR')
          msg += `• ${e.description} — ${formatBRL(Number(e.amount))} (venc. ${d})\n`
        })
      }
      const result = await dispatch(supabase, wa, emailRecipients, channel, 'Despesas a vencer', msg, `expense-due-${todayStr}`)
      return new Response(JSON.stringify({ ok: true, event, alerts: list.length, ...result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── Event: monthly closing reminder ──
    if (event === 'monthly_closing_reminder') {
      if (!adminReports.monthly_closing_reminder) {
        return new Response(JSON.stringify({ ok: true, skipped: 'disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const now = new Date()
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const { data: closing } = await supabase.from('inventory_closings').select('id').eq('year', prev.getFullYear()).eq('month', prev.getMonth() + 1).maybeSingle()
      if (closing) {
        return new Response(JSON.stringify({ ok: true, skipped: 'already_closed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const monthName = prev.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      const msg = `📅 *Lembrete contábil*\n\nO mês de *${monthName}* ainda não foi fechado.\n\nAcesse Contabilidade → Estoque Mensal para gerar o snapshot e travar o histórico.`
      const result = await dispatch(supabase, wa, emailRecipients, channel, `Lembrete: fechar ${monthName}`, msg, `monthly-reminder-${prev.getFullYear()}-${prev.getMonth() + 1}`)
      return new Response(JSON.stringify({ ok: true, event, ...result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: false, error: `unknown event ${event}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('notify-accounting-events error:', e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})