import type { Product } from '@/hooks/useProducts';

export interface ProductSearchIntent {
  terms: string[];
  minPrice: number | null;
  maxPrice: number | null;
  onlyAvailable: boolean;
}

const STOP_WORDS = new Set([
  'a', 'as', 'com', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'me', 'mostre',
  'o', 'os', 'para', 'por', 'produto', 'produtos', 'quero', 'reais', 'um', 'uma',
]);

const SYNONYMS: Record<string, string[]> = {
  perfume: ['perfume', 'perfumaria', 'fragrancia', 'body splash', 'colonia'],
  fragrancia: ['fragrancia', 'perfume', 'body splash', 'colonia'],
  hidratante: ['hidratante', 'locao', 'creme corporal'],
  maquiagem: ['maquiagem', 'make', 'cosmetico'],
  cabelo: ['cabelo', 'capilar', 'shampoo', 'condicionador'],
  roupa: ['roupa', 'vestuario', 'camisa', 'camiseta', 'vestido', 'calca'],
  tenis: ['tenis', 'calcado', 'sapato'],
};

export function normalizeSearchText(value: string | null | undefined) {
  return (value ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseMoney(value: string) {
  const parsed = Number(value.replace('.', '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseSearchIntent(query: string): ProductSearchIntent {
  const normalized = normalizeSearchText(query);
  const between = normalized.match(/(?:entre|de)\s+(\d+(?:[.,]\d+)?)\s+(?:e|a|ate)\s+(\d+(?:[.,]\d+)?)/);
  const maxMatch = normalized.match(/(?:ate|menos de|abaixo de|no maximo)\s+(?:r\s*)?(\d+(?:[.,]\d+)?)/);
  const minMatch = normalized.match(/(?:acima de|mais de|a partir de|no minimo)\s+(?:r\s*)?(\d+(?:[.,]\d+)?)/);
  const minPrice = between ? parseMoney(between[1]) : minMatch ? parseMoney(minMatch[1]) : null;
  const maxPrice = between ? parseMoney(between[2]) : maxMatch ? parseMoney(maxMatch[1]) : null;
  const cleaned = normalized
    .replace(/(?:entre|de)\s+\d+(?:[.,]\d+)?\s+(?:e|a|ate)\s+\d+(?:[.,]\d+)?/g, ' ')
    .replace(/(?:ate|menos de|abaixo de|no maximo|acima de|mais de|a partir de|no minimo)\s+(?:r\s*)?\d+(?:[.,]\d+)?/g, ' ')
    .replace(/\b(?:disponivel|disponiveis|em estoque|com estoque)\b/g, ' ');
  const terms = cleaned.split(/\s+/).filter((term) => term.length > 1 && !STOP_WORDS.has(term));

  return {
    terms: Array.from(new Set(terms)),
    minPrice,
    maxPrice,
    onlyAvailable: /\b(?:disponivel|disponiveis|em estoque|com estoque)\b/.test(normalized),
  };
}

function bigrams(value: string) {
  const compact = value.replace(/\s/g, '');
  if (compact.length < 2) return [compact];
  return Array.from({ length: compact.length - 1 }, (_, index) => compact.slice(index, index + 2));
}

function similarity(left: string, right: string) {
  if (!left || !right) return 0;
  if (left.includes(right) || right.includes(left)) return 1;
  const a = bigrams(left);
  const b = [...bigrams(right)];
  let matches = 0;
  for (const pair of a) {
    const index = b.indexOf(pair);
    if (index >= 0) {
      matches += 1;
      b.splice(index, 1);
    }
  }
  return (2 * matches) / (a.length + bigrams(right).length);
}

function productAvailability(product: Product) {
  return product.variants?.some((variant) => variant.inventory_quantity > 0 || variant.inventory_policy === 'continue')
    ?? product.is_available;
}

function searchableFields(product: Product) {
  const variants = product.variants ?? [];
  return {
    title: normalizeSearchText(product.title),
    brand: normalizeSearchText([product.vendor, product.manufacturer].filter(Boolean).join(' ')),
    category: normalizeSearchText(product.product_type),
    description: normalizeSearchText(product.description),
    codes: normalizeSearchText([
      product.id,
      product.handle,
      ...variants.flatMap((variant) => [variant.sku, variant.gtin]),
      ...(product.bling_links ?? []).flatMap((link) => [link.bling_product_id, link.bling_sku]),
    ].filter(Boolean).join(' ')),
  };
}

export function productSearchScore(product: Product, query: string, override?: Partial<ProductSearchIntent>) {
  const base = parseSearchIntent(query);
  const intent = { ...base, ...override, terms: override?.terms?.length ? override.terms.map(normalizeSearchText) : base.terms };
  if (intent.minPrice !== null && product.price < intent.minPrice) return -1;
  if (intent.maxPrice !== null && product.price > intent.maxPrice) return -1;
  if (intent.onlyAvailable && !productAvailability(product)) return -1;
  if (intent.terms.length === 0) return 1;

  const fields = searchableFields(product);
  let total = 0;
  for (const term of intent.terms) {
    const alternatives = SYNONYMS[term] ?? [term];
    let best = 0;
    for (const alternative of alternatives) {
      if (fields.title.includes(alternative)) best = Math.max(best, fields.title === alternative ? 14 : 10);
      if (fields.codes.includes(alternative)) best = Math.max(best, 12);
      if (fields.brand.includes(alternative)) best = Math.max(best, 8);
      if (fields.category.includes(alternative)) best = Math.max(best, 7);
      if (fields.description.includes(alternative)) best = Math.max(best, 4);
      if (best === 0) {
        const words = `${fields.title} ${fields.brand} ${fields.category} ${fields.codes}`.split(' ');
        const fuzzy = Math.max(0, ...words.map((word) => similarity(alternative, word)));
        if (fuzzy >= 0.72) best = fuzzy * 5;
      }
    }
    if (best === 0) return -1;
    total += best;
  }
  return total;
}

export function searchProducts(products: Product[], query: string, override?: Partial<ProductSearchIntent>) {
  if (!query.trim() && !override) return products;
  return products
    .map((product, index) => ({ product, index, score: productSearchScore(product, query, override) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.product);
}
