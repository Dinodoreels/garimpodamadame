import { requireInternalOrAdmin, requireAuthenticated } from '../_shared/internal-auth.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnqueuePayload {
  type: string
  orderId?: string
  userId?: string
  stepIndex?: number
  channel?: string
  // For batch jobs (e.g. birthday for many users), pass batchSize so jitter spreads them
  batchSize?: number
  batchIndex?: number
  immediate?: boolean
}

function parseHM(s: string): { h: number; m: number } {
  const [h, m] = (s || '00:00').split(':').map((x) => parseInt(x, 10))
  return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m }
}

function inQuietHours(date: Date, start: string, end: string): boolean {
  const s = parseHM(start)
  const e = parseHM(end)
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes()
  const sMin = s.h * 60 + s.m
  const eMin = e.h * 60 + e.m
  if (sMin === eMin) return false
  if (sMin < eMin) return minutes >= sMin && minutes < eMin
  return minutes >= sMin || minutes < eMin // overnight window
}

function nextQuietEnd(date: Date, end: string): Date {
  const e = parseHM(end)
  const next = new Date(date)
  next.setUTCHours(e.h, e.m, 0, 0)
  if (next <= date) next.setUTCDate(next.getUTCDate() + 1)
  return next
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = (await req.json()) as EnqueuePayload
    const isSelfWelcome = body.type === 'welcome' && Boolean(body.userId) && !body.orderId && body.stepIndex === 0
    let access: { kind?: string; userId?: string; isAdmin?: boolean } | Response
    if (isSelfWelcome) {
      access = await requireAuthenticated(req)
      if (!(access instanceof Response) && access.userId !== body.userId) {
        access = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
      }
    } else {
      access = await requireInternalOrAdmin(req)
    }
    if (access instanceof Response) return new Response(access.body, { status: access.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { type, orderId, userId, stepIndex = 0, batchSize = 1, batchIndex = 0, immediate = false } = body

    // Load throttling + automations
    const { data: settingsRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'integrations')
      .maybeSingle()

    const config = (settingsRow?.value as any) || {}
    const throttling = config.throttling || { enabled: false }
    const automations = config.automations || {}
    const eventConfig = automations[type]

    let channel = body.channel || 'whatsapp'
    let stepDelayHours = 0
    if (eventConfig?.steps?.[stepIndex]) {
      channel = eventConfig.steps[stepIndex].channel || channel
      stepDelayHours = eventConfig.steps[stepIndex].delay_hours || 0
    }

    // Compute scheduled_for
    let scheduled = new Date(Date.now() + stepDelayHours * 3600 * 1000)

    if (throttling.enabled && !immediate) {
      // Determine per-channel pacing using the "primary" channel
      const primary = ['whatsapp', 'whatsapp_push', 'both', 'all'].includes(channel)
        ? 'whatsapp'
        : ['email', 'email_push'].includes(channel)
        ? 'email'
        : 'push'
      const ch = throttling[primary] || { min_delay_seconds: 0, jitter_seconds: 0 }
      const spreadMs = (throttling.spread_window_minutes || 0) * 60 * 1000

      // Distribute across batch
      const slot = batchSize > 1 ? (spreadMs * batchIndex) / batchSize : 0
      const jitter = Math.floor(Math.random() * (ch.jitter_seconds || 0) * 1000)
      const minDelay = (ch.min_delay_seconds || 0) * 1000
      scheduled = new Date(scheduled.getTime() + slot + jitter + minDelay)

      // Quiet hours (skip for transactional events)
      const isTransactional = ['order_confirmed', 'order_shipped', 'order_delivered'].includes(type)
      if (!isTransactional && throttling.quiet_hours?.enabled) {
        if (inQuietHours(scheduled, throttling.quiet_hours.start, throttling.quiet_hours.end)) {
          scheduled = nextQuietEnd(scheduled, throttling.quiet_hours.end)
        }
      }
    }

    const { data, error } = await supabase
      .from('notification_queue')
      .insert({
        type,
        order_id: orderId || null,
        user_id: userId || null,
        step_index: stepIndex,
        channel,
        scheduled_for: scheduled.toISOString(),
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) throw error

    // Wake the queue immediately for notifications that are already due.
    // Future steps stay queued and are picked up by the next scheduled run.
    if (scheduled.getTime() <= Date.now() + 60_000) {
      try {
        const processResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-notification-queue`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({}),
          },
        )
        if (!processResponse.ok) {
          console.error('Unable to wake notification queue:', processResponse.status, await processResponse.text())
        }
      } catch (processError) {
        console.error('Unable to wake notification queue:', processError)
      }
    }

    return new Response(
      JSON.stringify({ ok: true, id: data.id, scheduled_for: scheduled.toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('enqueue-notification error', e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})