import { assertAdmin, blingError, callBling, corsHeaders, getCallbackUrl, getConfig, getSupabaseAdmin, jsonResponse, logSync } from "../_shared/bling.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const cfg = await getConfig();
    if (!cfg?.client_id || !cfg?.client_secret) {
      return jsonResponse({ ok: false, error: "Cadastre o Client ID e o Client Secret do aplicativo Bling.", callback_url: getCallbackUrl() }, 400);
    }
    if (!cfg.refresh_token) {
      return jsonResponse({ ok: false, error: "Ainda não conectado. Clique em Conectar com o Bling.", callback_url: getCallbackUrl() }, 400);
    }

    const { status, data } = await callBling({ path: "/produtos", query: { limite: 1 }, config: cfg });
    if (status >= 400) {
      const err = blingError(status, data);
      await logSync({ entity_type: "connection", action: "test", status: "error", error_message: err });
      return jsonResponse({ ok: false, error: err }, status);
    }
    await getSupabaseAdmin()
      .from("bling_config")
      .update({ last_error: null, is_active: true })
      .eq("id", cfg.id);
    await logSync({ entity_type: "connection", action: "test", status: "success" });
    return jsonResponse({ ok: true, company: cfg.company_name, sample_count: data?.data?.length ?? 0, callback_url: getCallbackUrl() });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
