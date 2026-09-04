import { callTikTok, getConfig, getSupabaseAdmin, logSync } from "./tiktok.ts";

async function uploadImage(imageUrl: string): Promise<string> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Falha ao baixar imagem: ${imageUrl}`);
  const blob = await imgRes.blob();
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  const b64 = btoa(binary);
  const { status, data } = await callTikTok({
    path: "/product/202309/images/upload",
    method: "POST",
    body: { data: b64, use_case: "MAIN_IMAGE" },
  });
  if (status !== 200 || data?.code) throw new Error(`Upload de imagem falhou: ${data?.message ?? status}`);
  return data?.data?.uri as string;
}

export async function syncProductToTikTok(productId: string) {
  const supa = getSupabaseAdmin();
  const cfg = await getConfig();
  if (!cfg?.is_active || !cfg?.access_token) throw new Error("Integração TikTok não conectada");
  if (!cfg.warehouse_id) throw new Error("Configure o Warehouse padrão antes de sincronizar");

  const { data: product, error: pErr } = await supa
    .from("products")
    .select("*, product_variants(*), product_images(url, position)")
    .eq("id", productId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!product) throw new Error("Produto não encontrado");
  if (!product.product_type) throw new Error("Produto sem categoria");

  const { data: cat } = await supa
    .from("product_categories")
    .select("id")
    .eq("value", product.product_type)
    .maybeSingle();
  if (!cat) throw new Error(`Categoria local '${product.product_type}' não cadastrada`);
  const { data: mapping } = await supa
    .from("tiktok_category_map")
    .select("tiktok_category_id")
    .eq("local_category_id", cat.id)
    .maybeSingle();
  if (!mapping) throw new Error("Categoria do TikTok não mapeada para esta categoria");

  const variants = (product.product_variants ?? []).filter((v: any) => v.is_available);
  if (variants.length === 0) throw new Error("Produto sem variantes disponíveis");
  const missingSku = variants.filter((v: any) => !v.sku || !v.sku.trim());
  if (missingSku.length) throw new Error(`Variantes sem SKU: ${missingSku.map((v: any) => v.title).join(", ")}`);

  const { data: existingLink } = await supa
    .from("tiktok_product_links")
    .select("*")
    .eq("product_id", productId)
    .is("variant_id", null)
    .maybeSingle();

  const imageCache: Record<string, string> = (existingLink?.image_cache as any) ?? {};
  const images = (product.product_images ?? []).sort((a: any, b: any) => a.position - b.position);
  if (images.length === 0) throw new Error("Produto precisa ter ao menos 1 imagem");

  const imageUris: string[] = [];
  for (const img of images) {
    if (imageCache[img.url]) imageUris.push(imageCache[img.url]);
    else {
      const uri = await uploadImage(img.url);
      imageCache[img.url] = uri;
      imageUris.push(uri);
    }
  }

  const skusPayload = variants.map((v: any) => {
    const salesAttributes: any[] = [];
    [v.option1, v.option2].forEach((opt, idx) => {
      if (opt) salesAttributes.push({ name: idx === 0 ? "Variação 1" : "Variação 2", value_name: opt });
    });
    return {
      seller_sku: v.sku,
      price: { amount: String(Number(v.price).toFixed(2)), currency: "BRL" },
      inventory: [{ warehouse_id: cfg.warehouse_id, quantity: Math.max(0, v.inventory_quantity || 0) }],
      sales_attributes: salesAttributes.length ? salesAttributes : undefined,
    };
  });

  const productPayload: any = {
    title: String(product.title).slice(0, 255),
    description: product.description || product.title,
    category_id: mapping.tiktok_category_id,
    main_images: imageUris.slice(0, 9).map((uri) => ({ uri })),
    package_weight: { value: String(((product.weight_grams || 300) / 1000).toFixed(3)), unit: "KILOGRAM" },
    package_dimensions: {
      length: String(product.length_cm || 20),
      width: String(product.width_cm || 15),
      height: String(product.height_cm || 10),
      unit: "CENTIMETER",
    },
    skus: skusPayload,
  };

  const isUpdate = !!existingLink?.tiktok_product_id;
  const path = isUpdate
    ? `/product/202309/products/${existingLink.tiktok_product_id}`
    : "/product/202309/products";

  const { status, data } = await callTikTok({
    path,
    method: isUpdate ? "PUT" : "POST",
    body: productPayload,
  });

  if (status !== 200 || data?.code) {
    const errMsg = data?.message ?? `HTTP ${status}`;
    await supa.from("tiktok_product_links").upsert(
      { product_id: productId, variant_id: null, status: "error", last_error: errMsg, image_cache: imageCache },
      { onConflict: "product_id,variant_id" },
    );
    await logSync({
      entity_type: "product",
      entity_id: productId,
      action: isUpdate ? "update" : "create",
      status: "error",
      payload: productPayload,
      response: data,
      error_message: errMsg,
    });
    throw new Error(errMsg);
  }

  const ttProductId = data?.data?.product_id ?? existingLink?.tiktok_product_id;
  const ttStatus = data?.data?.audit_status ?? data?.data?.status ?? "PENDING";

  await supa.from("tiktok_product_links").upsert(
    {
      product_id: productId,
      variant_id: null,
      tiktok_product_id: ttProductId,
      tiktok_status: ttStatus,
      status: "synced",
      last_pushed_at: new Date().toISOString(),
      last_error: null,
      image_cache: imageCache,
    },
    { onConflict: "product_id,variant_id" },
  );

  await logSync({
    entity_type: "product",
    entity_id: productId,
    action: isUpdate ? "update" : "create",
    status: "success",
    payload: productPayload,
    response: data,
  });

  return { tiktok_product_id: ttProductId, status: ttStatus };
}