// Push a store product (and its variants) to Bling as one product per SKU.
import { blingError, callBling, getConfig, getSupabaseAdmin, logSync } from "./bling.ts";
import { fetchBlingStock } from "./bling-import.ts";
import { ensureBlingProductCategory } from "./bling-categories.ts";

interface SyncUnit {
  variantId: string | null;
  sku: string;
  name: string;
  price: number;
  cost: number | null;
  quantity: number;
  images: string[];
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  description: string | null;
  brand: string | null;
  gtin: string | null;
  ncm: string | null;
  cest: string | null;
  fiscalOrigin: number | null;
  condition: string;
  warrantyMonths: number | null;
  categoryId: string | null;
}

function slugSku(base: string, suffix: string | null) {
  const clean = base.replace(/[^a-zA-Z0-9-_]/g, "").toUpperCase().slice(0, 20) || "PROD";
  return suffix ? `${clean}-${suffix}` : clean;
}

const normalizeSku = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

async function findBlingProductBySku(sku: string): Promise<string | null> {
  const { status, data } = await callBling({ path: "/produtos", query: { codigo: sku, limite: 1 } });
  if (status >= 400) return null;
  const normalized = normalizeSku(sku);
  const found = (data?.data ?? []).find((p: any) => normalizeSku(String(p.codigo ?? '')) === normalized);
  return found ? String(found.id) : null;
}

function buildPayload(u: SyncUnit) {
  return {
    nome: u.name.slice(0, 120),
    codigo: u.sku,
    preco: Number(u.price.toFixed(2)),
    tipo: "P",
    situacao: "A",
    formato: "S",
    unidade: "UN",
    ...(u.cost != null ? { precoCusto: Number(u.cost.toFixed(2)) } : {}),
    descricaoCurta: (u.description ?? u.name).slice(0, 500),
    marca: u.brand ? u.brand.slice(0, 80) : undefined,
    gtin: u.gtin || undefined,
    tributacao: (u.ncm || u.cest || u.fiscalOrigin != null)
      ? {
        ncm: u.ncm || undefined,
        cest: u.cest || undefined,
        origem: u.fiscalOrigin ?? undefined,
      }
      : undefined,
    condicao: u.condition === "used" ? 1 : 0,
    garantia: u.warrantyMonths != null ? u.warrantyMonths : undefined,
    categoria: u.categoryId ? { id: Number(u.categoryId) } : undefined,
    pesoLiquido: u.weightGrams ? u.weightGrams / 1000 : undefined,
    pesoBruto: u.weightGrams ? u.weightGrams / 1000 : undefined,
    dimensoes: (u.lengthCm || u.widthCm || u.heightCm)
      ? {
        largura: u.widthCm ?? 0,
        altura: u.heightCm ?? 0,
        profundidade: u.lengthCm ?? 0,
        unidadeMedida: 1,
      }
      : undefined,
    midia: u.images.length
      ? { imagens: { imagensURL: u.images.slice(0, 5).map((url) => ({ link: url })) } }
      : undefined,
  };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function remoteImageCount(remote: any) {
  const images = remote?.midia?.imagens ?? {};
  return [images.externas, images.internas, images.imagensURL]
    .reduce((total, entries) => total + (Array.isArray(entries) ? entries.length : 0), 0);
}

async function confirmBlingProduct(blingProductId: string, expectedCost: number | null, expectedImages: number) {
  let remote: any = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await delay(2000);
    const { status, data } = await callBling({ path: `/produtos/${blingProductId}` });
    if (status >= 400) throw new Error(blingError(status, data));
    remote = data?.data ?? data;
    if (expectedImages === 0 || remoteImageCount(remote) > 0) break;
  }
  const confirmedCost = remote?.precoCusto == null ? null : Number(remote.precoCusto);
  const costWarning = expectedCost != null && (
    confirmedCost == null ||
    !Number.isFinite(confirmedCost) ||
    Math.abs(confirmedCost - expectedCost) > 0.009
  )
    ? `O Bling recebeu o produto, mas retornou custo ${confirmedCost ?? "não informado"}.`
    : null;
  const confirmedImages = remoteImageCount(remote);
  const imageWarning = expectedImages > 0 && confirmedImages === 0
    ? `O Bling recebeu ${expectedImages} foto(s), mas não gravou nenhuma no produto.`
    : null;
  return { confirmedCost, confirmedImages, remote, costWarning, imageWarning };
}

export async function pushStockToBling(blingProductId: string, quantity: number, price?: number) {
  const cfg = await getConfig();
  if (!cfg?.deposito_id) {
    throw new Error("Escolha um depósito padrão do Bling antes de sincronizar o estoque.");
  }
  const { status, data } = await callBling({
    path: "/estoques",
    method: "POST",
    body: {
      produto: { id: Number(blingProductId) },
      deposito: { id: Number(cfg.deposito_id) },
      operacao: "B",
      quantidade: Math.max(0, quantity),
      ...(price != null ? { preco: Number(price.toFixed(2)) } : {}),
    },
    config: cfg,
  });
  if (status >= 400) throw new Error(blingError(status, data));
  const confirmed = await fetchBlingStock([blingProductId], cfg.deposito_id);
  const confirmedQuantity = confirmed.get(String(blingProductId));
  if (confirmedQuantity != null && Math.max(0, Math.trunc(confirmedQuantity)) !== Math.max(0, Math.trunc(quantity))) {
    throw new Error(`O Bling recebeu a atualização, mas retornou saldo ${confirmedQuantity} no depósito selecionado.`);
  }
  return { data, confirmed_quantity: confirmedQuantity ?? null };
}

export async function syncProductToBling(productId: string) {
  const supa = getSupabaseAdmin();
  const cfg = await getConfig();
  if (!cfg?.is_active || !cfg?.refresh_token) throw new Error("Bling não está conectado.");

  const { data: product, error } = await supa
    .from("products")
    .select("*, product_variants(*), product_images(url, position)")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  if (!product) throw new Error("Produto não encontrado");

  let categoryId = product.marketplace_attributes?.bling_category_id
    ? String(product.marketplace_attributes.bling_category_id)
    : null;
  if (!categoryId && String(product.product_type ?? '').trim()) {
    const category = await ensureBlingProductCategory(String(product.product_type));
    categoryId = category.id;
    const marketplaceAttributes = product.marketplace_attributes && typeof product.marketplace_attributes === 'object'
      ? product.marketplace_attributes
      : {};
    const { error: categoryUpdateError } = await supa.from('products').update({
      marketplace_attributes: { ...marketplaceAttributes, bling_category_id: category.id },
    }).eq('id', productId);
    if (categoryUpdateError) throw categoryUpdateError;
  }

  const images = (product.product_images ?? [])
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    .map((i: any) => i.url);

  const variants = (product.product_variants ?? []) as any[];
  const units: SyncUnit[] = variants.length
    ? variants.map((v, idx) => ({
      variantId: v.id,
      sku: v.sku?.trim() || slugSku(product.handle, String(idx + 1)),
      name: variants.length > 1 && v.title && v.title !== "Default"
        ? `${product.title} - ${v.title}`
        : product.title,
      price: Number(v.price ?? product.price ?? 0),
      cost: v.cost != null ? Number(v.cost) : null,
      quantity: Number(v.inventory_quantity ?? 0),
      images,
      weightGrams: product.weight_grams,
      lengthCm: product.length_cm,
      widthCm: product.width_cm,
      heightCm: product.height_cm,
      description: product.description,
      brand: product.vendor ?? product.manufacturer,
      gtin: v.gtin,
      ncm: product.ncm,
      cest: product.cest,
      fiscalOrigin: product.fiscal_origin,
      condition: product.condition ?? "new",
      warrantyMonths: product.warranty_months,
      categoryId,
    }))
    : [{
      variantId: null,
      sku: slugSku(product.handle, null),
      name: product.title,
      price: Number(product.price ?? 0),
      cost: null,
      quantity: 0,
      images,
      weightGrams: product.weight_grams,
      lengthCm: product.length_cm,
      widthCm: product.width_cm,
      heightCm: product.height_cm,
      description: product.description,
      brand: product.vendor ?? product.manufacturer,
      gtin: null,
      ncm: product.ncm,
      cest: product.cest,
      fiscalOrigin: product.fiscal_origin,
      condition: product.condition ?? "new",
      warrantyMonths: product.warranty_months,
      categoryId,
    }];

  const results: any[] = [];

  for (const u of units) {
    let linksQuery = supa
      .from("bling_product_links")
      .select("*")
      .eq("product_id", productId);
    linksQuery = u.variantId
      ? linksQuery.eq("variant_id", u.variantId)
      : linksQuery.is("variant_id", null);
    const { data: existingLinks, error: linksError } = await linksQuery;
    if (linksError) throw linksError;

    const linkedIds = (existingLinks ?? [])
      .map((link: any) => String(link.bling_product_id ?? ''))
      .filter(Boolean);
    const matchedId = linkedIds.length ? null : await findBlingProductBySku(u.sku);
    const targetIds: Array<string | null> = linkedIds.length ? [...new Set(linkedIds)] : [matchedId];

    for (const targetId of targetIds) {
      const payload = buildPayload(u);
      const isUpdate = Boolean(targetId);
      const { status, data } = await callBling({
        path: isUpdate ? `/produtos/${targetId}` : "/produtos",
        method: isUpdate ? "PUT" : "POST",
        body: payload,
        config: cfg,
      });

      if (status >= 400) {
        const err = blingError(status, data);
        if (targetId) {
          await supa.from("bling_product_links")
            .update({ status: "error", last_error: err })
            .eq("bling_product_id", targetId);
        }
        await logSync({ entity_type: "product", entity_id: productId, action: isUpdate ? "update" : "create", status: "error", payload, response: data, error_message: err });
        results.push({ sku: u.sku, bling_product_id: targetId, ok: false, error: err });
        continue;
      }

      const newId = String(data?.data?.id ?? targetId);
      const confirmation = await confirmBlingProduct(newId, u.cost, Math.min(u.images.length, 5));
      const warnings = [confirmation.costWarning, confirmation.imageWarning].filter(Boolean);
      const linkData = {
        product_id: productId,
        variant_id: u.variantId,
        bling_product_id: newId,
        bling_sku: u.sku,
        status: warnings.length ? "partial" : "synced",
        last_pushed_at: new Date().toISOString(),
        last_error: warnings.length ? warnings.join(" ") : null,
      };
      const existingLink = (existingLinks ?? []).find((link: any) => String(link.bling_product_id) === newId);
      const { error: linkError } = existingLink
        ? await supa.from("bling_product_links").update(linkData).eq("id", existingLink.id)
        : await supa.from("bling_product_links").insert(linkData);
      if (linkError) throw linkError;

      let confirmedStock: number | null = null;
      if (cfg.sync_stock && cfg.stock_authority === "store" && cfg.deposito_id && u.variantId) {
        try {
          const stockResult = await pushStockToBling(newId, u.quantity, cfg.sync_prices && cfg.price_authority === "store" ? u.price : undefined);
          confirmedStock = stockResult.confirmed_quantity;
          await logSync({
            entity_type: "stock",
            entity_id: productId,
            action: "push",
            status: "success",
            payload: { variant_id: u.variantId, bling_product_id: newId, deposito_id: cfg.deposito_id, quantity: u.quantity },
          });
        } catch (e) {
          const stockError = e instanceof Error ? e.message : String(e);
          await supa.from("bling_product_links").update({ status: "error", last_error: stockError }).eq("bling_product_id", newId);
          await logSync({ entity_type: "stock", entity_id: productId, action: "push", status: "error", payload: { variant_id: u.variantId, bling_product_id: newId, deposito_id: cfg.deposito_id, quantity: u.quantity }, error_message: stockError });
          throw e;
        }
      }

      await logSync({
        entity_type: "product",
        entity_id: productId,
        action: isUpdate ? "update" : "create",
        status: "success",
        payload,
        response: { write: data, confirmation: confirmation.remote },
      });
      results.push({
        sku: u.sku,
        ok: true,
        bling_product_id: newId,
        confirmed_stock: confirmedStock,
        confirmed_cost: confirmation.confirmedCost,
        confirmed_images: confirmation.confirmedImages,
        warning: warnings.length ? warnings.join(" ") : null,
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length === results.length && results.length > 0) {
    throw new Error(failed.map((f) => f.error).join(" | "));
  }
  return { results };
}
