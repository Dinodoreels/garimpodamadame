import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'

const BodySchema = z.object({ url: z.string().url().refine((value) => new URL(value).hostname === 'ogarimpodigital.com.br') })
const headers = { ...corsHeaders, 'Content-Type': 'application/json' }
const gateway = 'https://connector-gateway.lovable.dev/google_search_console'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') || ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error('Serviço indisponível.')
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } })
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: userData } = await caller.auth.getUser(auth.replace('Bearer ', ''))
    if (!userData.user) return new Response(JSON.stringify({ ok: false, error: 'Sessão inválida.' }), { status: 401, headers })
    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
    if (!role) return new Response(JSON.stringify({ ok: false, error: 'Apenas administradores podem consultar.' }), { status: 403, headers })
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return new Response(JSON.stringify({ ok: false, error: 'Endereço inválido.' }), { status: 400, headers })
    const lovableKey = Deno.env.get('LOVABLE_API_KEY')
    const connectionKey = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY')
    if (!lovableKey || !connectionKey) return new Response(JSON.stringify({ ok: false, error: 'A conexão com o Google precisa ser ativada.' }), { status: 503, headers })
    const gatewayHeaders = { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': connectionKey }
    const sitesResponse = await fetch(`${gateway}/webmasters/v3/sites`, { headers: gatewayHeaders })
    if (!sitesResponse.ok) throw new Error(`Google respondeu ${sitesResponse.status}.`)
    const sites = await sitesResponse.json()
    const target = new URL(parsed.data.url)
    const matches = (sites.siteEntry || []).filter((entry: any) => {
      if (entry.permissionLevel === 'siteUnverifiedUser') return false
      if (String(entry.siteUrl).startsWith('sc-domain:')) { const domain = String(entry.siteUrl).slice(10); return target.hostname === domain || target.hostname.endsWith(`.${domain}`) }
      try { return target.href.startsWith(new URL(entry.siteUrl).href) } catch { return false }
    })
    if (matches.length === 0) return new Response(JSON.stringify({ ok: false, error: 'O Google não encontrou uma propriedade verificada para esta loja.' }), { status: 409, headers })
    const exact = matches.find((entry: any) => entry.siteUrl === 'https://ogarimpodigital.com.br/')
    const siteUrl = exact?.siteUrl || matches[0]?.siteUrl
    const inspection = await fetch(`${gateway}/v1/urlInspection/index:inspect`, { method: 'POST', headers: { ...gatewayHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ inspectionUrl: parsed.data.url, siteUrl }) })
    const body = await inspection.json().catch(() => ({}))
    if (!inspection.ok) return new Response(JSON.stringify({ ok: false, error: body?.error?.message || `Google respondeu ${inspection.status}.` }), { status: inspection.status, headers })
    const result = body.inspectionResult?.indexStatusResult || {}
    const indexed = result.verdict === 'PASS'
    return new Response(JSON.stringify({ ok: true, indexed, verdict: result.verdict, coverage: result.coverageState, last_crawl: result.lastCrawlTime, robots: result.robotsTxtState, message: indexed ? 'Página indexada pelo Google.' : `Página ainda não indexada: ${result.coverageState || 'o Google ainda não informou o motivo'}.` }), { headers })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Falha ao consultar o Google.' }), { status: 500, headers })
  }
})
