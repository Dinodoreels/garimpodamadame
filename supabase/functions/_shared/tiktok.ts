// Shared TikTok Shop API helper
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto as stdCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const TIKTOK_BASE = "https://open-api.tiktokglobalshop.com";
const AUTH_BASE = "https://auth.tiktok-shops.com";

export function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function getConfig() {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from("tiktok_shop_config")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Sign a TikTok Shop request.
 * Concatenation: appSecret + path + sorted(params except sign & access_token) + body + appSecret
 */
export async function signRequest(opts: {
  appSecret: string;
  path: string;
  params: Record<string, string>;
  body?: string;
}): Promise<string> {
  const { appSecret, path, params, body } = opts;
  const filtered = Object.entries(params)
    .filter(([k]) => k !== "sign" && k !== "access_token")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}${v}`)
    .join("");
  const base = `${appSecret}${path}${filtered}${body ?? ""}${appSecret}`;
  return await hmacSha256Hex(appSecret, base);
}

export async function callTikTok(opts: {
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string>;
  body?: unknown;
  useAccessToken?: boolean;
}): Promise<{ status: number; data: any }> {
  const cfg = await getConfig();
  if (!cfg?.app_key || !cfg?.app_secret) {
    throw new Error("TikTok app_key/app_secret not configured");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params: Record<string, string> = {
    app_key: cfg.app_key,
    timestamp,
    ...(opts.query ?? {}),
  };
  if (opts.useAccessToken !== false && cfg.shop_cipher) {
    params.shop_cipher = cfg.shop_cipher;
  }
  const bodyStr = opts.body ? JSON.stringify(opts.body) : "";
  const sign = await signRequest({
    appSecret: cfg.app_secret,
    path: opts.path,
    params,
    body: bodyStr,
  });
  params.sign = sign;

  const qs = new URLSearchParams(params).toString();
  const url = `${TIKTOK_BASE}${opts.path}?${qs}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.useAccessToken !== false && cfg.access_token) {
    headers["x-tts-access-token"] = cfg.access_token;
  }
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: bodyStr || undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json };
}

export async function logSync(entry: {
  entity_type: string;
  entity_id?: string;
  action: string;
  status: string;
  payload?: unknown;
  response?: unknown;
  error_message?: string;
}) {
  const supa = getSupabaseAdmin();
  await supa.from("tiktok_sync_log").insert({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id ?? null,
    action: entry.action,
    status: entry.status,
    payload: entry.payload ?? null,
    response: entry.response ?? null,
    error_message: entry.error_message ?? null,
  });
}

export function getAuthBase() {
  return AUTH_BASE;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function getCallbackUrl() {
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/tiktok-oauth-callback`;
}

/**
 * Verify the caller is an authenticated admin. Returns user id or throws.
 */
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

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}