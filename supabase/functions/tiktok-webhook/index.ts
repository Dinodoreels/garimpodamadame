// TikTok Shop webhook receiver — handles ORDER_STATUS_CHANGE and other events.
// Public endpoint. TikTok signs payloads with your app_secret.
import { corsHeaders, getSupabaseAdmin, getConfig, callTikTok, logSync } from "../_shared/tiktok.ts";

async function verifySignature(rawBody: string, signature: string, appSecret: string, timestamp: string): Promise<boolean> {
  // TikTok uses HMAC-SHA256(secret + timestamp + body) hex
  const message = `${timestamp}${rawBody}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const raw = await req.text();
    const signature = req.headers.get("authorization") ?? req.headers.get("x-tts-signature") ?? "";
    const timestamp = req.headers.get("x-tts-timestamp") ?? "";

    const cfg = await getConfig();
    if (cfg?.app_secret && signature && timestamp) {
      const ok = await verifySignature(raw, signature, cfg.app_secret, timestamp);
      if (!ok) {
        await logSync({ entity_type: "webhook", action: "receive", status: "error", error_message: "Invalid signature" });
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const payload = JSON.parse(raw);
    const type = payload.type ?? payload.event ?? "unknown";
    await logSync({ entity_type: "webhook", action: type, status: "received", payload });

    // Trigger order pull for ORDER_STATUS_CHANGE (type=1 per TikTok docs)
    if (type === 1 || type === "ORDER_STATUS_CHANGE") {
      // Fire-and-forget call to pull-orders
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/tiktok-pull-orders`;
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": Deno.env.get("SUPABASE_ANON_KEY")! },
        body: "{}",
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("tiktok-webhook error", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});