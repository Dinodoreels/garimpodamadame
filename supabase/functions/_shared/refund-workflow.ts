import { applyOrderStock } from './order-stock.ts'
import { callMelhorEnvio } from './melhor-envio.ts'
import { sendTemplateEmail } from './transactional-email-templates/send-email.ts'
import { markRefundedOrderInBling } from './bling-orders.ts'

type AdminClient = any

export async function sendRefundApprovedEmail(admin: AdminClient, refundId: string) {
  const { data: refund, error: refundError } = await admin.from('refunds').select('*').eq('id', refundId).maybeSingle()
  if (refundError) throw refundError
  if (!refund) throw new Error('Reembolso não encontrado.')
  const { data: order, error: orderError } = await admin.from('orders').select('*').eq('id', refund.order_id).maybeSingle()
  if (orderError) throw orderError
  if (!order) throw new Error('Pedido não encontrado.')
  const guest = (order.guest_info ?? {}) as Record<string, string>
  let customerEmail = guest.email ?? ''
  let customerName = guest.name ?? 'Cliente'
  if (order.user_id) {
    const [{ data: authUser }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(order.user_id),
      admin.from('profiles').select('full_name').eq('id', order.user_id).maybeSingle(),
    ])
    customerEmail = authUser?.user?.email ?? customerEmail
    customerName = profile?.full_name ?? customerName
  }
  if (!customerEmail) return { ok: false, skipped: true, reason: 'email_missing' }
  const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(refund.amount))
  const paidAmount = Number(order.paid_amount ?? order.total)
  return sendTemplateEmail('refund-approved', customerEmail, {
    idempotencyKey: `refund-approved-${refund.id}`,
    templateData: { customerName, orderNumber: order.order_number, amount, refundType: Number(refund.amount) >= paidAmount - 0.01 ? 'total' : 'parcial' },
  })
}

export async function finalizeConfirmedRefund(
  admin: AdminClient,
  refundId: string,
  providerRefund: Record<string, any>,
) {
  const { data: refund, error: refundError } = await admin
    .from('refunds')
    .select('*')
    .eq('id', refundId)
    .maybeSingle()
  if (refundError) throw refundError
  if (!refund) throw new Error('Reembolso não encontrado.')
  if (['completed', 'partial'].includes(refund.status)) return refund.workflow_results ?? {}

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('*')
    .eq('id', refund.order_id)
    .maybeSingle()
  if (orderError) throw orderError
  if (!order) throw new Error('Pedido não encontrado.')

  const confirmedAmount = Number(providerRefund.amount ?? refund.amount)
  const paidAmount = Number(order.paid_amount ?? order.total)
  const { data: otherRefunds } = await admin
    .from('refunds')
    .select('confirmed_amount')
    .eq('order_id', order.id)
    .neq('id', refund.id)
    .in('status', ['completed', 'partial'])
  const previouslyRefunded = (otherRefunds ?? []).reduce(
    (sum: number, item: any) => sum + Number(item.confirmed_amount ?? 0),
    0,
  )
  const cumulativeRefunded = previouslyRefunded + confirmedAmount
  const isFullRefund = cumulativeRefunded >= paidAmount - 0.01
  const results: Record<string, any> = {
    ...((refund.workflow_results ?? {}) as Record<string, any>),
    payment: { ok: true, provider_status: providerRefund.status ?? 'approved' },
    stock: { ok: false, skipped: !isFullRefund },
    bling: { ok: false, skipped: !isFullRefund },
    shipping: { ok: false, skipped: !isFullRefund },
    email: { ok: false },
  }

  if (isFullRefund) {
    await admin.from('orders').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', order.id)
    try {
      results.stock = await applyOrderStock(admin, order.id, `mercadopago_refund:${refund.id}`)
    } catch (error) {
      results.stock = { ok: false, error: error instanceof Error ? error.message : String(error) }
    }

    try {
      results.bling = await markRefundedOrderInBling(order.id)
    } catch (error) {
      results.bling = { ok: false, error: error instanceof Error ? error.message : String(error) }
    }

    if (order.source === 'website') {
      const { data: shipment } = await admin
        .from('melhor_envio_shipments')
        .select('*')
        .eq('order_id', order.id)
        .maybeSingle()
      if (shipment && !['cancelled', 'delivered', 'posted', 'in_transit'].includes(shipment.status)) {
        try {
          const cancelled = await callMelhorEnvio('/shipment/cancel', 'POST', {
            order: {
              id: shipment.external_cart_id,
              reason_id: 2,
              description: `Pedido ${order.order_number} reembolsado`,
            },
          })
          const now = new Date().toISOString()
          await admin.from('melhor_envio_shipments').update({
            status: 'cancelled',
            cancelled_at: now,
            provider_payload: cancelled,
            last_error: null,
          }).eq('id', shipment.id)
          await admin.from('melhor_envio_shipment_events').insert({
            shipment_id: shipment.id,
            order_id: order.id,
            event_type: 'cancelled_by_refund',
            status: 'cancelled',
            message: 'Envio cancelado após confirmação do reembolso.',
            actor_id: refund.processed_by,
            response_data: cancelled,
          })
          results.shipping = { ok: true, status: 'cancelled' }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          await admin.from('melhor_envio_shipments').update({ last_error: message }).eq('id', shipment.id)
          results.shipping = { ok: false, error: message }
        }
      } else {
        results.shipping = { ok: true, skipped: true, reason: shipment ? 'already_posted_or_closed' : 'not_prepared' }
      }
    }
  }

  try {
    const guest = (order.guest_info ?? {}) as Record<string, string>
    let customerEmail = guest.email ?? ''
    let customerName = guest.name ?? 'Cliente'
    if (order.user_id) {
      const [{ data: authUser }, { data: profile }] = await Promise.all([
        admin.auth.admin.getUserById(order.user_id),
        admin.from('profiles').select('full_name').eq('id', order.user_id).maybeSingle(),
      ])
      customerEmail = authUser?.user?.email ?? customerEmail
      customerName = profile?.full_name ?? customerName
    }
    if (customerEmail) {
      const emailResult = await sendTemplateEmail('refund-confirmation', customerEmail, {
        idempotencyKey: `refund-confirmation-${refund.id}`,
        templateData: {
          customerName,
          orderNumber: order.order_number,
          amount: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(confirmedAmount),
          refundType: isFullRefund ? 'total' : 'parcial',
        },
      })
      results.email = emailResult
    } else {
      results.email = { ok: false, skipped: true, reason: 'email_missing' }
    }
  } catch (error) {
    results.email = { ok: false, error: error instanceof Error ? error.message : String(error) }
  }

  const finalStatus = isFullRefund ? 'completed' : 'partial'
  await admin.from('refunds').update({
    status: finalStatus,
    provider_refund_id: String(providerRefund.id ?? refund.provider_refund_id ?? ''),
    provider_status: String(providerRefund.status ?? 'approved'),
    confirmed_amount: confirmedAmount,
    refund_type: isFullRefund ? 'full' : 'partial',
    workflow_results: results,
    last_error: null,
    processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', refund.id)

  await admin.from('order_status_history').insert({
    order_id: order.id,
    status: isFullRefund ? 'refunded' : order.status,
    changed_by: refund.processed_by,
    note: `Reembolso ${isFullRefund ? 'total' : 'parcial'} confirmado pelo Mercado Pago: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(confirmedAmount)}.`,
  })

  return results
}
