import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import {
  getAdminClient,
  getOAuthCredentials,
  MELHOR_ENVIO_BASE_URL,
  MELHOR_ENVIO_CALLBACK_URL,
  MELHOR_ENVIO_SCOPES,
} from '../_shared/melhor-envio.ts'

const headers = { ...corsHeaders, 'Content-Type': 'application/json' }
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return reply({ ok: false, error: 'Não autorizado' }, 401)
    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!url || !anonKey) return reply({ ok: false, error: 'Backend indisponível' }, 500)

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const admin = getAdminClient()
    const { data: userData } = await caller.auth.getUser(authHeader.slice(7))
    if (!userData.user) return reply({ ok: false, error: 'Sessão inválida' }, 401)
    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
    if (!role) return reply({ ok: false, error: 'Apenas administradores podem conectar o Melhor Envio' }, 403)

    const input = await req.json().catch(() => ({})) as { action?: 'status' | 'start' }
    const { data: config } = await admin.from('melhor_envio_config').select('account_name, account_email, connected_at, token_expires_at, last_error, access_token').eq('singleton', true).maybeSingle()
    const { clientId, clientSecret } = getOAuthCredentials()
    if (input.action === 'status') {
      return reply({
        ok: true,
        credentials_configured: Boolean(clientId && clientSecret),
        connected: Boolean(config?.access_token),
        account_name: config?.account_name ?? null,
        account_email: config?.account_email ?? null,
        connected_at: config?.connected_at ?? null,
        token_expires_at: config?.token_expires_at ?? null,
        last_error: config?.last_error ?? null,
        callback_url: MELHOR_ENVIO_CALLBACK_URL,
      })
    }
    if (!clientId || !clientSecret) return reply({ ok: false, error: 'Cadastre o Client ID e o Client Secret no cofre seguro antes de conectar.' }, 409)

    const state = crypto.randomUUID()
    await admin.from('melhor_envio_config').update({ oauth_state: state, last_error: null }).eq('singleton', true)
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: MELHOR_ENVIO_CALLBACK_URL,
      response_type: 'code',
      state,
      scope: MELHOR_ENVIO_SCOPES,
    })
    return reply({ ok: true, url: `${MELHOR_ENVIO_BASE_URL}/oauth/authorize?${params.toString()}`, callback_url: MELHOR_ENVIO_CALLBACK_URL })
  } catch (error) {
    return reply({ ok: false, error: error instanceof Error ? error.message : 'Erro inesperado' }, 500)
  }
})