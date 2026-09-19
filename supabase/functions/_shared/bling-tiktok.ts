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
  parent_id: string | null;
  is_leaf: boolean;
  required_attributes: Array<Record<string, unknown>>;
};

export function isTikTokChannel(channel: TikTokChannel) {
  return /tiktok/i.test(`${channel.tipo ?? ''} ${channel.tipoIntegracao ?? ''} ${channel.descricao ?? ''}`);
}

export function normalizeTikTokCategories(input: unknown): TikTokCategory[] {
  const result: TikTokCategory[] = [];
  const visit = (value: unknown, parentId: string | null = null) => {
    if (!value || typeof value !== 'object') return;
    const item = value as Record<string, unknown>;
    const rawId = item.id ?? item.codigo ?? item.category_id ?? item.categoryId;
    const children = [item.filhos, item.children, item.categorias, item.subcategorias].find(Array.isArray) as unknown[] | undefined;
    const name = item.descricao ?? item.nome ?? item.name ?? item.local_name;
    if (rawId != null && typeof name === 'string') {
      const attributes = [item.atributos, item.attributes, item.required_attributes].find(Array.isArray) as Array<Record<string, unknown>> | undefined;
      result.push({ id: String(rawId), name, parent_id: parentId, is_leaf: item.is_leaf === true || item.folha === true || !children?.length, required_attributes: attributes ?? [] });
      parentId = String(rawId);
    }
    for (const child of children ?? []) visit(child, parentId);
  };
  for (const item of Array.isArray(input) ? input : []) visit(item);
  return result.filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
}

export async function getTikTokChannel() {
  const response = await callBling({ path: '/canais-venda', query: { limite: 100 } });
  if (response.status >= 400) throw new Error(blingError(response.status, response.data));
  return ((response.data?.data ?? []) as TikTokChannel[]).find((item) => isTikTokChannel(item) && item.situacao !== 0) ?? null;
}

export async function getTikTokCategories(channel: TikTokChannel) {
  const storeId = String(channel.id);
  const integrationType = channel.tipoIntegracao ?? channel.tipo ?? 'TikTok';
  const announcementCategories = await callBling({ path: '/anuncios/categorias', query: { tipoIntegracao: integrationType, idLoja: storeId } });
  if (announcementCategories.status < 400) return normalizeTikTokCategories(announcementCategories.data?.data ?? announcementCategories.data);
  const linkedCategories = await callBling({ path: '/categorias/lojas', query: { idLoja: storeId, limite: 100 } });
  if (linkedCategories.status >= 400) throw new Error(blingError(announcementCategories.status, announcementCategories.data));
  return normalizeTikTokCategories(linkedCategories.data?.data ?? []);
}
