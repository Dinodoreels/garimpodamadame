import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    console.log('Webhook received:', JSON.stringify(body, null, 2))

    const { type, data } = body

    // Handle payment notification
    if (type === 'payment') {
      const paymentId = data?.id
      if (!paymentId) {
        console.log('No payment ID in webhook')
        return new Response('OK', { headers: corsHeaders })
      }

      // Fetch payment details from Mercado Pago
      const mercadoPagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
      if (!mercadoPagoToken) {
        throw new Error('Token do Mercado Pago não configurado')
      }

      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mercadoPagoToken}`,
        },
      })

      if (!paymentResponse.ok) {
        console.error('Error fetching payment:', await paymentResponse.text())
        return new Response('OK', { headers: corsHeaders })
      }

      const payment = await paymentResponse.json()
      console.log('Payment details:', JSON.stringify(payment, null, 2))

      const orderId = payment.external_reference
      if (!orderId) {
        console.log('No external_reference (order_id) in payment')
        return new Response('OK', { headers: corsHeaders })
      }

      // Map Mercado Pago status to our status
      let orderStatus = 'pending'
      let paidAt = null
      switch (payment.status) {
        case 'approved':
          orderStatus = 'paid'
          paidAt = new Date().toISOString()
          break
        case 'pending':
        case 'in_process':
          orderStatus = 'pending'
          break
        case 'rejected':
          orderStatus = 'payment_failed'
          break
        case 'cancelled':
          orderStatus = 'cancelled'
          break
        case 'refunded':
          orderStatus = 'refunded'
          break
        default:
          orderStatus = 'pending'
      }

      // Get payment method and rejection reason
      const paymentMethod = payment.payment_method_id || payment.payment_type_id || null
      const rejectionReason = payment.status_detail || null

      // Update order status
      const updateData: Record<string, any> = { 
        status: orderStatus,
        updated_at: new Date().toISOString(),
        payment_method: paymentMethod,
      }
      
      if (paidAt) {
        updateData.paid_at = paidAt
      }
      
      if (orderStatus === 'payment_failed' && rejectionReason) {
        updateData.last_payment_error = rejectionReason
        updateData.payment_attempts = (await supabase
          .from('orders')
          .select('payment_attempts')
          .eq('id', orderId)
          .single()
        ).data?.payment_attempts || 0 + 1
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (updateError) {
        console.error('Error updating order:', updateError)
      } else {
        console.log(`Order ${orderId} updated to status: ${orderStatus}`)
        
        // Add to status history
        await supabase
          .from('order_status_history')
          .insert({
            order_id: orderId,
            status: orderStatus,
            note: orderStatus === 'payment_failed' 
              ? `Pagamento rejeitado: ${rejectionReason}` 
              : `Pagamento ${payment.status}`,
          })

        // Trigger notification for confirmed payment
        if (orderStatus === 'paid') {
          try {
            const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/enqueue-notification`
            await fetch(notifyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ type: 'order_confirmed', orderId }),
            })
            console.log('Notification triggered for order_confirmed')
          } catch (notifyErr) {
            console.error('Failed to trigger notification:', notifyErr)
          }
        }
      }
    }

    return new Response('OK', { headers: corsHeaders })

  } catch (error) {
    console.error('Error in webhook:', error)
    // Always return 200 to prevent retries
    return new Response('OK', { headers: corsHeaders })
  }
})
