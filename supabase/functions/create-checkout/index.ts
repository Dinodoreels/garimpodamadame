import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckoutItem {
  product_id: string
  variant_id: string
  quantity: number
  title: string
  variant_title?: string
  price: number
  image_url?: string
}

interface CheckoutRequest {
  items: CheckoutItem[]
  shipping_cost: number
  shipping_address?: {
    recipient_name: string
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zip_code: string
  }
  discount_code?: string
  discount_amount?: number
  loyalty_points_used?: number
  loyalty_discount?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    const body: CheckoutRequest = await req.json()
    const { items, shipping_cost, shipping_address, discount_code, discount_amount, loyalty_points_used, loyalty_discount } = body

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Carrinho vazio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate totals with discount
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const discountValue = discount_amount || 0
    const total = subtotal - discountValue + (shipping_cost || 0)

    // Generate order number
    const { data: orderNumberData, error: orderNumberError } = await supabase
      .rpc('generate_order_number')

    if (orderNumberError) {
      console.error('Error generating order number:', orderNumberError)
      throw new Error('Erro ao gerar número do pedido')
    }

    const orderNumber = orderNumberData

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: orderNumber,
        status: 'pending',
        subtotal,
        shipping_cost: shipping_cost || 0,
        total,
        shipping_address,
        discount_code: discount_code || null,
        discount_amount: discountValue,
        loyalty_points_used: loyalty_points_used || 0,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      throw new Error('Erro ao criar pedido')
    }

    // If loyalty points were used, deduct them from user's balance
    if (loyalty_points_used && loyalty_points_used > 0) {
      // Create redemption transaction
      const { error: transactionError } = await supabase
        .from('loyalty_transactions')
        .insert({
          user_id: userId,
          order_id: order.id,
          type: 'redeem',
          points: -loyalty_points_used,
          description: `Resgate - Pedido #${orderNumber}`,
        })

      if (transactionError) {
        console.error('Error creating loyalty transaction:', transactionError)
      }

      // Update user's loyalty balance
      const { error: balanceError } = await supabase
        .from('loyalty_points')
        .update({ 
          balance: supabase.rpc('decrement_balance', { amount: loyalty_points_used }),
          total_redeemed: supabase.rpc('increment_redeemed', { amount: loyalty_points_used }),
        })
        .eq('user_id', userId)

      // Alternative: Direct update with SQL
      if (balanceError) {
        console.error('Error updating loyalty balance, trying direct update:', balanceError)
        await supabase.rpc('adjust_loyalty_balance', {
          p_user_id: userId,
          p_points: -loyalty_points_used,
        })
      }
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      shopify_product_id: item.product_id, // Manter compatibilidade temporária
      shopify_variant_id: item.variant_id,
      product_title: item.title,
      variant_title: item.variant_title || null,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      image_url: item.image_url || null,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      // Rollback order
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error('Erro ao criar itens do pedido')
    }

    // Create Mercado Pago preference
    const mercadoPagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!mercadoPagoToken) {
      throw new Error('Token do Mercado Pago não configurado')
    }

    const preferenceItems = items.map(item => {
      // Only include picture_url if it's a valid URL (not base64)
      const isValidUrl = item.image_url && item.image_url.startsWith('http');
      return {
        id: item.variant_id,
        title: item.variant_title ? `${item.title} - ${item.variant_title}` : item.title,
        quantity: item.quantity,
        unit_price: item.price,
        currency_id: 'BRL',
        ...(isValidUrl && { picture_url: item.image_url }),
      };
    })

    // Add shipping as an item if present
    if (shipping_cost && shipping_cost > 0) {
      preferenceItems.push({
        id: 'shipping',
        title: 'Frete',
        quantity: 1,
        unit_price: shipping_cost,
        currency_id: 'BRL',
        picture_url: undefined,
      })
    }

    const projectUrl = req.headers.get('origin') || 'https://storenatalhapardal.lovable.app'

    const preference = {
      items: preferenceItems,
      external_reference: order.id,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      back_urls: {
        success: `${projectUrl}/checkout/success?order=${orderNumber}`,
        failure: `${projectUrl}/checkout/failure?order=${orderNumber}`,
        pending: `${projectUrl}/checkout/pending?order=${orderNumber}`,
      },
      auto_return: 'approved',
      statement_descriptor: 'VANGUARD STORE',
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [{ id: 'ticket' }],
        installments: 12,
      },
      payer: {
        email: claimsData.user.email,
      },
    }

    console.log('Creating Mercado Pago preference:', JSON.stringify(preference, null, 2))

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
      // Rollback
      await supabase.from('order_items').delete().eq('order_id', order.id)
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(`Erro ao criar checkout: ${mpError}`)
    }

    const mpData = await mpResponse.json()

    // Update order with Mercado Pago preference ID
    await supabase
      .from('orders')
      .update({ shopify_checkout_id: mpData.id }) // Reusing field for MP preference ID
      .eq('id', order.id)

    console.log('Checkout created successfully:', mpData.id)

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: mpData.init_point,
        order_id: order.id,
        order_number: orderNumber,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-checkout:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
