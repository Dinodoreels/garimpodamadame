// Pulls orders from TikTok Shop and imports them as internal orders.
// Cron-triggered every 5 minutes.
import { corsHeaders, getSupabaseAdmin, getConfig, callTikTok, logSync } from "../_shared/tiktok.ts";
import { applyOrderStock } from "../_shared/order-stock.ts";

function mapStatus(s: string): { status: string; paid?: boolean; shipped?: boolean; delivered?: boolean; cancelled?: boolean } {
  switch (s) {
    case "UNPAID": return { status: "pending" };
    case "AWAITING_SHIPMENT":
    case "ON_HOLD":
    case "PARTIALLY_SHIPPING":
      return { status: "processing", paid: true };
    case "AWAITING_COLLECTION":
    case "IN_TRANSIT":
      return { status: "shipped", paid: true, shipped: true };
    case "DELIVERED":
    case "COMPLETED":
      return { status: "delivered", paid: true, shipped: true, delivered: true };
    case "CANCELLED":
      return { status: "cancelled", cancelled: true };
    default:
      return { status: "pending" };
  }
}

async function findVariantBySku(supa: ReturnType<typeof getSupabaseAdmin>, sellerSku: string | null, tiktokSkuId: string | null) {
  // First try by tiktok_sku_id via product links
  if (tiktokSkuId) {
    const { data: link } = await supa
      .from("tiktok_product_links")
      .select("product_id, variant_id")
      .eq("tiktok_sku_id", tiktokSkuId)
      .maybeSingle();
    if (link?.variant_id) {
      const { data: v } = await supa.from("product_variants").select("id, product_id, title, price, inventory_quantity").eq("id", link.variant_id).maybeSingle();
      if (v) return v;
    }
  }
  if (sellerSku) {
    const { data: v } = await supa.from("product_variants").select("id, product_id, title, price, inventory_quantity").eq("sku", sellerSku).maybeSingle();
    if (v) return v;
  }
  return null;
}

async function importOrder(tkOrder: any) {
  const supa = getSupabaseAdmin();
  const tiktokOrderId = String(tkOrder.id);

  // Check if already imported
  const { data: existing } = await supa
    .from("tiktok_order_links")
    .select("id, order_id, tiktok_status")
    .eq("tiktok_order_id", tiktokOrderId)
    .maybeSingle();

  const mapped = mapStatus(tkOrder.status);

  if (existing?.order_id) {
    // Update status only
    if (existing.tiktok_status !== tkOrder.status) {
      const updates: any = { status: mapped.status, updated_at: new Date().toISOString() };
      if (mapped.paid && !tkOrder.paid_already) updates.paid_at = new Date(((tkOrder.paid_time ?? Math.floor(Date.now() / 1000))) * 1000).toISOString();
      if (mapped.shipped) updates.shipped_at = new Date().toISOString();
      if (mapped.delivered) updates.delivered_at = new Date().toISOString();
      if (tkOrder.tracking_number) {
        updates.tracking_code = tkOrder.tracking_number;
      }
      await supa.from("orders").update(updates).eq("id", existing.order_id);
      await supa.from("tiktok_order_links").update({
        tiktok_status: tkOrder.status,
        last_synced_at: new Date().toISOString(),
        raw_payload: tkOrder,
      }).eq("id", existing.id);
    }
    const stock = await applyOrderStock(supa, existing.order_id, "tiktok:direct");
    await logSync({ entity_type: "order", entity_id: tiktokOrderId, action: "stock_transition", status: stock.blocked ? "blocked" : "success", response: stock, error_message: stock.blocked ? "Estoque do pedido requer revisão administrativa" : undefined });
    return { skipped: true };
  }

  const directExternalKey = `marketplace:tiktok-shop:${tiktokOrderId}`;
  const { data: sharedOrder } = await supa
    .from("orders")
    .select("id")
    .eq("external_order_key", directExternalKey)
    .maybeSingle();
  if (sharedOrder?.id) {
    await supa.from("orders").update({ status: mapped.status }).eq("id", sharedOrder.id);
    await supa.from("tiktok_order_links").upsert({
      order_id: sharedOrder.id,
      tiktok_order_id: tiktokOrderId,
      tiktok_status: tkOrder.status,
      last_synced_at: new Date().toISOString(),
      raw_payload: tkOrder,
    }, { onConflict: "tiktok_order_id" });
    const stock = await applyOrderStock(supa, sharedOrder.id, "tiktok:direct");
    await logSync({ entity_type: "order", entity_id: tiktokOrderId, action: "deduplicate", status: "success", response: { order_id: sharedOrder.id, stock } });
    return { skipped: true, order_id: sharedOrder.id };
  }

  // New order — build items
  const lineItems: any[] = tkOrder.line_items ?? [];
  if (lineItems.length === 0) {
    await logSync({ entity_type: "order", entity_id: tiktokOrderId, action: "import", status: "skipped", error_message: "No line items" });
    return { skipped: true };
  }

  const itemsToInsert: any[] = [];
  let subtotal = 0;
  for (const li of lineItems) {
    const variant = await findVariantBySku(supa, li.seller_sku ?? null, li.sku_id ?? null);
    const qty = 1; // TikTok line items are 1 per row
    const unit = parseFloat(li.original_price ?? li.sale_price ?? "0");
    subtotal += unit * qty;
    itemsToInsert.push({
      product_id: variant?.product_id ?? null,
      variant_id: variant?.id ?? null,
      product_title: li.product_name ?? "Produto TikTok",
      variant_title: li.sku_name ?? variant?.title ?? null,
      unit_price: unit,
      quantity: qty,
      total_price: unit * qty,
      shopify_product_id: String(li.product_id ?? ""),
      shopify_variant_id: String(li.sku_id ?? ""),
    });
  }

  const shippingCost = parseFloat(tkOrder.payment?.shipping_fee ?? "0");
  const total = parseFloat(tkOrder.payment?.total_amount ?? String(subtotal + shippingCost));

  const recipient = tkOrder.recipient_address ?? {};
  const shippingAddress = {
    recipient_name: recipient.name ?? "",
    phone: recipient.phone ?? "",
    street: recipient.address_line1 ?? recipient.full_address ?? "",
    number: recipient.address_line2 ?? "",
    neighborhood: recipient.district_info?.[0]?.address_name ?? "",
    city: recipient.district_info?.find((d: any) => d.address_level_name === "City")?.address_name ?? "",
    state: recipient.district_info?.find((d: any) => d.address_level_name === "State")?.address_name ?? "",
    zip_code: recipient.postal_code ?? "",
    country: "BR",
  };

  const orderNumber = `TT${tiktokOrderId.slice(-10)}`;
  const insertPayload: any = {
    order_number: orderNumber,
    user_id: null,
    status: mapped.status,
    subtotal,
    shipping_cost: shippingCost,
    total,
    shipping_address: shippingAddress,
    source: "tiktok",
    payment_method: "tiktok_shop",
    guest_info: { name: recipient.name ?? "", phone: recipient.phone ?? "", email: tkOrder.buyer_email ?? null },
    external_order_key: directExternalKey,
    stock_accounting_started_at: new Date().toISOString(),
  };
  if (mapped.paid) insertPayload.paid_at = new Date((tkOrder.paid_time ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
  if (mapped.shipped) insertPayload.shipped_at = new Date().toISOString();
  if (mapped.delivered) insertPayload.delivered_at = new Date().toISOString();
  if (tkOrder.tracking_number) insertPayload.tracking_code = tkOrder.tracking_number;

  const { data: order, error: orderErr } = await supa.from("orders").insert(insertPayload).select("id").single();
  if (orderErr) {
    await logSync({ entity_type: "order", entity_id: tiktokOrderId, action: "import", status: "error", error_message: orderErr.message });
    return { error: orderErr.message };
  }

  // Insert items
  const itemsPayload = itemsToInsert.map((it) => ({ ...it, order_id: order.id }));
  const { error: itemsErr } = await supa.from("order_items").insert(itemsPayload);
  if (itemsErr) {
    await logSync({ entity_type: "order", entity_id: tiktokOrderId, action: "import", status: "error", error_message: itemsErr.message });
    return { error: itemsErr.message };
  }

  const stock = await applyOrderStock(supa, order.id, "tiktok:direct");

  await supa.from("tiktok_order_links").insert({
    order_id: order.id,
    tiktok_order_id: tiktokOrderId,
    tiktok_status: tkOrder.status,
    last_synced_at: new Date().toISOString(),
    raw_payload: tkOrder,
  });

  await logSync({ entity_type: "order", entity_id: tiktokOrderId, action: "stock_transition", status: stock.blocked ? "blocked" : "success", response: stock, error_message: stock.blocked ? "Estoque do pedido requer revisão administrativa" : undefined });
  await logSync({ entity_type: "order", entity_id: tiktokOrderId, action: "import", status: "success", payload: { order_id: order.id, total } });
  return { imported: true, order_id: order.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cfg = await getConfig();
    if (!cfg?.is_active || !cfg?.auto_sync_orders) {
      return new Response(JSON.stringify({ skipped: "disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supa = getSupabaseAdmin();
    // Pull orders updated since last_order_pull_at (or last 24h on first run)
    const since = cfg.last_order_pull_at
      ? Math.floor(new Date(cfg.last_order_pull_at).getTime() / 1000) - 60
      : Math.floor(Date.now() / 1000) - 86400;
    const until = Math.floor(Date.now() / 1000);

    let pageToken = "";
    let imported = 0;
    let updated = 0;
    let pages = 0;

    do {
      const resp = await callTikTok({
        path: "/order/202309/orders/search",
        method: "POST",
        query: {
          page_size: "50",
          ...(pageToken ? { page_token: pageToken } : {}),
        },
        body: {
          update_time_ge: since,
          update_time_lt: until,
          order_status: "",
        },
      });
      pages += 1;
      if (resp.status >= 400 || resp.data?.code !== 0) {
        await logSync({ entity_type: "order", action: "pull", status: "error", error_message: JSON.stringify(resp.data) });
        break;
      }
      const list = resp.data?.data?.orders ?? [];
      for (const o of list) {
        const r = await importOrder(o);
        if (r.imported) imported += 1;
        else if (r.skipped === false) updated += 1;
      }
      pageToken = resp.data?.data?.next_page_token ?? "";
      if (pages > 20) break; // safety
    } while (pageToken);

    await supa.from("tiktok_shop_config").update({ last_order_pull_at: new Date().toISOString() }).eq("id", cfg.id);

    return new Response(JSON.stringify({ ok: true, imported, updated, pages }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("tiktok-pull-orders error", e);
    await logSync({ entity_type: "order", action: "pull", status: "error", error_message: e.message }).catch(() => {});
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});