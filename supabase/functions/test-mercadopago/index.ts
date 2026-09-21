import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get optional token from body, otherwise use env secret
    const body = await req.json().catch(() => ({}))
    const accessToken = body.access_token?.trim() || Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')

    if (!accessToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token não configurado',
          detail: 'Cadastre o Access Token de produção do Mercado Pago no cofre seguro e teste novamente.'
        }),
        // Missing configuration is an expected admin state, not a function failure.
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test against Mercado Pago API (server-side, no CORS issues)
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (mpResponse.ok) {
      const methods = await mpResponse.json()
      const availableMethods = Array.isArray(methods) ? methods : []
      const debitMethods = availableMethods
        .filter((method: { payment_type_id?: string; status?: string }) =>
          method.payment_type_id === 'debit_card' && method.status !== 'deactivated'
        )
        .map((method: { id?: string; name?: string; status?: string }) => ({
          id: method.id || '',
          name: method.name || method.id || 'Cartão de débito',
          status: method.status || 'active',
        }))
      // Check if it's sandbox or production
      const isSandbox = accessToken.startsWith('TEST-')
      return new Response(
        JSON.stringify({ 
          success: true, 
          environment: isSandbox ? 'sandbox' : 'production',
          methods_count: availableMethods.length,
          debit_available: debitMethods.length > 0,
          debit_methods: debitMethods,
          debit_note: debitMethods.length > 0
            ? 'A conta aceita débito, mas o Mercado Pago decide quais opções mostrar para cada comprador e cartão.'
            : 'A conta não recebeu modalidades de débito na consulta atual do Mercado Pago.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle specific MP error codes
    const status = mpResponse.status
    let errorMsg = 'Credencial inválida'
    let detail = ''

    if (status === 401) {
      errorMsg = 'Access Token inválido'
      detail = 'O token informado foi rejeitado pelo Mercado Pago. Verifique se copiou o token completo.'
    } else if (status === 403) {
      errorMsg = 'Acesso negado'
      detail = 'O token não tem permissão para acessar a API. Verifique as permissões da aplicação.'
    } else if (status === 429) {
      errorMsg = 'Limite de requisições'
      detail = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
    } else {
      const errorBody = await mpResponse.text().catch(() => '')
      detail = `Status ${status}: ${errorBody.substring(0, 200)}`
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMsg, detail }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in test-mercadopago:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno',
        detail: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
