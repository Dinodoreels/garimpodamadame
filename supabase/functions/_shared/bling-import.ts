import { blingError, callBling, getConfig, getSupabaseAdmin, logSync } from './bling.ts';

export const normalizeSku = (value: unknown) => String(value ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

export async function accountKey(clientId: string) {
  const bytes = new TextEncoder().encode(clientId);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

export async function fetchAllBlingProducts() {
  const products: any[] = [];
  for (let page = 1; page <= 100; page++) {
    const { status, data } = await callBling({ path: '/produtos', query: { pagina: page, limite: 100 } });
    if (status >= 400) throw new Error(blingError(status, data));
    const rows = Array.isArray(data?.data) ? data.data : [];
    products.push(...rows);
    if (rows.length < 100) break;
  }
  return products;
}

export async function fetchBlingProductDetail(id: string) {
  const { status, data } = await callBling({ path: `/produtos/${id}` });
  if (status >= 400) throw new Error(blingError(status, data));
  return data?.data ?? {};
}

export function productSnapshot(raw: any) {
  const dimensions = raw?.dimensoes ?? {};
  const imageRows = raw?.midia?.imagens?.externas ?? raw?.imagens ?? [];
  return {
    id: String(raw?.id ?? ''),
    sku: String(raw?.codigo ?? '').trim(),
    name: String(raw?.nome ?? 'Produto do Bling').trim(),
    price: Number(raw?.preco ?? 0),
    cost: raw?.precoCusto == null ? null : Number(raw.precoCusto),
    description: raw?.descricaoCurta ?? raw?.descricaoComplementar ?? null,
    status: raw?.situacao ?? null,
    brand: raw?.marca?.nome ?? raw?.marca ?? null,
    weight_grams: raw?.pesoLiquido == null ? null : Number(raw.pesoLiquido) * 1000,
    width_cm: dimensions?.largura == null ? null : Number(dimensions.largura),
    height_cm: dimensions?.altura == null ? null : Number(dimensions.altura),
    length_cm: dimensions?.profundidade == null ? null : Number(dimensions.profundidade),
    stock: Number(raw?.estoque?.saldoVirtualTotal ?? raw?.estoque?.saldoFisicoTotal ?? raw?.saldoVirtualTotal ?? raw?.saldoFisicoTotal ?? 0),
    images: imageRows.map((img: any) => String(img?.link ?? img?.url ?? '')).filter(Boolean).slice(0, 10),
  };
}

export async function prepareImportRun(userId: string) {
  const supa = getSupabaseAdmin();
  const cfg = await getConfig();
  if (!cfg?.is_active || !cfg.client_id || !cfg.refresh_token) throw new Error('Conecte e teste a conta do Bling antes de buscar os dados.');
  const key = await accountKey(cfg.client_id);
  const { data: run, error: runError } = await supa.from('bling_import_runs').insert({
    account_key: key,
    company_name: cfg.company_name,
    status: 'fetching',
    created_by: userId,
  }).select('*').single();
  if (runError) throw runError;

  try {
    const remote = await fetchAllBlingProducts();
    const { data: variants } = await supa.from('product_variants').select('id, product_id, sku, price, cost, inventory_quantity');
    const { data: links } = await supa.from('bling_product_links').select('product_id, variant_id, bling_product_id, bling_sku');
    const variantsBySku = new Map<string, any[]>();
    for (const variant of variants ?? []) {
      const normalized = normalizeSku(variant.sku);
      if (!normalized) continue;
      variantsBySku.set(normalized, [...(variantsBySku.get(normalized) ?? []), variant]);
    }
    const linksByRemoteId = new Map((links ?? []).map((link: any) => [String(link.bling_product_id), link]));
    const rows = remote.map((raw: any) => {
      const snap = productSnapshot(raw);
      const normalized = normalizeSku(snap.sku);
      const linked = linksByRemoteId.get(snap.id);
      const matches = normalized ? variantsBySku.get(normalized) ?? [] : [];
      const local = linked ? (variants ?? []).find((v: any) => v.id === linked.variant_id) : matches[0];
      const conflict = !normalized || (!linked && matches.length > 1);
      const differences: Record<string, any> = {};
      if (local && Number(local.price) !== snap.price) differences.price = { store: Number(local.price), bling: snap.price };
      if (local && Number(local.inventory_quantity) !== snap.stock) differences.stock = { store: Number(local.inventory_quantity), bling: snap.stock };
      const classification = conflict ? 'conflict' : linked ? (Object.keys(differences).length ? 'different' : 'linked') : matches.length === 1 ? 'different' : 'new';
      return {
        run_id: run.id,
        account_key: key,
        bling_product_id: snap.id,
        bling_sku: snap.sku || null,
        classification,
        selected: classification !== 'conflict',
        local_product_id: linked?.product_id ?? local?.product_id ?? null,
        local_variant_id: linked?.variant_id ?? local?.id ?? null,
        bling_data: snap,
        differences,
      };
    });
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supa.from('bling_import_items').insert(rows.slice(i, i + 500));
      if (error) throw error;
    }
    const totals = rows.reduce((acc: Record<string, number>, row: any) => ({ ...acc, [row.classification]: (acc[row.classification] ?? 0) + 1 }), { total: rows.length });
    await supa.from('bling_import_runs').update({ status: 'review', totals }).eq('id', run.id);
    await logSync({ entity_type: 'import', entity_id: run.id, action: 'preview', status: 'success', response: totals });
    return { run_id: run.id, totals };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supa.from('bling_import_runs').update({ status: 'failed', error_message: message }).eq('id', run.id);
    await logSync({ entity_type: 'import', entity_id: run.id, action: 'preview', status: 'error', error_message: message });
    throw error;
  }
}
