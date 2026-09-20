import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

function splitName(fullName?: string | null) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  return {
    name: parts[0] || undefined,
    surname: parts.slice(1).join(' ') || undefined,
  }
}

function normalizePhone(phone?: string | null) {
  const digits = String(phone || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (digits.length < 10 || digits.length > 11) return undefined
  return { area_code: digits.slice(0, 2), number: digits.slice(2) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token)
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.user.id
    const { order_id } = await req.json()

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID do pedido não informado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', order_id)
      .eq('user_id', userId)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, cpf')
      .eq('id', userId)
      .maybeSingle()

    // Check if order is in a retryable state
    if (!['pending', 'payment_failed'].includes(order.status)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Este pedido não pode ter o pagamento refeito' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Mercado Pago preference
    const mercadoPagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!mercadoPagoToken) {
      throw new Error('Token do Mercado Pago não configurado')
    }

    const preferenceItems = order.order_items.map((item: any) => {
      const isValidUrl = item.image_url && item.image_url.startsWith('http');
      return {
        id: item.variant_id || item.shopify_variant_id,
        title: item.variant_title ? `${item.product_title} - ${item.variant_title}` : item.product_title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: 'BRL',
        ...(isValidUrl && { picture_url: item.image_url }),
      };
    })

    // Add shipping as an item if present
    if (order.shipping_cost && order.shipping_cost > 0) {
      preferenceItems.push({
        id: 'shipping',
        title: 'Frete',
        quantity: 1,
        unit_price: order.shipping_cost,
        currency_id: 'BRL',
        picture_url: undefined,
      })
    }

    const requestOrigin = req.headers.get('origin') || ''
    const allowedOrigins = ['https://ogarimpodigital.com.br', 'https://www.ogarimpodigital.com.br', 'https://garimpodamadame.lovable.app']
    const projectUrl = allowedOrigins.includes(requestOrigin) || requestOrigin.endsWith('.lovable.app') ? requestOrigin : 'https://ogarimpodigital.com.br'
    const payerName = splitName(profile?.full_name)
    const payerPhone = normalizePhone(profile?.phone)
    const payerCpf = String(profile?.cpf || '').replace(/\D/g, '')
    const shippingAddress = order.shipping_address && typeof order.shipping_address === 'object'
      ? order.shipping_address as Record<string, unknown>
      : undefined
    const payerAddress = shippingAddress
      ? {
          zip_code: String(shippingAddress.zip_code || '').replace(/\D/g, ''),
          street_name: String(shippingAddress.street || ''),
          street_number: String(shippingAddress.number || ''),
        }
      : undefined

    const preference = {
      items: preferenceItems,
      external_reference: order.id,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      back_urls: {
        success: `${projectUrl}/checkout/success?order=${order.order_number}`,
        failure: `${projectUrl}/checkout/failure?order=${order.order_number}`,
        pending: `${projectUrl}/checkout/pending?order=${order.order_number}`,
      },
      auto_return: 'approved',
      statement_descriptor: 'GARIMPO MADAME',
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [{ id: 'ticket' }],
        installments: 12,
      },
      payer: {
        email: claimsData.user.email,
        ...(payerName.name && { name: payerName.name }),
        ...(payerName.surname && { surname: payerName.surname }),
        ...(payerPhone && { phone: payerPhone }),
        ...(payerCpf.length === 11 && { identification: { type: 'CPF', number: payerCpf } }),
        ...(payerAddress && { address: payerAddress }),
      },
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mercadoPagoToken}`,
      },
      body: JSON.stringify(preference),
    })

    if (!mpResponse.ok) {
      const mpError = await mpResponse.text()
      console.error('Mercado Pago error:', mpError)
      throw new Error(`Erro ao criar checkout: ${mpError}`)
    }

    const mpData = await mpResponse.json()

    // Update order with new preference ID and increment attempts
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabaseService
      .from('orders')
      .update({ 
        shopify_checkout_id: mpData.id,
        mercadopago_preference_id: mpData.id,
        payment_attempts: (order.payment_attempts || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    console.log('Retry payment created successfully:', mpData.id)

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: mpData.init_point,
        order_id: order.id,
        order_number: order.order_number,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in retry-payment:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
