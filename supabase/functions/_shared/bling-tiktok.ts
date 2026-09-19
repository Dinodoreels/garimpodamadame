import { blingError, callBling } from './bling.ts';

export type TikTokChannel = {
  id: string | number;
  descricao?: string;
  nome?: string;
  tipo?: string;
  tipoIntegracao?: string;
  situacao?: number;
};

export type TikTokCategory = {
  id: string;
  name: string;
  path_name: string;
  parent_id: string | null;
  is_leaf: boolean;
  required_attributes: Array<Record<string, unknown>>;
};

export function isTikTokChannel(channel: TikTokChannel) {
  return /tiktok/i.test(`${channel.tipo ?? ''} ${channel.tipoIntegracao ?? ''} ${channel.descricao ?? ''}`);
}

export function normalizeTikTokCategories(input: unknown, parentId: string | null = null, parentPath = ''): TikTokCategory[] {
  const result: TikTokCategory[] = [];
  const visit = (value: unknown, currentParentId: string | null = parentId, currentParentPath = parentPath) => {
    if (!value || typeof value !== 'object') return;
    const item = value as Record<string, unknown>;
    const rawId = item.id ?? item.codigo ?? item.category_id ?? item.categoryId;
    const children = [item.filhos, item.children, item.categorias, item.subcategorias].find(Array.isArray) as unknown[] | undefined;
    const name = item.descricao ?? item.nome ?? item.name ?? item.local_name;
    if (rawId != null && typeof name === 'string') {
      const attributes = [item.atributos, item.attributes, item.required_attributes].find(Array.isArray) as Array<Record<string, unknown>> | undefined;
      const pathName = currentParentPath ? `${currentParentPath} > ${name}` : name;
      result.push({ id: String(rawId), name, path_name: pathName, parent_id: currentParentId, is_leaf: item.is_leaf === true || item.folha === true || !children?.length, required_attributes: attributes ?? [] });
      currentParentId = String(rawId);
      currentParentPath = pathName;
    }
    for (const child of children ?? []) visit(child, currentParentId, currentParentPath);
  };
  for (const item of Array.isArray(input) ? input : []) visit(item, parentId, parentPath);
  return result.filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
}

export async function getTikTokChannel() {
  const response = await callBling({ path: '/canais-venda', query: { limite: 100 } });
  if (response.status >= 400) throw new Error(blingError(response.status, response.data));
  return ((response.data?.data ?? []) as TikTokChannel[]).find((item) => isTikTokChannel(item) && item.situacao !== 0) ?? null;
}

async function getTikTokIntegrationType(channel: TikTokChannel) {
  if (channel.tipoIntegracao) return channel.tipoIntegracao;
  const response = await callBling({ path: '/canais-venda/tipos' });
  if (response.status >= 400) return channel.tipo ?? 'TikTok';
  const types = (response.data?.data ?? []) as Array<{ nome?: string; tipo?: string }>;
  const match = types.find((item) => /tiktok/i.test(`${item.nome ?? ''} ${item.tipo ?? ''}`));
  return match?.tipo ?? channel.tipo ?? 'TikTok';
}

export async function getTikTokCategories(channel: TikTokChannel, productType?: string) {
  const storeId = String(channel.id);
  const integrationType = await getTikTokIntegrationType(channel);
  const typeCandidates = [...new Set([productType?.trim(), undefined])];
  let lastError: string | null = null;
  for (const tipoProduto of typeCandidates) {
    const rootsResponse = await callBling({ path: '/anuncios/categorias', query: { tipoIntegracao: integrationType, idLoja: storeId, tipoProduto } });
    if (rootsResponse.status >= 400) {
      lastError = blingError(rootsResponse.status, rootsResponse.data);
      continue;
    }
    const roots = normalizeTikTokCategories(rootsResponse.data?.data ?? rootsResponse.data);
    if (!roots.length) continue;

    const all = [...roots];
    const queue = roots.map((category) => ({ category, depth: 0 }));
    const visited = new Set<string>();
    const maxRequests = 300;
    let requests = 0;
    while (queue.length && requests < maxRequests) {
      const next = queue.shift();
      if (!next || visited.has(next.category.id) || next.depth >= 8) continue;
      visited.add(next.category.id);
      requests += 1;
      const childrenResponse = await callBling({
        path: '/anuncios/categorias',
        query: { tipoIntegracao: integrationType, idLoja: storeId, idCategoria: next.category.id, tipoProduto },
      });
      if (childrenResponse.status >= 400) continue;
      const children = normalizeTikTokCategories(
        childrenResponse.data?.data ?? childrenResponse.data,
        next.category.id,
        next.category.path_name,
      );
      if (!children.length) {
        next.category.is_leaf = true;
        continue;
      }
      next.category.is_leaf = false;
      for (const child of children) {
        const existing = all.find((candidate) => candidate.id === child.id);
        if (!existing) all.push(child);
        queue.push({ category: child, depth: next.depth + 1 });
      }
    }
    return all;
  }
  const linkedCategories = await callBling({ path: '/categorias/lojas', query: { idLoja: storeId, limite: 100 } });
  if (linkedCategories.status < 400) {
    const linked = normalizeTikTokCategories(linkedCategories.data?.data ?? []);
    if (linked.length) return linked;
  }
  if (lastError) throw new Error(`${lastError}. Verifique se o aplicativo do Bling possui acesso a anúncios e se o TikTok Shop permite gerenciar categorias.`);
  return [];
}

export async function getTikTokCategoryAttributes(channel: TikTokChannel, categoryId: string) {
  const storeId = String(channel.id);
  const integrationType = await getTikTokIntegrationType(channel);
  const response = await callBling({
    path: `/anuncios/categorias/${encodeURIComponent(categoryId)}`,
    query: { tipoIntegracao: integrationType, idLoja: storeId },
  });
  if (response.status >= 400) throw new Error(blingError(response.status, response.data));
  const raw = response.data?.data;
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (raw && typeof raw === 'object') {
    const object = raw as Record<string, unknown>;
    const nested = [object.atributos, object.attributes, object.data].find(Array.isArray);
    if (nested) return nested as Array<Record<string, unknown>>;
    if (object.id != null) return [object];
  }
  return [];
}
