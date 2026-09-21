import { createClient } from 'npm:@supabase/supabase-js@2'

export type InternalAccess = { kind: 'service' | 'admin'; userId?: string }

export async function requireInternalOrAdmin(req: Request): Promise<InternalAccess | Response> {
  const authorization = req.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (token && serviceKey && token === serviceKey) return { kind: 'service' }

  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
  const { data, error } = await userClient.auth.getUser(token)
  if (error || !data.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)
  const { data: role } = await admin.from('user_roles').select('role').eq('user_id', data.user.id).eq('role', 'admin').maybeSingle()
  if (!role) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  return { kind: 'admin', userId: data.user.id }
}

export async function requireAuthenticated(req: Request): Promise<{ userId: string; isAdmin: boolean } | Response> {
  const authorization = req.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
  const { data, error } = await userClient.auth.getUser(token)
  if (error || !data.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: role } = await admin.from('user_roles').select('role').eq('user_id', data.user.id).eq('role', 'admin').maybeSingle()
  return { userId: data.user.id, isAdmin: Boolean(role) }
}
