// Shared Bling API v3 helper
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const BLING_API = "https://api.bling.com.br/Api/v3";
export const BLING_AUTH = "https://www.bling.com.br/Api/v3/oauth/authorize";
export const BLING_TOKEN = "https://api.bling.com.br/Api/v3/oauth/token";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface BlingConfig {
  id: string;
  client_id: string | null;
  client_secret: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  oauth_state: string | null;
  company_name: string | null;
  is_active: boolean;
  sync_products: boolean;
  sync_stock: boolean;
  sync_prices: boolean;
  push_orders: boolean;
  pull_marketplace_orders: boolean;
  stock_authority: "bling" | "store" | "notify";
  price_authority: "bling" | "store" | "notify";
  order_pull_interval_minutes: number;
  deposito_id: string | null;
  loja_id: string | null;
  last_order_pull_at: string | null;
}

export async function getConfig(): Promise<BlingConfig | null> {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from("bling_config")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as BlingConfig | null;
}

export function getCallbackUrl() {
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/bling-oauth-callback`;
}

export async function logSync(entry: {
  entity_type: string;
  entity_id?: string | null;
  action: string;
  status: string;
  payload?: unknown;
  response?: unknown;
  error_message?: string | null;
}) {
  try {
    const supa = getSupabaseAdmin();
    await supa.from("bling_sync_log").insert({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      action: entry.action,
      status: entry.status,
      payload: entry.payload ?? null,
      response: entry.response ?? null,
      error_message: entry.error_message ?? null,
    });
  } catch (_) {
    // logging must never break the flow
  }
}

/** Verify the caller is an authenticated admin. Throws a Response otherwise. */
export async function assertAdmin(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Response("Unauthorized", { status: 401 });
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) throw new Response("Unauthorized", { status: 401 });
  const admin = getSupabaseAdmin();
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Response("Forbidden", { status: 403 });
  return userData.user.id;
}

/** Exchange an authorization code or refresh token for tokens. */
export async function requestToken(
  cfg: { client_id: string; client_secret: string },
  params: Record<string, string>,
): Promise<{ status: number; data: any }> {
  const basic = btoa(`${cfg.client_id}:${cfg.client_secret}`);
  const res = await fetch(BLING_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function refreshAccessToken(cfg: BlingConfig): Promise<string> {
  if (!cfg.client_id || !cfg.client_secret || !cfg.refresh_token) {
    throw new Error("Bling não conectado. Faça a conexão no painel.");
  }
  const { status, data } = await requestToken(
    { client_id: cfg.client_id, client_secret: cfg.client_secret },
    { grant_type: "refresh_token", refresh_token: cfg.refresh_token },
  );
  if (status !== 200 || !data?.access_token) {
    const msg = `Falha ao renovar acesso do Bling [${status}]: ${JSON.stringify(data)}`;
    await getSupabaseAdmin()
      .from("bling_config")
      .update({ last_error: msg })
      .eq("id", cfg.id);
    throw new Error(msg);
  }
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 21600) * 1000)
    .toISOString();
  await getSupabaseAdmin()
    .from("bling_config")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? cfg.refresh_token,
      token_expires_at: expiresAt,
      last_error: null,
    })
    .eq("id", cfg.id);
  cfg.access_token = data.access_token;
  cfg.token_expires_at = expiresAt;
  return data.access_token as string;
}

async function validToken(cfg: BlingConfig): Promise<string> {
  const exp = cfg.token_expires_at ? Date.parse(cfg.token_expires_at) : 0;
  if (!cfg.access_token || exp - Date.now() < 120_000) {
    return await refreshAccessToken(cfg);
  }
  return cfg.access_token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Call the Bling API v3. Handles token refresh, 401 retry and rate limit (3 req/s).
 */
export async function callBling(opts: {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  config?: BlingConfig;
}): Promise<{ status: number; data: any }> {
  const cfg = opts.config ?? (await getConfig());
  if (!cfg) throw new Error("Bling não configurado.");
  let token = await validToken(cfg);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const url = `${BLING_API}${opts.path}${qs.toString() ? `?${qs}` : ""}`;

  const doFetch = async (bearer: string) =>
    await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

  let res = await doFetch(token);

  if (res.status === 401) {
    token = await refreshAccessToken(cfg);
    res = await doFetch(token);
  }

  // Bling limits 3 requests/second and 120k/day
  let attempts = 0;
  while (res.status === 429 && attempts < 3) {
    attempts++;
    await sleep(1000 * attempts);
    res = await doFetch(token);
  }

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

export function blingError(status: number, data: any): string {
  const d = data?.error;
  if (d?.description) return `[${status}] ${d.description}`;
  if (d?.message) return `[${status}] ${d.message}`;
  return `[${status}] ${JSON.stringify(data).slice(0, 500)}`;
}
