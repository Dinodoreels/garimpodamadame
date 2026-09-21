import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.25.76'
import { callMelhorEnvio } from '../_shared/melhor-envio.ts'

const BodySchema = z.object({ order_id: z.string().uuid(), dry_run: z.boolean().optional().default(false) })
const headers = { ...corsHeaders, 'Content-Type': 'application/json' }
const clean = (value: unknown) => String(value ?? '').replace(/\D/g, '')
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!url || !serviceKey || !anonKey) return reply({ ok: false, error: 'Backend indisponível' }, 500)
    const authorization = req.headers.get('Authorization') ?? ''
    const token = authorization.replace(/^Bearer\s+/i, '')
    const internal = token === serviceKey
    const admin = createClient(url, serviceKey)
    let actorId: string | null = null
    if (!internal) {
      const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
      const { data: auth } = await caller.auth.getUser(token)
      if (!auth.user) return reply({ ok: false, error: 'Sessão inválida' }, 401)
      actorId = auth.user.id
      const { data: role } = await admin.from('user_roles').select('role').eq('user_id', actorId).eq('role', 'admin').maybeSingle()
      if (!role) return reply({ ok: false, error: 'Apenas administradores podem conferir etiquetas' }, 403)
    }
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return reply({ ok: false, error: 'Pedido inválido' }, 400)
    const { order_id, dry_run } = parsed.data

    const [{ data: order }, { data: configRow }, { data: settings }, { data: fiscal }] = await Promise.all([
      admin.from('orders').select('*, order_items(*)').eq('id', order_id).maybeSingle(),
      admin.from('site_settings').select('value').eq('key', 'integrations').maybeSingle(),
      admin.from('fiscal_settings').select('*').limit(1).maybeSingle(),
      admin.from('fiscal_documents').select('status, access_key').eq('order_id', order_id).maybeSingle(),
    ])
    if (!order) return reply({ ok: false, error: 'Pedido não encontrado' }, 404)
    if (order.source !== 'website') return reply({ ok: false, error: 'Pedido de marketplace não é alterado pelo Melhor Envio' }, 409)
    const integrations = (configRow?.value ?? {}) as Record<string, any>
    if (integrations?.shipping?.melhor_envio?.hybrid_enabled === false) return reply({ ok: false, error: 'Compra híbrida desativada nas configurações de frete' }, 409)

    const [{ data: profile }, authUser, { data: existing }] = await Promise.all([
      order.user_id ? admin.from('profiles').select('full_name, phone, cpf, birth_date').eq('id', order.user_id).maybeSingle() : Promise.resolve({ data: null }),
      order.user_id ? admin.auth.admin.getUserById(order.user_id) : Promise.resolve(null),
      admin.from('melhor_envio_shipments').select('*').eq('order_id', order_id).maybeSingle(),
    ])
    if (existing?.purchased_at) return reply({ ok: true, shipment: existing, already_processed: true })
    const address = (order.shipping_address ?? {}) as Record<string, string>
    const missingData: string[] = []
    if (order.status !== 'paid') missingData.push('pagamento confirmado')
    if (!order.user_id) missingData.push('cliente cadastrado')
    if (!profile?.full_name) missingData.push('nome completo')
    if (![11, 14].includes(clean(profile?.cpf).length)) missingData.push('CPF/CNPJ válido')
    if (clean(profile?.phone).length < 10) missingData.push('telefone válido')
    if (!authUser?.data?.user?.email) missingData.push('e-mail')
    if (!profile?.birth_date) missingData.push('data de nascimento')
    for (const [key, label] of Object.entries({ street: 'rua', number: 'número', neighborhood: 'bairro', city: 'cidade', state: 'estado', zip_code: 'CEP' })) if (!address[key]) missingData.push(label)
    if (clean(address.zip_code).length !== 8) missingData.push('CEP válido')
    if (!order.shipping_service_code || !order.shipping_service || !order.shipping_carrier) missingData.push('serviço de frete escolhido')
    if (!Array.isArray(order.order_items) || !order.order_items.length) missingData.push('itens do pedido')
    if (!settings?.legal_name || !clean(settings.tax_id) || !settings.street || !settings.number || !settings.neighborhood || !settings.city || !settings.state || clean(settings.zip_code).length !== 8) missingData.push('cadastro fiscal e endereço da loja')
    if (!integrations.contact_phone || !integrations.contact_email) missingData.push('telefone e e-mail da loja')

    const productIds = [...new Set((order.order_items ?? []).map((item: any) => item.product_id).filter(Boolean))]
    const { data: products } = productIds.length ? await admin.from('products').select('id, weight_grams, length_cm, width_cm, height_cm').in('id', productIds) : { data: [] }
    const productMap = new Map((products ?? []).map((product: any) => [product.id, product]))
    let weight = 0, height = 0, width = 0, length = 0
    for (const item of order.order_items ?? []) {
      const product: any = productMap.get(item.product_id)
      if (!product?.weight_grams || !product.length_cm || !product.width_cm || !product.height_cm) missingData.push(`peso e dimensões de ${item.product_title}`)
      weight += Number(product?.weight_grams || 0) * Number(item.quantity)
      height += Number(product?.height_cm || 0) * Number(item.quantity)
      width = Math.max(width, Number(product?.width_cm || 0))
      length = Math.max(length, Number(product?.length_cm || 0))
    }
    const validationStatus = missingData.length ? 'awaiting_data' : fiscal?.status !== 'authorized' || !fiscal.access_key ? 'awaiting_invoice' : 'ready'
    const validationErrors = missingData.length ? [...new Set(missingData)] : validationStatus === 'awaiting_invoice' ? ['nota fiscal autorizada'] : []
    const shipmentRecord = {
      order_id, source: 'website', service_code: String(order.shipping_service_code || ''), service: order.shipping_service, carrier: order.shipping_carrier,
      status: existing?.status ?? 'draft', validation_status: validationStatus, validation_errors: validationErrors, validated_at: new Date().toISOString(),
      automation_mode: 'hybrid', package_data: { height, width, length, weight_grams: weight }, last_error: validationErrors.length ? `Falta preencher: ${validationErrors.join('; ')}` : null,
    }
    const { data: shipment, error: shipmentError } = await admin.from('melhor_envio_shipments').upsert(shipmentRecord, { onConflict: 'order_id' }).select().single()
    if (shipmentError || !shipment) throw shipmentError || new Error('Não foi possível registrar a conferência')
    await admin.from('melhor_envio_shipment_events').insert({ shipment_id: shipment.id, order_id, event_type: 'validation', status: validationStatus, message: validationErrors.length ? `Aguardando: ${validationErrors.join('; ')}` : 'Pedido completo e pronto para compra automática.', actor_id: actorId })
    if (validationStatus !== 'ready' || dry_run) return reply({ ok: validationStatus === 'ready', ready: validationStatus === 'ready', dry_run, shipment, pending: validationErrors })

    const { data: claimed } = await admin.rpc('claim_melhor_envio_shipment', { p_order_id: order_id })
    if (!claimed) return reply({ ok: true, processing: true, message: 'Este pedido já está sendo processado.' })
    try {
      const from = { name: settings.legal_name, phone: integrations.contact_phone, email: integrations.contact_email, document: clean(settings.tax_id), state_register: clean(settings.state_registration), address: settings.street, complement: settings.complement || '', number: settings.number, district: settings.neighborhood, city: settings.city, state_abbr: settings.state, country_id: 'BR', postal_code: clean(settings.zip_code) }
      const to = { name: address.recipient_name || profile.full_name, phone: profile.phone, email: authUser?.data?.user?.email, document: clean(profile.cpf), address: address.street, complement: address.complement || '', number: address.number, district: address.neighborhood, city: address.city, state_abbr: address.state, country_id: 'BR', postal_code: clean(address.zip_code) }
      let cartId = existing?.external_cart_id as string | null
      if (!cartId) {
        const cart = await callMelhorEnvio('/cart', 'POST', { service: Number(order.shipping_service_code), agency: null, from, to, products: order.order_items.map((item: any) => ({ name: item.product_title, quantity: item.quantity, unitary_value: Number(item.unit_price) })), volumes: [{ height: Math.max(2, height), width: Math.max(11, width), length: Math.max(16, length), weight: Math.max(0.3, weight / 1000) }], options: { insurance_value: Number(order.subtotal), receipt: false, own_hand: false, reverse: false, non_commercial: false, invoice: { key: fiscal.access_key } } })
        cartId = String(cart.id || '')
        if (!cartId) throw new Error('O Melhor Envio não retornou o código do carrinho.')
        await admin.from('melhor_envio_shipments').update({ status: 'cart', external_cart_id: cartId, sender_data: from, recipient_data: to, provider_payload: cart }).eq('id', shipment.id)
      }
      const purchase = await callMelhorEnvio('/shipment/checkout', 'POST', { orders: [cartId] })
      await admin.from('melhor_envio_shipments').update({ status: 'purchased', validation_status: 'purchased', purchased_at: new Date().toISOString(), provider_payload: purchase, last_error: null }).eq('id', shipment.id)
      await admin.from('melhor_envio_shipment_events').insert({ shipment_id: shipment.id, order_id, event_type: 'purchased', status: 'purchased', message: 'Etiqueta comprada automaticamente após todas as conferências.', response_data: purchase })
      const generated = await callMelhorEnvio('/shipment/generate', 'POST', { orders: [cartId] })
      const { data: completed } = await admin.from('melhor_envio_shipments').update({ status: 'label_generated', validation_status: 'label_ready', label_generated_at: new Date().toISOString(), provider_payload: generated, last_error: null }).eq('id', shipment.id).select().single()
      await admin.from('melhor_envio_shipment_events').insert({ shipment_id: shipment.id, order_id, event_type: 'label_generated', status: 'label_generated', message: 'Etiqueta oficial gerada automaticamente.', response_data: generated })
      return reply({ ok: true, shipment: completed })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao comprar a etiqueta'
      await admin.from('melhor_envio_shipments').update({ validation_status: 'error', status: 'error', last_error: message, processing_started_at: null }).eq('id', shipment.id)
      await admin.from('melhor_envio_shipment_events').insert({ shipment_id: shipment.id, order_id, event_type: 'error', status: 'error', message })
      return reply({ ok: false, error: message, review_required: true }, 409)
    }
  } catch (error) {
    return reply({ ok: false, error: error instanceof Error ? error.message : 'Erro inesperado' }, 500)
  }
})