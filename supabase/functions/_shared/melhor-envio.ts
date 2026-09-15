import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const MELHOR_ENVIO_BASE_URL = 'https://melhorenvio.com.br'
export const MELHOR_ENVIO_API_URL = `${MELHOR_ENVIO_BASE_URL}/api/v2/me`
export const MELHOR_ENVIO_CALLBACK_URL = 'https://ogarimpodigital.com.br/integracoes/melhor-envio/callback'
export const MELHOR_ENVIO_USER_AGENT = 'Garimpo da Madame (mktgarimpodamadame@gmail.com)'
export const MELHOR_ENVIO_SCOPES = [
  'cart-read',
  'cart-write',
  'orders-read',
  'shipping-calculate',
  'shipping-cancel',
  'shipping-checkout',
  'shipping-companies',
  'shipping-generate',
  'shipping-preview',
  'shipping-print',
  'shipping-tracking',
  'users-read',
].join(' ')

export function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) throw new Error('Backend indisponível')
  return createClient(url, serviceKey)
}

export function getOAuthCredentials() {
  return {
    clientId: Deno.env.get('MELHOR_ENVIO_CLIENT_ID') ?? '',
    clientSecret: Deno.env.get('MELHOR_ENVIO_CLIENT_SECRET') ?? '',
  }
}

async function requestToken(body: Record<string, string>) {
  const result = await fetch(`${MELHOR_ENVIO_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': MELHOR_ENVIO_USER_AGENT,
    },
    body: JSON.stringify(body),
  })
  const text = await result.text()
  let data: Record<string, unknown> = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { message: text } }
  if (!result.ok || !data.access_token) {
    const detail = data.message || data.error_description || data.error || 'Não foi possível autorizar a conta.'
    throw new Error(String(detail))
  }
  return data as { access_token: string; refresh_token?: string; expires_in?: number }
}

export async function exchangeAuthorizationCode(code: string) {
  const { clientId, clientSecret } = getOAuthCredentials()
  if (!clientId || !clientSecret) throw new Error('Client ID e Client Secret ainda não foram cadastrados no cofre seguro.')
  return requestToken({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: MELHOR_ENVIO_CALLBACK_URL,
    code,
  })
}

export async function getValidAccessToken() {
  const admin = getAdminClient()
  const { data: config, error } = await admin.from('melhor_envio_config').select('*').eq('singleton', true).maybeSingle()
  if (error) throw error
  if (!config?.access_token) throw new Error('Conecte sua conta do Melhor Envio nas configurações de frete.')

  const expiry = config.token_expires_at ? new Date(config.token_expires_at).getTime() : 0
  if (expiry > Date.now() + 5 * 60 * 1000) return config.access_token as string
  if (!config.refresh_token) throw new Error('A autorização do Melhor Envio venceu. Conecte a conta novamente.')

  const { clientId, clientSecret } = getOAuthCredentials()
  if (!clientId || !clientSecret) throw new Error('As credenciais do aplicativo Melhor Envio não estão configuradas.')
  try {
    const token = await requestToken({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: config.refresh_token,
    })
    const expiresAt = new Date(Date.now() + Number(token.expires_in ?? 2592000) * 1000).toISOString()
    await admin.from('melhor_envio_config').update({
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? config.refresh_token,
      token_expires_at: expiresAt,
      last_error: null,
    }).eq('id', config.id)
    return token.access_token
  } catch (error) {
    await admin.from('melhor_envio_config').update({ last_error: error instanceof Error ? error.message : String(error) }).eq('id', config.id)
    throw error
  }
}

export async function callMelhorEnvio(path: string, method = 'GET', body?: unknown) {
  const token = await getValidAccessToken()
  const result = await fetch(`${MELHOR_ENVIO_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': MELHOR_ENVIO_USER_AGENT,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await result.text()
  if (!result.ok) {
    let message = 'O Melhor Envio recusou a operação.'
    if (result.status === 401) message = 'A autorização do Melhor Envio venceu. Reconecte a conta.'
    if (result.status === 402) message = 'Saldo insuficiente no Melhor Envio.'
    if (result.status === 422) message = 'Revise endereço, documento, peso e dimensões do pacote.'
    throw new Error(`${message} [${result.status}] ${text.slice(0, 500)}`)
  }
  return text ? JSON.parse(text) : {}
}