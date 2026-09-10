import { callBling, corsHeaders, getCallbackUrl, getConfig, getSupabaseAdmin, logSync, requestToken } from "../_shared/bling.ts";

// The edge gateway rewrites every response body's Content-Type to text/plain,
// so an inline HTML page would be shown as raw source. Redirect back to the
// admin panel instead and let the app render the result.
function backToPanel(origin: string | null | undefined, status: "ok" | "error", message?: string) {
  const base = origin && /^https?:\/\//.test(origin) ? origin : null;
  const params = new URLSearchParams({ bling: status });
  if (message) params.set("bling_msg", message);

  if (!base) {
    // No known app origin: fall back to a plain-text message the browser can read.
    return new Response(
      status === "ok"
        ? "Bling conectado com sucesso. Feche esta janela e volte ao painel."
        : `Nao foi possivel conectar: ${message ?? "erro desconhecido"}`,
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: `${base}/admin/settings?${params}` },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let origin: string | null = null;
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const cfg = await getConfig();
    origin = cfg?.redirect_origin ?? null;

    if (!code) return backToPanel(origin, "error", "O Bling não retornou o código de autorização.");
    if (!cfg?.client_id || !cfg?.client_secret) {
      return backToPanel(origin, "error", "Cadastre o Client ID e o Client Secret antes de conectar.");
    }
    if (cfg.oauth_state && state && cfg.oauth_state !== state) {
      return backToPanel(origin, "error", "A verificação de segurança falhou. Tente conectar novamente.");
    }

    const { status, data } = await requestToken(
      { client_id: cfg.client_id, client_secret: cfg.client_secret },
      { grant_type: "authorization_code", code, redirect_uri: getCallbackUrl() },
    );
    if (status !== 200 || !data?.access_token) {
      await logSync({ entity_type: "oauth", action: "callback", status: "error", response: data, error_message: `HTTP ${status}` });
      return backToPanel(origin, "error", `O Bling recusou a autorização (${status}). Confira o Client ID, o Client Secret e a URL de retorno.`);
    }

    const supa = getSupabaseAdmin();
    await supa.from("bling_config").update({
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? null,
      token_expires_at: new Date(Date.now() + (data.expires_in ?? 21600) * 1000).toISOString(),
      is_active: true,
      oauth_state: null,
      last_error: null,
    }).eq("id", cfg.id);

    // Try to read the company name for display
    try {
      const fresh = await getConfig();
      const me = await callBling({ path: "/empresas/me/dados-basicos", config: fresh! });
      const name = me.data?.data?.nome ?? me.data?.data?.fantasia ?? null;
      if (name) await supa.from("bling_config").update({ company_name: name }).eq("id", cfg.id);
    } catch (_) { /* optional */ }

    await logSync({ entity_type: "oauth", action: "callback", status: "success" });
    return backToPanel(origin, "ok");
  } catch (e) {
    return backToPanel(origin, "error", e instanceof Error ? e.message : String(e));
  }
});
