import { callBling, corsHeaders, getCallbackUrl, getConfig, getSupabaseAdmin, logSync, requestToken } from "../_shared/bling.ts";

function html(title: string, message: string, ok: boolean) {
  return new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;background:#0b0b0d;color:#f5f5f5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
    .card{max-width:420px;text-align:center;padding:32px;border:1px solid #2a2a2e;border-radius:16px}
    h1{font-size:20px;margin:0 0 12px}p{color:#a1a1aa;line-height:1.5}</style></head>
    <body><div class="card"><h1>${ok ? "✅" : "⚠️"} ${title}</h1><p>${message}</p>
    <p>Você já pode fechar esta janela e voltar ao painel.</p></div>
    <script>setTimeout(()=>{try{window.close()}catch(e){}},2500)</script></body></html>`,
    { status: ok ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code) return html("Conexão cancelada", "O Bling não retornou o código de autorização.", false);

    const cfg = await getConfig();
    if (!cfg?.client_id || !cfg?.client_secret) {
      return html("Configuração incompleta", "Cadastre o Client ID e o Client Secret no painel antes de conectar.", false);
    }
    if (cfg.oauth_state && state && cfg.oauth_state !== state) {
      return html("Conexão inválida", "A verificação de segurança falhou. Tente conectar novamente pelo painel.", false);
    }

    const { status, data } = await requestToken(
      { client_id: cfg.client_id, client_secret: cfg.client_secret },
      { grant_type: "authorization_code", code, redirect_uri: getCallbackUrl() },
    );
    if (status !== 200 || !data?.access_token) {
      await logSync({ entity_type: "oauth", action: "callback", status: "error", response: data, error_message: `HTTP ${status}` });
      return html("Não foi possível conectar", `O Bling recusou a autorização (${status}). Verifique o Client ID, o Client Secret e a URL de retorno cadastrada no aplicativo.`, false);
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
    return html("Bling conectado", "A conexão foi concluída com sucesso.", true);
  } catch (e) {
    return html("Erro inesperado", e instanceof Error ? e.message : String(e), false);
  }
});
