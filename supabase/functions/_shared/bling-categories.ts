import { blingError, callBling, logSync } from './bling.ts';

type BlingCategory = {
  id?: number | string;
  descricao?: string;
};

const normalizeCategory = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleUpperCase('pt-BR');

export async function listBlingProductCategories() {
  const categories: BlingCategory[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const { status, data } = await callBling({
      path: '/categorias/produtos',
      query: { pagina: page, limite: 100 },
    });
    if (status >= 400) throw new Error(blingError(status, data));
    const rows = Array.isArray(data?.data) ? data.data as BlingCategory[] : [];
    categories.push(...rows);
    if (rows.length < 100) break;
  }
  return categories;
}

export async function ensureBlingProductCategory(name: string) {
  const description = name.trim().replace(/\s+/g, ' ').slice(0, 100);
  if (!description) throw new Error('Informe uma categoria válida antes de sincronizar com o Bling.');

  const normalized = normalizeCategory(description);
  const categories = await listBlingProductCategories();
  const existing = categories.find((category) => normalizeCategory(String(category.descricao ?? '')) === normalized);
  if (existing?.id) return { id: String(existing.id), description: existing.descricao ?? description, created: false };

  const { status, data } = await callBling({
    path: '/categorias/produtos',
    method: 'POST',
    body: { descricao: description },
  });
  if (status >= 400) throw new Error(blingError(status, data));
  const id = data?.data?.id;
  if (!id) throw new Error('O Bling criou a categoria, mas não retornou seu código.');
  await logSync({
    entity_type: 'category',
    entity_id: String(id),
    action: 'create',
    status: 'success',
    payload: { description },
    response: data,
  });
  return { id: String(id), description, created: true };
}