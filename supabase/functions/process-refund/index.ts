import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'
import { finalizeConfirmedRefund } from '../_shared/refund-workflow.ts'

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }
const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), refund_id: z.string().uuid() }),
  z.object({ action: z.literal('reject'), refund_id: z.string().uuid(), admin_notes: z.string().max(1000).optional() }),
])

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  let processingRefundId: string | null = null
  let adminClient: ReturnType<typeof createClient> | null = null
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return response({ ok: false, error: 'Não autorizado.' }, 401)
    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anonKey || !serviceKey) return response({ ok: false, error: 'Serviço indisponível.' }, 500)

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const admin = createClient(url, serviceKey)
    adminClient = admin
    const { data: userData } = await caller.auth.getUser(authHeader.slice(7))
    if (!userData.user) return response({ ok: false, error: 'Sessão inválida.' }, 401)
    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
    if (!role) return response({ ok: false, error: 'Apenas administradores podem autorizar reembolsos.' }, 403)

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return response({ ok: false, error: 'Solicitação inválida.' }, 400)

    const { data: refund } = await admin.from('refunds').select('*, orders(*)').eq('id', parsed.data.refund_id).maybeSingle()
    if (!refund) return response({ ok: false, error: 'Reembolso não encontrado.' }, 404)

    if (parsed.data.action === 'reject') {
      if (refund.status !== 'pending') return response({ ok: false, error: 'Somente solicitações pendentes podem ser rejeitadas.' }, 409)
      await admin.from('refunds').update({
        status: 'rejected', admin_notes: parsed.data.admin_notes ?? null,
        processed_by: userData.user.id, processed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', refund.id)
      return response({ ok: true, status: 'rejected' })
    }

    const order = refund.orders
    if (!order?.mercadopago_payment_id) return response({ ok: false, error: 'Este pedido não possui pagamento confirmado no Mercado Pago.' }, 409)
    if (!['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) return response({ ok: false, error: 'O pedido não está em uma situação que permita reembolso.' }, 409)

    const amount = Number(refund.amount)
    const paidAmount = Number(order.paid_amount ?? order.total)
    const { data: confirmed } = await admin.from('refunds').select('confirmed_amount').eq('order_id', order.id).neq('id', refund.id).in('status', ['completed', 'partial'])
    const alreadyRefunded = (confirmed ?? []).reduce((sum: number, item: any) => sum + Number(item.confirmed_amount ?? 0), 0)
    const available = Math.max(0, paidAmount - alreadyRefunded)
    if (!Number.isFinite(amount) || amount <= 0 || amount > available + 0.01) {
      return response({ ok: false, error: `O valor deve ser maior que zero e não pode ultrapassar ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(available)}.` }, 409)
    }

    const { data: claimed, error: claimError } = await admin.rpc('claim_refund_processing', { p_refund_id: refund.id, p_actor_id: userData.user.id })
    if (claimError) throw claimError
    if (['completed', 'partial'].includes(claimed.status)) return response({ ok: true, status: claimed.status, already_processed: true })
    if (claimed.status !== 'processing') return response({ ok: false, error: 'Este reembolso já está sendo tratado ou foi encerrado.' }, 409)
    processingRefundId = refund.id

    const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!token) throw new Error('A conta do Mercado Pago não está configurada.')
    const isFullRemaining = Math.abs(amount - available) <= 0.01
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(order.mercadopago_payment_id)}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': claimed.idempotency_key,
      },
      body: isFullRemaining ? '{}' : JSON.stringify({ amount: Number(amount.toFixed(2)) }),
    })
    const text = await mpResponse.text()
    let providerData: Record<string, any> = {}
    try { providerData = text ? JSON.parse(text) : {} } catch { providerData = { message: text } }
    if (!mpResponse.ok) {
      const message = String(providerData.message ?? providerData.error ?? `Mercado Pago recusou o estorno (${mpResponse.status}).`)
      await admin.from('refunds').update({ status: 'failed', provider_status: 'failed', last_error: message, workflow_results: { payment: { ok: false, status: mpResponse.status } }, updated_at: new Date().toISOString() }).eq('id', refund.id)
      return response({ ok: false, error: message }, 409)
    }

    if (!['approved', 'refunded'].includes(String(providerData.status ?? '').toLowerCase())) {
      await admin.from('refunds').update({ provider_refund_id: String(providerData.id ?? ''), provider_status: String(providerData.status ?? 'pending'), workflow_results: { payment: { ok: true, pending: true } }, updated_at: new Date().toISOString() }).eq('id', refund.id)
      return response({ ok: true, status: 'processing', message: 'O Mercado Pago recebeu o pedido de estorno e ainda está processando.' })
    }

    const workflow = await finalizeConfirmedRefund(admin, refund.id, providerData)
    processingRefundId = null
    const { data: completed } = await admin.from('refunds').select('status, confirmed_amount, refund_type, workflow_results').eq('id', refund.id).single()
    return response({ ok: true, ...completed, workflow })
  } catch (error) {
    console.error('process-refund failed:', error)
    const message = error instanceof Error ? error.message : 'Não foi possível processar o reembolso.'
    if (processingRefundId && adminClient) {
      await adminClient.from('refunds').update({ status: 'failed', last_error: message, updated_at: new Date().toISOString() }).eq('id', processingRefundId)
    }
    return response({ ok: false, error: message }, 500)
  }
})
