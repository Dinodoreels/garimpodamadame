import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'
import { adminClient, resolveAdminUser, jsonResponse } from '../_shared/operator.ts'

const BodySchema = z.object({
  order_id: z.string().uuid(),
  action: z.enum(['start_separation', 'confirm_packed', 'confirm_posted']),
  tracking_code: z.string().trim().min(3).max(120).optional(),
  tracking_url: z.string().url().max(1000).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional(),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Método não permitido.' }, 405)
  const db = adminClient()
  const user = await resolveAdminUser(req, db)
  if (!user || !user.roles.some(role => ['admin', 'gestor_cd', 'estoque', 'commerce'].includes(role))) {
    return jsonResponse({ ok: false, error: 'Sem permissão para esta etapa.' }, 403)
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonResponse({ ok: false, error: 'Dados da etapa inválidos.' }, 400)
  const { order_id, action, tracking_code, tracking_url, notes } = parsed.data

  try {
    const { data: order, error } = await db.from('orders').select('id,status,paid_at,shipping_address_id,shipping_address,fulfillment_status,tracking_code,source,order_items(id)').eq('id', order_id).maybeSingle()
    if (error || !order) return jsonResponse({ ok: false, error: 'Pedido não encontrado.' }, 404)
    if (!order.paid_at || !['paid', 'processing'].includes(order.status)) return jsonResponse({ ok: false, error: 'Somente pedidos pagos podem avançar na expedição.' }, 409)
    const address = order.shipping_address as Record<string, unknown> | null
    const hasAddress = Boolean(order.shipping_address_id) || Boolean(address?.street && address?.city && address?.zip_code)
    if (!hasAddress) return jsonResponse({ ok: false, error: 'Revise e confirme o endereço antes da separação.' }, 409)
    if (!order.order_items?.length) return jsonResponse({ ok: false, error: 'O pedido não possui itens para separar.' }, 409)

    const now = new Date().toISOString()
    if (action === 'start_separation') {
      if (!['awaiting_separation', 'separating'].includes(order.fulfillment_status)) return jsonResponse({ ok: false, error: 'Este pedido já avançou da separação.' }, 409)
      if (order.fulfillment_status === 'separating') return jsonResponse({ ok: true, fulfillment_status: 'separating', unchanged: true })
      await updateOrder(db, order_id, { fulfillment_status: 'separating', separation_started_at: now, fulfillment_updated_by: user.id })
      await history(db, order_id, 'separating', 'Separação iniciada', user.id, notes)
      return jsonResponse({ ok: true, fulfillment_status: 'separating' })
    }

    if (action === 'confirm_packed') {
      if (order.fulfillment_status === 'packed') return jsonResponse({ ok: true, fulfillment_status: 'packed', unchanged: true })
      if (order.fulfillment_status !== 'separating') return jsonResponse({ ok: false, error: 'Inicie e confira a separação antes de embalar.' }, 409)
      await updateOrder(db, order_id, { fulfillment_status: 'packed', separated_at: now, packed_at: now, status: 'processing', fulfillment_updated_by: user.id })
      await history(db, order_id, 'packed', 'Itens conferidos e pedido embalado', user.id, notes)
      return jsonResponse({ ok: true, fulfillment_status: 'packed' })
    }

    if (order.fulfillment_status === 'posted') return jsonResponse({ ok: true, fulfillment_status: 'posted', unchanged: true })
    if (order.fulfillment_status !== 'packed') return jsonResponse({ ok: false, error: 'Confirme a embalagem antes de postar.' }, 409)
    const code = tracking_code || order.tracking_code
    if (!code) return jsonResponse({ ok: false, error: 'Informe o código de rastreio antes de postar.' }, 400)
    const [{ data: shipment }, { data: marketplaceLabel }] = await Promise.all([
      db.from('melhor_envio_shipments').select('label_url,status').eq('order_id', order_id).maybeSingle(),
      db.from('marketplace_shipping_labels').select('status,label_url,storage_path').eq('order_id', order_id).maybeSingle(),
    ])
    if (!shipment?.label_url && marketplaceLabel?.status !== 'ready' && !marketplaceLabel?.label_url && !marketplaceLabel?.storage_path) {
      return jsonResponse({ ok: false, error: 'A etiqueta oficial precisa estar pronta antes da postagem.' }, 409)
    }
    await updateOrder(db, order_id, { fulfillment_status: 'posted', posted_at: now, status: 'shipped', shipped_at: now, tracking_code: code, tracking_url: tracking_url || null, fulfillment_updated_by: user.id })
    await history(db, order_id, 'shipped', 'Pedido postado com rastreio confirmado', user.id, notes)
    return jsonResponse({ ok: true, fulfillment_status: 'posted', status: 'shipped' })
  } catch (error) {
    console.error('order-fulfillment', error)
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : 'Falha ao avançar a expedição.' }, 400)
  }
})

async function updateOrder(db: ReturnType<typeof adminClient>, orderId: string, values: Record<string, unknown>) {
  const { error } = await db.from('orders').update({ ...values, updated_at: new Date().toISOString() }).eq('id', orderId)
  if (error) throw error
}

async function history(db: ReturnType<typeof adminClient>, orderId: string, status: string, label: string, actor: string, notes?: string) {
  const { error } = await db.from('order_status_history').insert({ order_id: orderId, status, changed_by: actor, note: notes ? `${label}: ${notes}` : label })
  if (error) throw error
}
