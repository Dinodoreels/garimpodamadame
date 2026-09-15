import { ClipboardList, Globe, MessageCircle, ShoppingBag, Store, type LucideIcon } from 'lucide-react';

export type OrderSourceDetails = {
  platform: string;
  storeName?: string | null;
  externalOrderNumber?: string | null;
  icon: LucideIcon;
  className: string;
};

type SourceOrder = {
  source?: string | null;
  store_name?: string | null;
  bling_channel?: string | null;
  bling_order_number?: string | null;
  bling_raw_payload?: unknown;
};

const MARKETPLACES = [
  { pattern: /tiktok|byte\s*dance/i, label: 'TikTok Shop' },
  { pattern: /mercado\s*livre|mercadolivre|meli/i, label: 'Mercado Livre' },
  { pattern: /shopee/i, label: 'Shopee' },
  { pattern: /magalu|magazine\s*luiza/i, label: 'Magalu' },
  { pattern: /amazon/i, label: 'Amazon' },
];

const INTERMEDIARY_CNPJ: Record<string, string> = {
  '27415911000136': 'TikTok Shop',
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

export function resolveOrderSource(order: SourceOrder): OrderSourceDetails {
  const source = String(order.source ?? 'website');
  const payload = asRecord(order.bling_raw_payload);
  const intermediary = asRecord(payload.intermediador);
  const intermediaryCnpj = String(intermediary.cnpj ?? '').replace(/\D/g, '');
  const rawChannel = String(
    order.bling_channel
      ?? payload?.loja?.nome
      ?? payload?.loja?.descricao
      ?? source.replace(/^bling:/i, '')
      ?? '',
  ).trim();
  const searchable = `${rawChannel} ${String(intermediary.nome ?? '')}`;
  const marketplace = INTERMEDIARY_CNPJ[intermediaryCnpj]
    ?? MARKETPLACES.find(({ pattern }) => pattern.test(searchable))?.label;

  if (source.startsWith('bling:')) {
    const channelId = String(payload?.loja?.id ?? '').trim();
    const genericChannel = /^canal\s+\d+$/i.test(rawChannel);
    const platform = marketplace ?? (genericChannel
      ? `Bling — ${rawChannel.toLowerCase()}`
      : rawChannel || 'Bling');
    const storeName = marketplace && rawChannel && !genericChannel && rawChannel !== marketplace
      ? rawChannel
      : channelId && genericChannel ? `Canal ${channelId}` : null;
    return {
      platform,
      storeName,
      externalOrderNumber: String(payload.numeroLoja ?? order.bling_order_number ?? '').trim() || null,
      icon: ShoppingBag,
      className: 'bg-secondary text-secondary-foreground border-border',
    };
  }

  if (source === 'whatsapp') return { platform: 'WhatsApp', icon: MessageCircle, className: 'bg-secondary text-secondary-foreground border-border' };
  if (source === 'store') return { platform: 'Loja Física', storeName: order.store_name, icon: Store, className: 'bg-accent text-accent-foreground border-border' };
  if (source === 'manual') return { platform: 'Manual', storeName: order.store_name, icon: ClipboardList, className: 'bg-muted text-muted-foreground border-border' };
  return { platform: 'Site Garimpo da Madame', icon: Globe, className: 'bg-primary/10 text-primary border-primary/20' };
}