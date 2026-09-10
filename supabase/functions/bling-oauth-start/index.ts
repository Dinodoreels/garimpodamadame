import { assertAdmin, BLING_AUTH, corsHeaders, getCallbackUrl, getConfig, getSupabaseAdmin, jsonResponse } from "../_shared/bling.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const cfg = await getConfig();
    if (!cfg?.client_id || !cfg?.client_secret) {
      return jsonResponse({ error: "Informe o Client ID e o Client Secret do aplicativo Bling antes de conectar." }, 400);
    }

    const state = crypto.randomUUID();
    // Remember where to send the user back to after the Bling authorization.
    const origin = req.headers.get("origin");
    const redirect_origin = origin && /^https?:\/\//.test(origin) ? origin : cfg.redirect_origin ?? null;
    await getSupabaseAdmin()
      .from("bling_config")
      .update({ oauth_state: state, redirect_origin })
      .eq("id", cfg.id);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: cfg.client_id,
      state,
      redirect_uri: getCallbackUrl(),
    });
    return jsonResponse({ url: `${BLING_AUTH}?${params}`, callback_url: getCallbackUrl() });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
