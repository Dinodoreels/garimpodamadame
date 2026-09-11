// Utilitários de operador do galpão: hash de PIN e validação de sessão.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

export const OPERATOR_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-operator-token',
};

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function pbkdf2(pin: string, salt: string) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120_000,
  }, key, 256);
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hash do PIN no formato salt$hash — o PIN nunca é guardado em texto. */
export async function hashPin(pin: string, salt?: string) {
  const s = salt ?? crypto.randomUUID().replace(/-/g, '');
  const h = await pbkdf2(pin, s);
  return `pbkdf2$${s}$${h}`;
}

export async function verifyPin(pin: string, stored: string) {
  const parts = stored.split('$');
  if (parts[0] === 'pbkdf2' && parts.length === 3) {
    return (await hashPin(pin, parts[1])) === stored;
  }
  // Compatibilidade temporária: hashes antigos são atualizados no próximo login válido.
  if (parts.length === 2) return (await sha256(`${parts[0]}:${pin}`)) === parts[1];
  return false;
}

export const pinHashNeedsUpgrade = (stored: string) => !stored.startsWith('pbkdf2$');

export const hashToken = (token: string) => sha256(token);

export interface OperatorSession {
  operator_id: string;
  code: string;
  name: string;
  role: string;
}

/** Valida o token do tablet e devolve o operador, ou null. */
export async function resolveOperator(req: Request, db: SupabaseClient): Promise<OperatorSession | null> {
  const token = req.headers.get('x-operator-token');
  if (!token) return null;
  const { data } = await db
    .from('operator_sessions')
    .select('operator_id, expires_at, revoked_at, operators(id, code, name, role, is_active)')
    .eq('token_hash', await hashToken(token))
    .maybeSingle();
  if (!data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  const op = data.operators as unknown as { id: string; code: string; name: string; role: string; is_active: boolean } | null;
  if (!op || !op.is_active) return null;
  return { operator_id: op.id, code: op.code, name: op.name, role: op.role };
}

/** Valida o JWT do painel e devolve o usuário com perfis de CD, ou null. */
export async function resolveAdminUser(req: Request, db: SupabaseClient) {
  const auth = req.headers.get('Authorization');
  if (!auth) return null;
  const jwt = auth.replace(/^Bearer\s+/i, '');
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data.user) return null;
  const { data: roles } = await db.from('user_roles').select('role').eq('user_id', data.user.id);
  const list = (roles ?? []).map((r: { role: string }) => r.role);
  return { id: data.user.id, roles: list };
}

export const CD_MANAGE_ROLES = ['admin', 'gestor_cd'];
export const CD_SCAN_ROLES = ['admin', 'gestor_cd', 'inbound'];

export function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...OPERATOR_CORS, 'Content-Type': 'application/json' },
  });
}
