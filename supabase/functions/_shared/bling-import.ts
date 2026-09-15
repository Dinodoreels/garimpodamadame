import { blingError, callBling, getConfig, getSupabaseAdmin, logSync } from './bling.ts';

export const normalizeSku = (value: unknown) => String(value ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

const autoSku = (remoteId: string) => `GDM-BLG-${remoteId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;

async function assignMissingSku(raw: any, usedSkus: Set<string>) {
  const remoteId = String(raw?.id ?? '');
  const detailed = await fetchBlingProductDetail(remoteId);
  const current = String(detailed?.codigo ?? raw?.codigo ?? '').trim();
  if (normalizeSku(current)) return { raw: { ...raw, ...detailed, codigo: current }, generated: false };

  const sku = autoSku(remoteId);
  const normalized = normalizeSku(sku);
  if (!remoteId || usedSkus.has(normalized)) {
    throw new Error(`Não foi possível criar um SKU único para o produto ${remoteId || 'sem identificador'}.`);
  }

  const payload = {
    nome: String(detailed?.nome ?? raw?.nome ?? 'Produto do Bling').slice(0, 120),
    codigo: sku,
    preco: Number(detailed?.preco ?? raw?.preco ?? 0),
    tipo: detailed?.tipo ?? raw?.tipo ?? 'P',
    situacao: detailed?.situacao ?? raw?.situacao ?? 'A',
    formato: detailed?.formato ?? raw?.formato ?? 'S',
    unidade: detailed?.unidade ?? raw?.unidade ?? 'UN',
    descricaoCurta: detailed?.descricaoCurta ?? raw?.descricaoCurta ?? undefined,
    descricaoComplementar: detailed?.descricaoComplementar ?? raw?.descricaoComplementar ?? undefined,
    precoCusto: detailed?.precoCusto ?? raw?.precoCusto ?? undefined,
    pesoLiquido: detailed?.pesoLiquido ?? raw?.pesoLiquido ?? undefined,
    pesoBruto: detailed?.pesoBruto ?? raw?.pesoBruto ?? undefined,
    gtin: detailed?.gtin ?? raw?.gtin ?? undefined,
    gtinEmbalagem: detailed?.gtinEmbalagem ?? raw?.gtinEmbalagem ?? undefined,
    dimensoes: detailed?.dimensoes ?? raw?.dimensoes ?? undefined,
    marca: detailed?.marca ?? raw?.marca ?? undefined,
    categoria: detailed?.categoria ?? raw?.categoria ?? undefined,
    midia: detailed?.midia ?? raw?.midia ?? undefined,
  };
  const { status, data } = await callBling({ path: `/produtos/${remoteId}`, method: 'PUT', body: payload });
  if (status >= 400) throw new Error(blingError(status, data));
  usedSkus.add(normalized);
  await logSync({
    entity_type: 'product',
    entity_id: remoteId,
    action: 'generate_sku',
    status: 'success',
    payload: { sku },
    response: { bling_product_id: remoteId },
  });
  return { raw: { ...raw, ...detailed, codigo: sku }, generated: true };
}

export async function accountKey(clientId: string, companyName?: string | null) {
  const bytes = new TextEncoder().encode(`${clientId}|${companyName ?? ''}`);
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

async function fetchBlingStock(productIds: string[], depositoId: string) {
  const balances = new Map<string, number>();
  for (let index = 0; index < productIds.length; index += 100) {
    const ids = productIds.slice(index, index + 100);
    const { status, data } = await callBling({
      path: `/estoques/saldos/${encodeURIComponent(depositoId)}`,
      query: { 'idsProdutos[]': ids },
    });
    if (status >= 400) throw new Error(blingError(status, data));
    for (const row of data?.data ?? []) {
      const id = String(row?.produto?.id ?? '');
      if (!id) continue;
      const balance = row?.saldoVirtualTotal ?? row?.saldoFisicoTotal;
      if (balance != null && Number.isFinite(Number(balance))) balances.set(id, Number(balance));
    }
  }
  return balances;
}

function imageUrls(raw: any): string[] {
  const media = raw?.midia?.imagens ?? {};
  const rows = [
    ...(Array.isArray(media?.externas) ? media.externas : []),
    ...(Array.isArray(media?.internas) ? media.internas : []),
    ...(Array.isArray(media?.imagensURL) ? media.imagensURL : []),
    ...(Array.isArray(raw?.imagens) ? raw.imagens : []),
  ];
  const urls = [raw?.imagemURL, ...rows.map((image: any) => image?.link ?? image?.url)]
    .map((value) => String(value ?? '').trim())
    .filter((value) => /^https?:\/\//i.test(value));
  return [...new Set(urls)].slice(0, 10);
}

export function productSnapshot(raw: any) {
  const dimensions = raw?.dimensoes ?? {};
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
    stock: raw?.estoque?.saldoVirtualTotal ?? raw?.estoque?.saldoFisicoTotal ?? raw?.saldoVirtualTotal ?? raw?.saldoFisicoTotal ?? null,
    images: imageUrls(raw),
  };
}

export async function prepareImportRun(userId: string) {
  const supa = getSupabaseAdmin();
  const cfg = await getConfig();
  if (!cfg?.is_active || !cfg.client_id || !cfg.refresh_token) throw new Error('Conecte e teste a conta do Bling antes de buscar os dados.');
  const key = await accountKey(cfg.client_id, cfg.company_name);
  const { data: run, error: runError } = await supa.from('bling_import_runs').insert({
    account_key: key,
    company_name: cfg.company_name,
    status: 'fetching',
    created_by: userId,
  }).select('*').single();
  if (runError) throw runError;

  try {
    const remote = await fetchAllBlingProducts();
    if (!cfg.deposito_id) throw new Error('Escolha o depósito do Bling antes de buscar produtos e estoque.');
    const stockByProduct = await fetchBlingStock(remote.map((product: any) => String(product?.id ?? '')).filter(Boolean), cfg.deposito_id);
    const { data: variants } = await supa.from('product_variants').select('id, product_id, sku, price, cost, inventory_quantity');
    const { data: links } = await supa.from('bling_product_links').select('product_id, variant_id, bling_product_id, bling_sku');
    const variantsBySku = new Map<string, any[]>();
    for (const variant of variants ?? []) {
      const normalized = normalizeSku(variant.sku);
      if (!normalized) continue;
      variantsBySku.set(normalized, [...(variantsBySku.get(normalized) ?? []), variant]);
    }
    const linksByRemoteId = new Map((links ?? []).map((link: any) => [String(link.bling_product_id), link]));
    const usedSkus = new Set<string>();
    for (const raw of remote) {
      const normalized = normalizeSku(raw?.codigo);
      if (normalized) usedSkus.add(normalized);
    }
    for (const variant of variants ?? []) {
      const normalized = normalizeSku(variant.sku);
      if (normalized) usedSkus.add(normalized);
    }

    const preparedRemote: Array<{ raw: any; generated: boolean; generationError?: string }> = [];
    for (const raw of remote) {
      if (normalizeSku(raw?.codigo)) {
        try {
          const detailed = await fetchBlingProductDetail(String(raw?.id ?? ''));
          preparedRemote.push({ raw: { ...raw, ...detailed }, generated: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          preparedRemote.push({ raw, generated: false, generationError: message });
        }
        continue;
      }
      try {
        preparedRemote.push(await assignMissingSku(raw, usedSkus));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        preparedRemote.push({ raw, generated: false, generationError: message });
        await logSync({ entity_type: 'product', entity_id: String(raw?.id ?? ''), action: 'generate_sku', status: 'error', error_message: message });
      }
    }

    const rows = preparedRemote.map(({ raw, generated, generationError }) => {
      const snap = productSnapshot(raw);
      const selectedStock = stockByProduct.get(snap.id);
      if (selectedStock != null) snap.stock = selectedStock;
      const normalized = normalizeSku(snap.sku);
      const linked = linksByRemoteId.get(snap.id);
      const matches = normalized ? variantsBySku.get(normalized) ?? [] : [];
      const local = linked ? (variants ?? []).find((v: any) => v.id === linked.variant_id) : matches[0];
      const conflict = !!generationError || !normalized || (!linked && matches.length > 1);
      const differences: Record<string, any> = {};
      if (local && Number(local.price) !== snap.price) differences.price = { store: Number(local.price), bling: snap.price };
      if (local && snap.stock != null && Number(local.inventory_quantity) !== Number(snap.stock)) differences.stock = { store: Number(local.inventory_quantity), bling: Number(snap.stock) };
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
        bling_data: { ...snap, auto_sku_generated: generated, auto_sku_error: generationError ?? null },
        differences,
        error_message: generationError ?? null,
      };
    });
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supa.from('bling_import_items').insert(rows.slice(i, i + 500));
      if (error) throw error;
    }
    const totals = rows.reduce((acc: Record<string, number>, row: any) => ({
      ...acc,
      [row.classification]: (acc[row.classification] ?? 0) + 1,
      auto_sku_generated: (acc.auto_sku_generated ?? 0) + (row.bling_data?.auto_sku_generated ? 1 : 0),
    }), { total: rows.length, auto_sku_generated: 0 });
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
