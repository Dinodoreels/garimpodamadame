import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { finalizeConfirmedRefund } from '../_shared/refund-workflow.ts'

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

      const { data: currentOrder } = await supabase.from('orders').select('status, total, payment_attempts, mercadopago_payment_id').eq('id', orderId).maybeSingle()
      if (!currentOrder) return new Response('OK', { headers: corsHeaders })
      const paidAmount = Number(payment.transaction_amount ?? 0)
      if (payment.status === 'approved' && Math.abs(paidAmount - Number(currentOrder.total)) > 0.01) {
        await supabase.from('orders').update({ last_payment_error: 'Valor recebido diferente do total do pedido', payment_status_detail: 'amount_mismatch', mercadopago_payment_id: String(paymentId) }).eq('id', orderId)
        return new Response('OK', { headers: corsHeaders })
      }
      const alreadyProcessed = currentOrder.mercadopago_payment_id === String(paymentId) && currentOrder.status === orderStatus
      const refundedAmount = Number(payment.transaction_amount_refunded ?? 0)
      if (alreadyProcessed && refundedAmount <= 0) return new Response('OK', { headers: corsHeaders })

      // Update order status
      const updateData: Record<string, any> = { 
        status: orderStatus,
        updated_at: new Date().toISOString(),
        payment_method: paymentMethod,
        mercadopago_payment_id: String(paymentId),
        payment_status_detail: rejectionReason,
        paid_amount: payment.status === 'approved' ? paidAmount : null,
      }
      
      if (paidAt) {
        updateData.paid_at = paidAt
      }
      
      if (orderStatus === 'payment_failed' && rejectionReason) {
        updateData.last_payment_error = rejectionReason
        updateData.payment_attempts = Number(currentOrder.payment_attempts || 0) + 1
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
          try {
            const fiscalUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/bling-fiscal-document`
            const fiscalResponse = await fetch(fiscalUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ order_id: orderId, action: 'auto' }),
            })
            const fiscalResult = await fiscalResponse.json().catch(() => ({}))
            if (!fiscalResponse.ok) console.log('Automatic invoice stayed pending:', fiscalResult?.error ?? fiscalResponse.status)
          } catch (fiscalErr) {
            console.error('Failed to start automatic invoice:', fiscalErr)
          }
        }

        if (refundedAmount > 0 || orderStatus === 'refunded') {
          const { data: knownRefunds } = await supabase
            .from('refunds')
            .select('*')
            .eq('order_id', orderId)
            .in('status', ['processing', 'completed', 'partial'])
            .order('created_at', { ascending: true })
          const confirmedTotal = (knownRefunds ?? [])
            .filter((item: any) => ['completed', 'partial'].includes(item.status))
            .reduce((sum: number, item: any) => sum + Number(item.confirmed_amount ?? 0), 0)
          const delta = Math.max(0, refundedAmount - confirmedTotal)
          let target = (knownRefunds ?? []).find((item: any) => item.status === 'processing')

          if (!target && delta > 0) {
            const { data: externalRefund } = await supabase.from('refunds').insert({
              order_id: orderId,
              user_id: null,
              amount: delta,
              reason: 'Reembolso identificado automaticamente pelo Mercado Pago',
              status: 'processing',
              provider_status: String(payment.status),
              idempotency_key: `mp-webhook-${paymentId}-${refundedAmount}`,
              processed_at: new Date().toISOString(),
            }).select('*').single()
            target = externalRefund
          }

          if (target) {
            try {
              const providerRefund = Array.isArray(payment.refunds) && payment.refunds.length
                ? payment.refunds[payment.refunds.length - 1]
                : { id: `payment-${paymentId}`, status: 'approved', amount: Number(target.amount) }
              await finalizeConfirmedRefund(supabase, target.id, providerRefund)
            } catch (refundError) {
              console.error('Failed to finalize refund workflow:', refundError)
            }
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
