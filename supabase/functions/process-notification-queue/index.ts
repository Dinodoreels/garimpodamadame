import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function primaryChannel(channel: string): 'whatsapp' | 'email' | 'push' {
  if (['whatsapp', 'whatsapp_push', 'both', 'all'].includes(channel)) return 'whatsapp'
  if (['email', 'email_push'].includes(channel)) return 'email'
  return 'push'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: settingsRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'integrations')
      .maybeSingle()

    const config = (settingsRow?.value as any) || {}
    const t = config.throttling || {}
    const globalCap = t.global_max_per_minute ?? 30
    const caps = {
      whatsapp: t.whatsapp?.max_per_minute ?? 10,
      email: t.email?.max_per_minute ?? 60,
      push: t.push?.max_per_minute ?? 120,
    }

    const { data: pending, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(globalCap)

    if (error) throw error

    const sentByCh = { whatsapp: 0, email: 0, push: 0 }
    const results: any[] = []

    for (const item of pending || []) {
      const ch = primaryChannel(item.channel)
      if (sentByCh[ch] >= caps[ch]) continue
      sentByCh[ch]++

      try {
        const res = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              type: item.type,
              orderId: item.order_id,
              userId: item.user_id,
              stepIndex: item.step_index,
            }),
          },
        )

        if (res.ok) {
          await supabase
            .from('notification_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString(), attempts: item.attempts + 1 })
            .eq('id', item.id)
          results.push({ id: item.id, status: 'sent' })
        } else {
          const text = await res.text()
          const attempts = item.attempts + 1
          if (attempts < 3) {
            const retryAt = new Date(Date.now() + attempts * 5 * 60 * 1000).toISOString()
            await supabase
              .from('notification_queue')
              .update({ attempts, last_error: text.slice(0, 500), scheduled_for: retryAt })
              .eq('id', item.id)
          } else {
            await supabase
              .from('notification_queue')
              .update({ status: 'failed', attempts, last_error: text.slice(0, 500) })
              .eq('id', item.id)
          }
          results.push({ id: item.id, status: 'retry/fail', http: res.status })
        }
      } catch (e) {
        const attempts = item.attempts + 1
        await supabase
          .from('notification_queue')
          .update({
            attempts,
            last_error: String(e).slice(0, 500),
            status: attempts >= 3 ? 'failed' : 'pending',
            scheduled_for:
              attempts < 3
                ? new Date(Date.now() + attempts * 5 * 60 * 1000).toISOString()
                : item.scheduled_for,
          })
          .eq('id', item.id)
        results.push({ id: item.id, status: 'error' })
      }
    }

    try {
      const campaignResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-campaign-dispatch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({}),
        },
      )
      if (!campaignResponse.ok) {
        console.error('WhatsApp campaign processing failed:', campaignResponse.status, await campaignResponse.text())
      }
    } catch (campaignError) {
      console.error('WhatsApp campaign processing error:', campaignError)
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('process-notification-queue error', e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})