import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    console.log('check-scheduled-automations: starting daily run', new Date().toISOString())

    // Fetch automations config
    const { data: settingsRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'integrations')
      .maybeSingle()

    const config = settingsRow?.value as any
    const automations = config?.automations || {}
    const adminReports = config?.admin_reports || {}

    const today = new Date()
    const todayMonth = today.getUTCMonth() + 1
    const todayDay = today.getUTCDate()
    const todayYear = today.getUTCFullYear()
    const todayDayOfWeek = today.getUTCDay() // 0=Sun, 1=Mon

    const results: { type: string; userId: string; status: string }[] = []

    // ---- Birthday automation ----
    if (automations.birthday?.enabled) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, birth_date, phone')
        .not('birth_date', 'is', null)

      const birthdayUsers = (profiles || []).filter((p: any) => {
        if (!p.birth_date) return false
        const bd = new Date(p.birth_date)
        return bd.getUTCMonth() + 1 === todayMonth && bd.getUTCDate() === todayDay
      })

      console.log(`Birthday: found ${birthdayUsers.length} customers`)

      let bIdx = 0
      for (const profile of birthdayUsers) {
        try {
          const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enqueue-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ type: 'birthday', userId: profile.id, stepIndex: 0, batchSize: birthdayUsers.length, batchIndex: bIdx++ }),
          })
          results.push({ type: 'birthday', userId: profile.id, status: res.ok ? 'enqueued' : 'failed' })
        } catch (e) {
          console.error(`Birthday send error for ${profile.id}:`, e)
          results.push({ type: 'birthday', userId: profile.id, status: 'error' })
        }
      }
    }

    // ---- Account anniversary automation ----
    if (automations.account_anniversary?.enabled) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, created_at, phone')

      const anniversaryUsers = (profiles || []).filter((p: any) => {
        if (!p.created_at) return false
        const created = new Date(p.created_at)
        const createdYear = created.getUTCFullYear()
        return (
          createdYear < todayYear &&
          created.getUTCMonth() + 1 === todayMonth &&
          created.getUTCDate() === todayDay
        )
      })

      console.log(`Account anniversary: found ${anniversaryUsers.length} customers`)

      let aIdx = 0
      for (const profile of anniversaryUsers) {
        try {
          const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enqueue-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ type: 'account_anniversary', userId: profile.id, stepIndex: 0, batchSize: anniversaryUsers.length, batchIndex: aIdx++ }),
          })
          results.push({ type: 'account_anniversary', userId: profile.id, status: res.ok ? 'enqueued' : 'failed' })
        } catch (e) {
          console.error(`Account anniversary send error for ${profile.id}:`, e)
          results.push({ type: 'account_anniversary', userId: profile.id, status: 'error' })
        }
      }
    }

    // ---- Inactive customer (win-back) ----
    if (automations.inactive_customer?.enabled) {
      const days = Math.max(7, Math.min(365, automations.inactive_customer.inactive_days ?? 60))
      const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()
      const winbackCooldown = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

      // Customers whose most recent paid order is older than cutoff
      // and who haven't received a win-back in the last 30 days.
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, last_winback_at')

      const targetUsers: any[] = []
      for (const p of profiles || []) {
        if (p.last_winback_at && p.last_winback_at > winbackCooldown) continue
        const { data: latest } = await supabase
          .from('orders')
          .select('paid_at')
          .eq('user_id', p.id)
          .not('paid_at', 'is', null)
          .order('paid_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (!latest?.paid_at) continue
        if (latest.paid_at < cutoff) targetUsers.push(p)
      }

      console.log(`Inactive customer: found ${targetUsers.length} candidates (>= ${days} days)`)

      let iIdx = 0
      for (const profile of targetUsers) {
        try {
          const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enqueue-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ type: 'inactive_customer', userId: profile.id, stepIndex: 0, batchSize: targetUsers.length, batchIndex: iIdx++ }),
          })
          if (res.ok) {
            await supabase
              .from('profiles')
              .update({ last_winback_at: new Date().toISOString() })
              .eq('id', profile.id)
          }
          results.push({ type: 'inactive_customer', userId: profile.id, status: res.ok ? 'enqueued' : 'failed' })
        } catch (e) {
          console.error(`Inactive customer send error for ${profile.id}:`, e)
          results.push({ type: 'inactive_customer', userId: profile.id, status: 'error' })
        }
      }
    }

    // ---- Admin Store Reports ----
    const reportPeriods: string[] = []
    if (adminReports.daily_enabled) reportPeriods.push('daily')
    if (adminReports.weekly_enabled && todayDayOfWeek === 1) reportPeriods.push('weekly')
    if (adminReports.monthly_enabled && todayDay === 1) reportPeriods.push('monthly')

    for (const period of reportPeriods) {
      try {
        console.log(`Dispatching admin-store-report: ${period}`)
        const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/admin-store-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ period }),
        })
        results.push({ type: `report_${period}`, userId: 'system', status: res.ok ? 'sent' : 'failed' })
      } catch (e) {
        console.error(`Report ${period} dispatch error:`, e)
        results.push({ type: `report_${period}`, userId: 'system', status: 'error' })
      }
    }

    // ---- Accounting alerts (daily) ----
    const accountingEvents = ['expense_due_check', 'unclosed_register_check']
    if (todayDay === 1) accountingEvents.push('monthly_closing_reminder')
    for (const event_type of accountingEvents) {
      try {
        const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-accounting-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ event_type }),
        })
        results.push({ type: event_type, userId: 'system', status: res.ok ? 'sent' : 'failed' })
      } catch (e) {
        console.error(`Accounting event ${event_type} error:`, e)
        results.push({ type: event_type, userId: 'system', status: 'error' })
      }
    }

    console.log('check-scheduled-automations: completed', results.length, 'dispatches')

    return new Response(JSON.stringify({ ok: true, dispatched: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in check-scheduled-automations:', error)
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
