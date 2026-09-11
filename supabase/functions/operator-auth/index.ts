// Login rápido do galpão (código + PIN) e gestão de operadores.
import {
  OPERATOR_CORS, adminClient, hashPin, verifyPin, hashToken,
  pinHashNeedsUpgrade, resolveOperator, resolveAdminUser, CD_MANAGE_ROLES, jsonResponse,
} from "../_shared/operator.ts";

const SESSION_HOURS = 8;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const OPERATOR_ROLES = ['inbound', 'qc', 'estoque', 'commerce'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: OPERATOR_CORS });

  const db = adminClient();
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Requisição inválida.' }, 400);
  }
  const action = String(body.action ?? '');

  try {
    if (action === 'login') {
      const code = String(body.code ?? '').trim().toUpperCase();
      const pin = String(body.pin ?? '').trim();
      if (!code || pin.length < 4) {
        return jsonResponse({ ok: false, error: 'Informe o código e o PIN.' }, 400);
      }
      const { data: op } = await db
        .from('operators')
        .select('id, code, name, role, pin_hash, is_active, failed_login_attempts, locked_until')
        .eq('code', code)
        .maybeSingle();
      if (!op || !op.is_active) {
        return jsonResponse({ ok: false, error: 'Código ou PIN incorreto.' }, 401);
      }
      if (op.locked_until && new Date(op.locked_until).getTime() > Date.now()) {
        return jsonResponse({ ok: false, error: 'Acesso bloqueado temporariamente. Tente novamente em 15 minutos.' }, 429);
      }
      if (!(await verifyPin(pin, op.pin_hash))) {
        const attempts = Number(op.failed_login_attempts ?? 0) + 1;
        await db.from('operators').update({
          failed_login_attempts: attempts >= MAX_FAILED_ATTEMPTS ? 0 : attempts,
          locked_until: attempts >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
            : null,
        }).eq('id', op.id);
        return jsonResponse({ ok: false, error: 'Código ou PIN incorreto.' }, 401);
      }
      const token = crypto.randomUUID() + crypto.randomUUID();
      const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
      await db.from('operator_sessions').insert({
        operator_id: op.id,
        token_hash: await hashToken(token),
        expires_at: expires,
      });
      await db.from('operators').update({
        last_login_at: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null,
        ...(pinHashNeedsUpgrade(op.pin_hash) ? { pin_hash: await hashPin(pin) } : {}),
      }).eq('id', op.id);
      return jsonResponse({
        ok: true,
        token,
        expires_at: expires,
        operator: { id: op.id, code: op.code, name: op.name, role: op.role },
      });
    }

    if (action === 'me') {
      const op = await resolveOperator(req, db);
      if (!op) return jsonResponse({ ok: false, error: 'Sessão expirada.' }, 401);
      return jsonResponse({ ok: true, operator: op });
    }

    if (action === 'logout') {
      const token = req.headers.get('x-operator-token');
      if (token) {
        await db.from('operator_sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('token_hash', await hashToken(token));
      }
      return jsonResponse({ ok: true });
    }

    // Ações administrativas
    const user = await resolveAdminUser(req, db);
    if (!user || !user.roles.some((r) => CD_MANAGE_ROLES.includes(r))) {
      return jsonResponse({ ok: false, error: 'Sem permissão.' }, 403);
    }

    if (action === 'create') {
      const code = String(body.code ?? '').trim().toUpperCase();
      const name = String(body.name ?? '').trim();
      const pin = String(body.pin ?? '').trim();
      const role = String(body.role ?? 'inbound');
      if (!code || !name || !/^\d{4,6}$/.test(pin)) {
        return jsonResponse({ ok: false, error: 'Preencha código, nome e um PIN de 4 a 6 números.' }, 400);
      }
      if (!OPERATOR_ROLES.includes(role)) {
        return jsonResponse({ ok: false, error: 'Perfil de operador inválido.' }, 400);
      }
      const { error } = await db.from('operators').insert({
        code, name, role, pin_hash: await hashPin(pin), created_by: user.id,
      });
      if (error) {
        const dup = error.code === '23505';
        return jsonResponse({ ok: false, error: dup ? 'Já existe um operador com esse código.' : error.message }, 400);
      }
      return jsonResponse({ ok: true });
    }

    if (action === 'update') {
      const id = String(body.id ?? '');
      if (!id) return jsonResponse({ ok: false, error: 'Operador não informado.' }, 400);
      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) patch.name = String(body.name).trim();
      if (body.role !== undefined) {
        const role = String(body.role);
        if (!OPERATOR_ROLES.includes(role)) {
          return jsonResponse({ ok: false, error: 'Perfil de operador inválido.' }, 400);
        }
        patch.role = role;
      }
      if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);
      if (body.pin) {
        const pin = String(body.pin).trim();
        if (!/^\d{4,6}$/.test(pin)) {
          return jsonResponse({ ok: false, error: 'O PIN precisa ter de 4 a 6 números.' }, 400);
        }
        patch.pin_hash = await hashPin(pin);
        await db.from('operator_sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('operator_id', id).is('revoked_at', null);
      }
      const { error } = await db.from('operators').update(patch).eq('id', id);
      if (error) return jsonResponse({ ok: false, error: error.message }, 400);
      if (body.is_active === false) {
        await db.from('operator_sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('operator_id', id).is('revoked_at', null);
      }
      return jsonResponse({ ok: true });
    }

    if (action === 'delete') {
      const id = String(body.id ?? '');
      const { error } = await db.from('operators').delete().eq('id', id);
      if (error) return jsonResponse({ ok: false, error: error.message }, 400);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: 'Ação desconhecida.' }, 400);
  } catch (e) {
    console.error('operator-auth error', e);
    return jsonResponse({ ok: false, error: 'Falha inesperada no acesso do galpão.' }, 500);
  }
});
