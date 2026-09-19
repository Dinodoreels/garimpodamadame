// Matches store variants with products already registered in Bling, using the SKU.
import { assertAdmin, blingError, callBling, corsHeaders, getSupabaseAdmin, jsonResponse, logSync } from "../_shared/bling.ts";
import { pushStockToBling } from "../_shared/bling-product-sync.ts";
import { getConfig } from "../_shared/bling.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const supa = getSupabaseAdmin();
    const cfg = await getConfig();

    // Load every Bling product (paginated)
    const blingBySku = new Map<string, { id: string; nome: string; preco: number }>();
    for (let page = 1; page <= 20; page++) {
      const { status, data } = await callBling({ path: "/produtos", query: { pagina: page, limite: 100 } });
      if (status >= 400) return jsonResponse({ error: blingError(status, data) }, status);
      const rows = data?.data ?? [];
      for (const p of rows) {
        if (p?.codigo) blingBySku.set(String(p.codigo).trim().toUpperCase(), { id: String(p.id), nome: p.nome, preco: Number(p.preco ?? 0) });
      }
      if (rows.length < 100) break;
    }

    const { data: variants } = await supa
      .from("product_variants")
      .select("id, product_id, sku, inventory_quantity, price")
      .not("sku", "is", null);

    let linked = 0;
    const unmatched: string[] = [];
    for (const v of variants ?? []) {
      const key = String(v.sku ?? "").trim().toUpperCase();
      if (!key) continue;
      const match = blingBySku.get(key);
      if (!match) {
        unmatched.push(v.sku as string);
        continue;
      }
      const { data: existingLink } = await supa.from("bling_product_links")
        .select("id")
        .eq("bling_product_id", match.id)
        .maybeSingle();
      const linkData = {
        product_id: v.product_id,
        variant_id: v.id,
        bling_product_id: match.id,
        bling_sku: v.sku,
        status: "synced",
        last_pulled_at: new Date().toISOString(),
        last_error: null,
      };
      const { error: linkError } = existingLink
        ? await supa.from("bling_product_links").update(linkData).eq("id", existingLink.id)
        : await supa.from("bling_product_links").insert(linkData);
      if (linkError) throw linkError;
      if (cfg?.sync_stock && cfg.stock_authority === "store" && cfg.deposito_id) {
        await pushStockToBling(
          match.id,
          Number(v.inventory_quantity ?? 0),
          cfg.sync_prices && cfg.price_authority === "store" ? Number(v.price ?? 0) : undefined,
        );
      }
      linked++;
    }

    await logSync({ entity_type: "product", action: "link", status: "success", response: { linked, unmatched: unmatched.length } });
    return jsonResponse({ linked, bling_products: blingBySku.size, unmatched: unmatched.slice(0, 50), unmatched_count: unmatched.length });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
