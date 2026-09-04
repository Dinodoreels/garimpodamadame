import { getSupabaseAdmin, getAuthBase, logSync, corsHeaders } from "../_shared/tiktok.ts";

// TikTok redirects user back here with ?code=...&state=...&app_key=...
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const html = (title: string, body: string, ok = true) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:-apple-system,system-ui,sans-serif;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}div{max-width:480px}h1{color:${ok ? "#22c55e" : "#ef4444"};margin:0 0 12px}p{color:#a3a3a3;line-height:1.5}</style></head><body><div><h1>${title}</h1><p>${body}</p><p style="margin-top:24px;font-size:14px">Você pode fechar esta janela.</p></div></body></html>`;

  try {
    if (!code) throw new Error("Código de autorização ausente.");
    const admin = getSupabaseAdmin();
    const { data: cfg } = await admin.from("tiktok_shop_config").select("*").limit(1).maybeSingle();
    if (!cfg) throw new Error("Configuração não encontrada.");
    if (!cfg.app_key || !cfg.app_secret) throw new Error("Credenciais não configuradas.");
    if (state && cfg.oauth_state && state !== cfg.oauth_state) throw new Error("State inválido.");

    // Exchange code for token
    const tokenUrl = `${getAuthBase()}/api/v2/token/get?app_key=${encodeURIComponent(cfg.app_key)}&app_secret=${encodeURIComponent(cfg.app_secret)}&auth_code=${encodeURIComponent(code)}&grant_type=authorized_code`;
    const res = await fetch(tokenUrl);
    const data = await res.json();

    await logSync({
      entity_type: "oauth",
      action: "exchange_code",
      status: data?.code === 0 ? "success" : "error",
      response: data,
    });

    if (data?.code !== 0 || !data?.data?.access_token) {
      throw new Error(data?.message || "Falha ao trocar código por token.");
    }

    const d = data.data;
    const now = Date.now();
    await admin
      .from("tiktok_shop_config")
      .update({
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        token_expires_at: new Date(now + (d.access_token_expire_in ?? 0) * 1000).toISOString(),
        refresh_expires_at: new Date(now + (d.refresh_token_expire_in ?? 0) * 1000).toISOString(),
        is_active: true,
        oauth_state: null,
        shop_id: d.open_id ?? cfg.shop_id,
      })
      .eq("id", cfg.id);

    return new Response(html("Conectado!", "TikTok Shop foi autorizado com sucesso."), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(html("Falha na conexão", msg, false), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});