import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

type Action = 'test' | 'prepare' | 'purchase' | 'generate' | 'print' | 'sync' | 'cancel'

const API_URL = 'https://melhorenvio.com.br/api/v2/me'
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

function clean(value: unknown) {
  return String(value ?? '').replace(/\D/g, '')
}

function providerError(status: number, body: string) {
  let message = 'O Melhor Envio recusou a operação.'
  if (status === 401) message = 'A credencial do Melhor Envio está inválida ou vencida.'
  if (status === 402) message = 'Saldo insuficiente no Melhor Envio.'
  if (status === 422) message = 'Revise endereço, documento, peso e dimensões do pacote.'
  return new Error(`${message} [${status}] ${body.slice(0, 500)}`)
}

async function callProvider(token: string, path: string, method = 'GET', body?: unknown) {
  const result = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Garimpo da Madame (contato@ogarimpodigital.com.br)',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await result.text()
  if (!result.ok) throw providerError(result.status, text)
  return text ? JSON.parse(text) : {}
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return response({ ok: false, error: 'Não autorizado' }, 401)

    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const melhorEnvioToken = Deno.env.get('MELHOR_ENVIO_TOKEN')
    if (!url || !anonKey || !serviceKey) return response({ ok: false, error: 'Backend indisponível' }, 500)

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const admin = createClient(url, serviceKey)
    const token = authHeader.slice(7)
    const { data: userData } = await caller.auth.getUser(token)
    if (!userData.user) return response({ ok: false, error: 'Sessão inválida' }, 401)

    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
    if (!role) return response({ ok: false, error: 'Apenas administradores podem operar o Melhor Envio' }, 403)

    const input = await req.json().catch(() => ({})) as { action?: Action; order_id?: string }
    const action = input.action
    if (!action) return response({ ok: false, error: 'Ação obrigatória' }, 400)
    if (!melhorEnvioToken) return response({ ok: false, error: 'Credencial do Melhor Envio ainda não configurada' }, 409)

    if (action === 'test') {
      const account = await callProvider(melhorEnvioToken, '/account')
      return response({ ok: true, account: { firstname: account.firstname, lastname: account.lastname, email: account.email } })
    }

    if (!input.order_id) return response({ ok: false, error: 'Pedido obrigatório' }, 400)
    const { data: order } = await admin.from('orders').select('*, order_items(*)').eq('id', input.order_id).maybeSingle()
    if (!order) return response({ ok: false, error: 'Pedido não encontrado' }, 404)
    if ((order.source || 'website') !== 'website') return response({ ok: false, error: 'O Melhor Envio é exclusivo para vendas deste site' }, 409)

    const { data: existing } = await admin.from('melhor_envio_shipments').select('*').eq('order_id', order.id).maybeSingle()
    const addEvent = async (shipmentId: string, type: string, status: string, message: string, providerData: unknown = {}) => {
      await admin.from('melhor_envio_shipment_events').insert({
        shipment_id: shipmentId, order_id: order.id, event_type: type, status, message,
        actor_id: userData.user.id, response_data: providerData as Record<string, unknown>,
      })
    }

    if (action === 'prepare') {
      if (existing?.external_cart_id) return response({ ok: true, shipment: existing })
      const address = order.shipping_address as Record<string, string> | null
      const { data: settings } = await admin.from('fiscal_settings').select('*').limit(1).maybeSingle()
      const { data: integrationRow } = await admin.from('site_settings').select('value').eq('key', 'integrations').maybeSingle()
      const integrations = (integrationRow?.value ?? {}) as Record<string, any>
      const { data: profile } = order.user_id
        ? await admin.from('profiles').select('full_name, phone, cpf').eq('id', order.user_id).maybeSingle()
        : { data: null }
      const authUser = order.user_id ? await admin.auth.admin.getUserById(order.user_id) : null
      const guest = (order.guest_info ?? {}) as Record<string, string>
      const recipientName = address?.recipient_name || profile?.full_name || guest.name
      const recipientPhone = profile?.phone || guest.phone
      const recipientEmail = authUser?.data?.user?.email || guest.email
      const recipientDocument = clean(profile?.cpf || guest.cpf)
      const senderPhone = integrations.contact_phone
      const senderEmail = integrations.contact_email
      const missing: string[] = []
      if (!settings?.legal_name || !clean(settings.tax_id) || !settings.street || !settings.number || !settings.neighborhood || !settings.city || !settings.state || clean(settings.zip_code).length !== 8) missing.push('dados fiscais e endereço do remetente')
      if (!senderPhone || !senderEmail) missing.push('telefone e e-mail da loja')
      if (!recipientName || !recipientPhone || !recipientEmail || ![11, 14].includes(recipientDocument.length)) missing.push('nome, telefone, e-mail e CPF/CNPJ do destinatário')
      if (!address?.street || !address.number || !address.neighborhood || !address.city || !address.state || clean(address.zip_code).length !== 8) missing.push('endereço completo do destinatário')
      if (!order.shipping_service_code) missing.push('serviço de frete escolhido no checkout')

      const productIds = [...new Set((order.order_items ?? []).map((item: any) => item.product_id).filter(Boolean))]
      const { data: products } = productIds.length
        ? await admin.from('products').select('id, weight_grams, length_cm, width_cm, height_cm').in('id', productIds)
        : { data: [] }
      const productMap = new Map((products ?? []).map((product: any) => [product.id, product]))
      let weight = 0, height = 0, width = 0, length = 0
      for (const item of order.order_items ?? []) {
        const product: any = productMap.get(item.product_id)
        if (!product?.weight_grams || !product.length_cm || !product.width_cm || !product.height_cm) missing.push(`peso e dimensões de ${item.product_title}`)
        weight += Number(product?.weight_grams || 0) * item.quantity
        height += Number(product?.height_cm || 0) * item.quantity
        width = Math.max(width, Number(product?.width_cm || 0))
        length = Math.max(length, Number(product?.length_cm || 0))
      }
      if (missing.length) return response({ ok: false, error: `Falta preencher: ${[...new Set(missing)].join('; ')}` }, 409)

      const payload = {
        service: Number(order.shipping_service_code),
        agency: null,
        from: { name: settings.legal_name, phone: senderPhone, email: senderEmail, document: clean(settings.tax_id), state_register: clean(settings.state_registration), address: settings.street, complement: settings.complement || '', number: settings.number, district: settings.neighborhood, city: settings.city, state_abbr: settings.state, country_id: 'BR', postal_code: clean(settings.zip_code) },
        to: { name: recipientName, phone: recipientPhone, email: recipientEmail, document: recipientDocument, address: address.street, complement: address.complement || '', number: address.number, district: address.neighborhood, city: address.city, state_abbr: address.state, country_id: 'BR', postal_code: clean(address.zip_code) },
        products: (order.order_items ?? []).map((item: any) => ({ name: item.product_title, quantity: item.quantity, unitary_value: Number(item.unit_price) })),
        volumes: [{ height: Math.max(2, height), width: Math.max(11, width), length: Math.max(16, length), weight: Math.max(0.3, weight / 1000) }],
        options: { insurance_value: Number(order.subtotal), receipt: false, own_hand: false, reverse: false, non_commercial: false },
      }
      const cart = await callProvider(melhorEnvioToken, '/cart', 'POST', payload)
      const cartId = String(cart.id || '')
      if (!cartId) throw new Error('O Melhor Envio não retornou o código do carrinho.')
      const shipmentData = {
        order_id: order.id, source: 'website', status: 'cart', service_code: String(order.shipping_service_code),
        service: order.shipping_service, carrier: order.shipping_carrier, external_cart_id: cartId,
        price: Number(cart.price || order.shipping_original_cost || order.shipping_cost), insurance_value: Number(order.subtotal),
        package_data: { height, width, length, weight_grams: weight }, sender_data: payload.from,
        recipient_data: payload.to, provider_payload: cart, created_by: userData.user.id, last_error: null,
      }
      const { data: shipment, error } = await admin.from('melhor_envio_shipments').upsert(shipmentData, { onConflict: 'order_id' }).select().single()
      if (error || !shipment) throw error || new Error('Não foi possível registrar o envio')
      await addEvent(shipment.id, 'prepared', 'cart', 'Envio adicionado ao carrinho do Melhor Envio.', cart)
      return response({ ok: true, shipment })
    }

    if (!existing) return response({ ok: false, error: 'Prepare o envio antes desta ação' }, 409)
    if (action === 'purchase') {
      if (existing.purchased_at) return response({ ok: true, shipment: existing })
      const purchase = await callProvider(melhorEnvioToken, '/shipment/checkout', 'POST', { orders: [existing.external_cart_id] })
      const now = new Date().toISOString()
      const { data: shipment } = await admin.from('melhor_envio_shipments').update({ status: 'purchased', purchased_at: now, provider_payload: purchase, last_error: null }).eq('id', existing.id).select().single()
      await addEvent(existing.id, 'purchased', 'purchased', 'Etiqueta comprada após confirmação administrativa.', purchase)
      return response({ ok: true, shipment })
    }
    if (action === 'generate') {
      if (!existing.purchased_at) return response({ ok: false, error: 'Compre a etiqueta antes de gerar' }, 409)
      const generated = await callProvider(melhorEnvioToken, '/shipment/generate', 'POST', { orders: [existing.external_cart_id] })
      const now = new Date().toISOString()
      const { data: shipment } = await admin.from('melhor_envio_shipments').update({ status: 'label_generated', label_generated_at: now, provider_payload: generated, last_error: null }).eq('id', existing.id).select().single()
      await addEvent(existing.id, 'label_generated', 'label_generated', 'Etiqueta enviada para geração.', generated)
      return response({ ok: true, shipment })
    }
    if (action === 'print') {
      if (!existing.label_generated_at) return response({ ok: false, error: 'Gere a etiqueta antes de imprimir' }, 409)
      const printed = await callProvider(melhorEnvioToken, '/shipment/print', 'POST', { mode: 'private', orders: [existing.external_cart_id] })
      const labelUrl = printed.url || printed.link || null
      await admin.from('melhor_envio_shipments').update({ label_url: labelUrl, label_format: 'pdf', provider_payload: printed }).eq('id', existing.id)
      await addEvent(existing.id, 'printed', existing.status, 'Link de impressão solicitado.', printed)
      return response({ ok: true, url: labelUrl })
    }
    if (action === 'cancel') {
      if (existing.status === 'cancelled') return response({ ok: true, shipment: existing })
      const cancelled = await callProvider(melhorEnvioToken, '/shipment/cancel', 'POST', { order: { id: existing.external_cart_id, reason_id: 2, description: 'Cancelado pelo administrador da loja' } })
      const { data: shipment } = await admin.from('melhor_envio_shipments').update({ status: 'cancelled', cancelled_at: new Date().toISOString(), provider_payload: cancelled }).eq('id', existing.id).select().single()
      await addEvent(existing.id, 'cancelled', 'cancelled', 'Envio cancelado no Melhor Envio.', cancelled)
      return response({ ok: true, shipment })
    }

    const tracked = await callProvider(melhorEnvioToken, '/shipment/tracking', 'POST', { orders: [existing.external_cart_id] })
    const item = tracked[existing.external_cart_id] || Object.values(tracked)[0] || tracked
    const providerStatus = String((item as any)?.status || '').toLowerCase()
    const statusMap: Record<string, string> = { posted: 'posted', in_transit: 'in_transit', delivered: 'delivered', canceled: 'cancelled', cancelled: 'cancelled' }
    const shipmentStatus = statusMap[providerStatus] || existing.status
    const trackingCode = (item as any)?.tracking || (item as any)?.tracking_code || existing.tracking_code
    const trackingUrl = trackingCode ? `https://www.melhorrastreio.com.br/rastreio/${trackingCode}` : existing.tracking_url
    const updates: Record<string, unknown> = { status: shipmentStatus, tracking_code: trackingCode, tracking_url: trackingUrl, provider_payload: item, last_error: null }
    if (shipmentStatus === 'posted' && !existing.posted_at) updates.posted_at = new Date().toISOString()
    if (shipmentStatus === 'delivered' && !existing.delivered_at) updates.delivered_at = new Date().toISOString()
    const { data: shipment } = await admin.from('melhor_envio_shipments').update(updates).eq('id', existing.id).select().single()
    await admin.from('orders').update({ tracking_code: trackingCode, tracking_url: trackingUrl, ...(shipmentStatus === 'delivered' ? { status: 'delivered', delivered_at: new Date().toISOString() } : shipmentStatus === 'posted' || shipmentStatus === 'in_transit' ? { status: 'shipped', shipped_at: order.shipped_at || new Date().toISOString() } : {}) }).eq('id', order.id)
    await addEvent(existing.id, 'tracking_synced', shipmentStatus, 'Rastreamento atualizado.', item)
    return response({ ok: true, shipment })
  } catch (error) {
    console.error('melhor-envio failed:', error)
    return response({ ok: false, error: error instanceof Error ? error.message : 'Erro inesperado' }, 500)
  }
})