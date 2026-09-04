import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ManualOrderItem {
  product: {
    id: string;
    title: string;
    images?: { url: string }[];
  };
  variant: {
    id: string;
    title: string;
    price: number;
  };
  quantity: number;
}

interface ManualOrderRequest {
  customerType: 'registered' | 'guest';
  customerId?: string;
  guestInfo?: {
    name: string;
    phone: string;
    email?: string;
  };
  items: ManualOrderItem[];
  shippingAddress: {
    recipient_name: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  };
  shippingCost: number;
  discountCode?: string;
  discountAmount?: number;
  paymentMethod: string;
  initialStatus: string;
  adminNotes?: string;
  paymentReceiptUrl?: string;
  storeId?: string;
  source?: string;
  saleDate?: string;
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

    // Verify admin user
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token)
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminId = claimsData.user.id

    // Check if user is admin or vendedor
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminId)
      .in('role', ['admin', 'vendedor'])

    if (!roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Apenas administradores ou vendedores podem criar pedidos manuais' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: ManualOrderRequest = await req.json()
    const { 
      customerType, 
      customerId, 
      guestInfo, 
      items, 
      shippingAddress, 
      shippingCost, 
      discountCode, 
      discountAmount, 
      paymentMethod, 
      initialStatus, 
      adminNotes,
      paymentReceiptUrl,
      storeId,
    } = body
    const saleDate = body.saleDate

    // Validate sale date is not in the future
    let backdatedAt: string | null = null
    if (saleDate) {
      const parsed = new Date(saleDate)
      if (isNaN(parsed.getTime())) {
        return new Response(
          JSON.stringify({ success: false, error: 'Data da venda inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (parsed.getTime() > Date.now() + 60_000) {
        return new Response(
          JSON.stringify({ success: false, error: 'Data da venda não pode estar no futuro' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      backdatedAt = parsed.toISOString()
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum produto no pedido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0)
    const discountValue = discountAmount || 0
    const total = subtotal - discountValue + (shippingCost || 0)

    // Generate order number using service role for RPC
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: orderNumberData, error: orderNumberError } = await supabaseService
      .rpc('generate_order_number')

    if (orderNumberError) {
      console.error('Error generating order number:', orderNumberError)
      throw new Error('Erro ao gerar número do pedido')
    }

    const orderNumber = orderNumberData

    // Determine timestamps based on status
    const now = backdatedAt || new Date().toISOString()
    const timestamps: Record<string, string> = {}
    if (initialStatus === 'paid' || initialStatus === 'shipped') {
      timestamps.paid_at = now
    }
    if (initialStatus === 'shipped') {
      timestamps.shipped_at = now
    }

    // Create order
    const orderData: Record<string, unknown> = {
      user_id: customerType === 'registered' ? customerId : null,
      order_number: orderNumber,
      status: initialStatus || 'pending',
      subtotal,
      shipping_cost: shippingCost || 0,
      total,
      shipping_address: shippingAddress,
      discount_code: discountCode || null,
      discount_amount: discountValue,
      source: body.source || 'whatsapp',
      payment_method: paymentMethod,
      guest_info: customerType === 'guest' ? guestInfo : null,
      created_by: adminId,
      admin_notes: adminNotes || null,
      payment_receipt_url: paymentReceiptUrl || null,
      store_id: storeId || null,
      ...timestamps,
    }
    if (backdatedAt) {
      orderData.created_at = backdatedAt
      orderData.updated_at = backdatedAt
    }

    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      throw new Error('Erro ao criar pedido')
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      variant_id: item.variant.id,
      shopify_product_id: item.product.id,
      shopify_variant_id: item.variant.id,
      product_title: item.product.title,
      variant_title: item.variant.title !== 'Default' ? item.variant.title : null,
      quantity: item.quantity,
      unit_price: item.variant.price,
      total_price: item.variant.price * item.quantity,
      image_url: item.product.images?.[0]?.url || null,
    }))

    const { error: itemsError } = await supabaseService
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      await supabaseService.from('orders').delete().eq('id', order.id)
      throw new Error('Erro ao criar itens do pedido')
    }

    // Create initial status history
    await supabaseService
      .from('order_status_history')
      .insert({
        order_id: order.id,
        status: initialStatus || 'pending',
        changed_by: adminId,
        note: 'Pedido criado manualmente via admin',
      })

    console.log('Manual order created successfully:', orderNumber)

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: orderNumber,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-manual-order:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
