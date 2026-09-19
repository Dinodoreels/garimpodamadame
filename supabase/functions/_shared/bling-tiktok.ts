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

export async function getTikTokCategories(channel: TikTokChannel, productType?: string) {
  const storeId = String(channel.id);
  const integrationType = channel.tipoIntegracao ?? channel.tipo ?? 'TikTok';
  const typeCandidates = [...new Set([productType?.trim(), 'P', 'produto', undefined])];
  let lastResponse: Awaited<ReturnType<typeof callBling>> | null = null;
  for (const tipoProduto of typeCandidates) {
    const response = await callBling({ path: '/anuncios/categorias', query: { tipoIntegracao: integrationType, idLoja: storeId, tipoProduto } });
    lastResponse = response;
    if (response.status >= 400) continue;
    const categories = normalizeTikTokCategories(response.data?.data ?? response.data);
    if (categories.length) return categories;
  }
  const announcementCategories = lastResponse;
  if (announcementCategories && announcementCategories.status >= 400 && announcementCategories.status !== 404) {
    throw new Error(blingError(announcementCategories.status, announcementCategories.data));
  }
  const linkedCategories = await callBling({ path: '/categorias/lojas', query: { idLoja: storeId, limite: 100 } });
  if (linkedCategories.status >= 400) throw new Error(blingError(linkedCategories.status, linkedCategories.data));
  return normalizeTikTokCategories(linkedCategories.data?.data ?? []);
}

export async function getTikTokCategoryAttributes(channel: TikTokChannel, categoryId: string) {
  const storeId = String(channel.id);
  const integrationType = channel.tipoIntegracao ?? channel.tipo ?? 'TikTok';
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
