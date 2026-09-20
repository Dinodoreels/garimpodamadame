import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, getCallbackUrl } from "../_shared/tiktok.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Verify caller is admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleData) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: cfg } = await admin.from("tiktok_shop_config").select("id, app_key, service_id").limit(1).maybeSingle();
    if (!cfg?.app_key || !cfg?.service_id) {
      return new Response(JSON.stringify({ error: "Service ID e App Key não configurados. Salve os três códigos primeiro." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const state = crypto.randomUUID();
    await admin.from("tiktok_shop_config").update({ oauth_state: state }).eq("id", cfg.id);

    const callbackUrl = getCallbackUrl();
    const authorizeUrl = `https://services.tiktokshop.com/open/authorize?service_id=${encodeURIComponent(cfg.service_id)}&state=${encodeURIComponent(state)}&app_key=${encodeURIComponent(cfg.app_key)}`;

    return new Response(JSON.stringify({ authorizeUrl, callbackUrl, state }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});