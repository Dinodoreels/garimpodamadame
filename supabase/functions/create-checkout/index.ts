import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.25.76'

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
  shipping_address_id?: string
  discount_code?: string
  discount_amount?: number
  loyalty_points_used?: number
  loyalty_discount?: number
  shipping_option?: {
    carrier: string
    service: string
    service_code: string
    estimated_days: number
    original_cost: number
    quote_source?: 'melhor_envio' | 'correios' | 'local'
  }
}

const CheckoutSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(), variant_id: z.string().uuid(), quantity: z.number().int().min(1).max(100),
    title: z.string().max(255), variant_title: z.string().max(255).optional(), price: z.number().nonnegative(), image_url: z.string().url().optional(),
  })).min(1).max(100),
  shipping_cost: z.number().nonnegative().finite(),
  shipping_address_id: z.string().uuid(),
  shipping_address: z.object({
    id: z.string().uuid().optional(), recipient_name: z.string().trim().min(3).max(120), street: z.string().trim().min(2).max(160),
    number: z.string().trim().min(1).max(20), complement: z.string().trim().max(120).nullable().optional(), neighborhood: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(100), state: z.string().length(2), zip_code: z.string().regex(/^\d{5}-?\d{3}$/),
  }),
  shipping_option: z.object({
    carrier: z.string().trim().min(1).max(100), service: z.string().trim().min(1).max(100), service_code: z.string().trim().min(1).max(50),
    estimated_days: z.number().int().positive(), original_cost: z.number().nonnegative().finite(), quote_source: z.enum(['melhor_envio', 'correios', 'local']).optional(),
  }),
  discount_code: z.string().trim().max(50).optional(), loyalty_points_used: z.number().int().nonnegative().optional(),
})

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
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, phone, cpf, birth_date')
      .eq('id', userId)
      .maybeSingle()

    const parsedBody = CheckoutSchema.safeParse(await req.json())
    if (!parsedBody.success) {
      return new Response(JSON.stringify({ success: false, error: 'Complete e confirme seus dados, endereço e frete antes de pagar.', detail: parsedBody.error.issues[0]?.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const body: CheckoutRequest = parsedBody.data
    const { items, shipping_cost, shipping_address, shipping_address_id, discount_code, loyalty_points_used, shipping_option } = body

    const missingProfile = [
      !profile?.full_name && 'nome completo', !profile?.phone && 'telefone', !profile?.cpf && 'CPF', !profile?.birth_date && 'data de nascimento', !claimsData.user.email && 'e-mail',
    ].filter(Boolean)
    const cpf = String(profile?.cpf || '').replace(/\D/g, '')
    const phone = String(profile?.phone || '').replace(/\D/g, '')
    if (cpf.length !== 11 || phone.length < 10 || phone.length > 13) missingProfile.push('CPF ou telefone válido')
    if (missingProfile.length) return new Response(JSON.stringify({ success: false, error: `Complete seu cadastro: ${[...new Set(missingProfile)].join(', ')}` }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: savedAddress } = await admin.from('addresses').select('*').eq('id', shipping_address_id).eq('user_id', userId).maybeSingle()
    if (!savedAddress) return new Response(JSON.stringify({ success: false, error: 'Selecione um endereço salvo no seu cadastro.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const addressFields = ['recipient_name', 'street', 'number', 'neighborhood', 'city', 'state', 'zip_code'] as const
    const changedAddress = addressFields.some((field) => String(savedAddress[field] ?? '').replace(/\s/g, '').toLowerCase() !== String(shipping_address?.[field] ?? '').replace(/\s/g, '').toLowerCase())
    if (changedAddress) return new Response(JSON.stringify({ success: false, error: 'O endereço mudou. Calcule o frete novamente antes de pagar.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Carrinho vazio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (items.length > 100 || items.some((item) => !item.variant_id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) {
      return new Response(JSON.stringify({ success: false, error: 'Itens do pedido inválidos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const variantIds = [...new Set(items.map((item) => item.variant_id))]
    const { data: variants, error: variantsError } = await supabase.from('product_variants').select('id, product_id, title, price, inventory_quantity, is_available, products(title, weight_grams, length_cm, width_cm, height_cm, product_images(url, position))').in('id', variantIds)
    if (variantsError || !variants || variants.length !== variantIds.length) throw new Error('Não foi possível conferir os produtos')
    const variantsById = new Map(variants.map((variant: any) => [variant.id, variant]))
    const verifiedItems = items.map((item) => {
      const variant: any = variantsById.get(item.variant_id)
      if (!variant || !variant.is_available || Number(variant.inventory_quantity) < item.quantity) throw new Error('Um produto está indisponível ou sem estoque')
      return { ...item, product_id: variant.product_id, title: variant.products?.title ?? item.title, variant_title: variant.title, price: Number(variant.price), image_url: variant.products?.product_images?.sort((a: any, b: any) => a.position - b.position)?.[0]?.url ?? item.image_url }
    })
    const productsWithoutPackage = verifiedItems.filter((item: any) => !item.products?.weight_grams || !item.products?.length_cm || !item.products?.width_cm || !item.products?.height_cm)
    if (productsWithoutPackage.length) throw new Error(`Complete peso e dimensões de: ${productsWithoutPackage.map((item) => item.title).join(', ')}`)
    // Calculate totals from prices stored by the shop, never from browser values
    const subtotal = verifiedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    let couponDiscountValue = 0
    let verifiedDiscountCode: string | null = null
    if (discount_code) {
      const { data: discountRows, error: discountError } = await supabase.rpc('validate_discount_code', { p_code: discount_code.toUpperCase() })
      const discount = Array.isArray(discountRows) ? discountRows[0] : discountRows
      if (discountError || !discount) throw new Error('Cupom inválido ou expirado')
      const { count: priorUses } = await admin.from('discount_usage').select('*', { count: 'exact', head: true }).eq('discount_id', discount.id).eq('user_id', userId)
      if (discount.uses_per_user && (priorUses || 0) >= discount.uses_per_user) throw new Error('Você já usou este cupom')
      const { data: vipCampaign } = await admin.from('vip_product_campaigns').select('variant_id').eq('discount_code_id', discount.id).maybeSingle()
      const eligibleSubtotal = vipCampaign
        ? verifiedItems.filter((item) => item.variant_id === vipCampaign.variant_id).reduce((sum, item) => sum + item.price * item.quantity, 0)
        : subtotal
      if (vipCampaign && eligibleSubtotal <= 0) throw new Error('Este cupom é válido somente para o produto da oferta VIP')
      couponDiscountValue = discount.type === 'percentage'
        ? eligibleSubtotal * (Number(discount.value) / 100)
        : Math.min(Number(discount.value), eligibleSubtotal)
      if (discount.max_discount) couponDiscountValue = Math.min(couponDiscountValue, Number(discount.max_discount))
      verifiedDiscountCode = discount.code
    }

    const requestedPoints = Number(loyalty_points_used || 0)
    let loyaltyDiscountValue = 0
    if (requestedPoints > 0) {
      if (!Number.isSafeInteger(requestedPoints)) throw new Error('Quantidade de pontos inválida')
      const [{ data: loyaltySettings }, { data: loyaltyBalance }] = await Promise.all([
        admin.from('loyalty_settings').select('is_active, redemption_rate, min_redemption, min_order_value, max_discount_percent, redemption_step').maybeSingle(),
        admin.from('loyalty_points').select('balance').eq('user_id', userId).maybeSingle(),
      ])
      if (!loyaltySettings?.is_active) throw new Error('Programa de fidelidade indisponível')
      if (requestedPoints > Number(loyaltyBalance?.balance || 0)) throw new Error('Saldo de pontos insuficiente')
      if (requestedPoints < Number(loyaltySettings.min_redemption || 0)) throw new Error('Quantidade de pontos abaixo do mínimo para resgate')
      const redemptionStep = Math.max(1, Number(loyaltySettings.redemption_step || 1))
      if (requestedPoints % redemptionStep !== 0) throw new Error(`O resgate deve ser feito em múltiplos de ${redemptionStep} pontos`)
      if (subtotal < Number(loyaltySettings.min_order_value || 0)) throw new Error('Pedido abaixo do valor mínimo para usar pontos')
      loyaltyDiscountValue = (requestedPoints / 100) * Number(loyaltySettings.redemption_rate || 0)
      const maxLoyaltyDiscount = subtotal * Math.min(100, Math.max(0, Number(loyaltySettings.max_discount_percent ?? 100))) / 100
      if (loyaltyDiscountValue <= 0 || loyaltyDiscountValue > maxLoyaltyDiscount + 0.001) throw new Error('Desconto de pontos inválido para este pedido')
    }

    const discountValue = Math.round((couponDiscountValue + loyaltyDiscountValue) * 100) / 100
    const shippingValue = Math.max(0, Number(shipping_cost || 0))
    if (discountValue > subtotal || !Number.isFinite(shippingValue)) throw new Error('Valores de desconto ou frete inválidos')
    const total = subtotal - discountValue + shippingValue

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
        shipping_cost: shippingValue,
        total,
        shipping_address,
        shipping_address_id,
        discount_code: verifiedDiscountCode,
        discount_amount: discountValue,
        loyalty_points_used: requestedPoints,
        source: 'website',
        shipping_provider: shipping_option?.quote_source || (shipping_option ? 'melhor_envio' : null),
        shipping_carrier: shipping_option?.carrier || null,
        shipping_service: shipping_option?.service || null,
        shipping_service_code: shipping_option?.service_code || null,
        shipping_estimated_days: shipping_option?.estimated_days || null,
        shipping_original_cost: shipping_option?.original_cost ?? shippingValue,
        shipping_quote_data: shipping_option || {},
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      throw new Error('Erro ao criar pedido')
    }

    // Create order items
    const orderItems = verifiedItems.map(item => ({
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

    let remainingDiscount = discountValue
    const preferenceItems = verifiedItems.map(item => {
      // Only include picture_url if it's a valid URL (not base64)
      const isValidUrl = item.image_url && item.image_url.startsWith('http');
      const lineTotal = Math.round(item.price * item.quantity * 100) / 100
      const appliedToLine = Math.min(remainingDiscount, Math.max(0, lineTotal - 0.01))
      remainingDiscount = Math.round((remainingDiscount - appliedToLine) * 100) / 100
      return {
        id: item.variant_id,
        title: item.variant_title ? `${item.title} - ${item.variant_title}` : item.title,
        quantity: 1,
        unit_price: Math.round((lineTotal - appliedToLine) * 100) / 100,
        currency_id: 'BRL',
        ...(isValidUrl && { picture_url: item.image_url }),
      };
    })
    if (remainingDiscount > 0) throw new Error('O desconto ultrapassa o valor disponível dos produtos')

    // Add shipping as an item if present
    if (shippingValue > 0) {
      preferenceItems.push({
        id: 'shipping',
        title: 'Frete',
        quantity: 1,
        unit_price: shippingValue,
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
    const payerAddress = shipping_address
      ? {
          zip_code: String(shipping_address.zip_code || '').replace(/\D/g, ''),
          street_name: shipping_address.street,
          street_number: shipping_address.number,
        }
      : undefined

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
      // Rollback
      await supabase.from('order_items').delete().eq('order_id', order.id)
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(`Erro ao criar checkout: ${mpError}`)
    }

    const mpData = await mpResponse.json()

    if (requestedPoints > 0) {
      const { error: redemptionError } = await admin.rpc('redeem_loyalty_points', {
        p_order_id: order.id,
        p_user_id: userId,
        p_points: requestedPoints,
      })
      if (redemptionError) {
        console.error('Error redeeming loyalty points:', redemptionError)
        await admin.from('order_items').delete().eq('order_id', order.id)
        await admin.from('orders').delete().eq('id', order.id)
        throw new Error(redemptionError.message || 'Não foi possível resgatar os pontos')
      }
    }

    // Update order with Mercado Pago preference ID
    await supabase
      .from('orders')
      .update({ shopify_checkout_id: mpData.id, mercadopago_preference_id: mpData.id, payment_attempts: 1 })
      .eq('id', order.id)

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
