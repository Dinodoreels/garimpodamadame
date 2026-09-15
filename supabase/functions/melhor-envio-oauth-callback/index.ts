import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { callMelhorEnvio, exchangeAuthorizationCode, getAdminClient } from '../_shared/melhor-envio.ts'

const headers = { ...corsHeaders, 'Content-Type': 'application/json' }
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const input = await req.json().catch(() => ({})) as { code?: string; state?: string; error?: string; error_description?: string }
    if (input.error) return reply({ ok: false, error: input.error_description || 'A autorização foi cancelada no Melhor Envio.' }, 400)
    if (!input.code || !input.state) return reply({ ok: false, error: 'O retorno do Melhor Envio está incompleto.' }, 400)

    const admin = getAdminClient()
    const { data: config } = await admin.from('melhor_envio_config').select('*').eq('singleton', true).maybeSingle()
    if (!config?.oauth_state || config.oauth_state !== input.state) return reply({ ok: false, error: 'A verificação de segurança falhou. Inicie a conexão novamente.' }, 400)

    const token = await exchangeAuthorizationCode(input.code)
    const expiresAt = new Date(Date.now() + Number(token.expires_in ?? 2592000) * 1000).toISOString()
    await admin.from('melhor_envio_config').update({
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? null,
      token_expires_at: expiresAt,
      connected_at: new Date().toISOString(),
      oauth_state: null,
      last_error: null,
    }).eq('id', config.id)

    let account: Record<string, unknown> = {}
    try {
      account = await callMelhorEnvio('') as Record<string, unknown>
      const accountName = [account.firstname, account.lastname].filter(Boolean).join(' ') || account.name || null
      await admin.from('melhor_envio_config').update({ account_name: accountName, account_email: account.email ?? null }).eq('id', config.id)
    } catch { /* account name is optional; authorization is already valid */ }

    return reply({ ok: true, account_name: [account.firstname, account.lastname].filter(Boolean).join(' ') || account.name || null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível concluir a conexão.'
    try {
      await getAdminClient().from('melhor_envio_config').update({ oauth_state: null, last_error: message }).eq('singleton', true)
    } catch { /* preserve the original error */ }
    return reply({ ok: false, error: message }, 500)
  }
})