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

    // Get configurable expiration time (default 30 minutes)
    const { data: setting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'order_expiration_minutes')
      .maybeSingle()

    const expirationMinutes = setting?.value ? Number(setting.value) : 30

    // Find expired pending orders
    const cutoff = new Date(Date.now() - expirationMinutes * 60 * 1000).toISOString()

    const { data: expiredOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('status', 'pending')
      .lt('created_at', cutoff)

    if (fetchError) {
      console.error('Error fetching expired orders:', fetchError)
      throw fetchError
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('No expired orders found')
      return new Response(JSON.stringify({ cancelled: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orderIds = expiredOrders.map((o) => o.id)

    // Cancel all expired orders
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .in('id', orderIds)

    if (updateError) {
      console.error('Error cancelling orders:', updateError)
      throw updateError
    }

    // Insert status history for each cancelled order
    const historyRows = expiredOrders.map((o) => ({
      order_id: o.id,
      status: 'cancelled',
      note: 'Cancelado automaticamente por falta de pagamento',
    }))

    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert(historyRows)

    if (historyError) {
      console.error('Error inserting status history:', historyError)
      // Non-blocking — orders are already cancelled
    }

    console.log(`Cancelled ${orderIds.length} expired orders:`, expiredOrders.map((o) => o.order_number))

    return new Response(JSON.stringify({ cancelled: orderIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in cancel-expired-orders:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
