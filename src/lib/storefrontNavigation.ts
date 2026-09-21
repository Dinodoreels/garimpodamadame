export type StorefrontNavigationItem = {
  name: string;
  href: string;
  enabled: boolean;
};

export type StorefrontNavigationSettings = {
  items: StorefrontNavigationItem[];
  disabledHomeDestination: string;
};

export const defaultStorefrontNavigation: StorefrontNavigationSettings = {
  items: [
    { name: 'INÍCIO', href: '/', enabled: false },
    { name: 'LANÇAMENTOS', href: '/releases', enabled: true },
    { name: 'CATÁLOGO', href: '/catalog', enabled: true },
    { name: 'LOTES', href: '/lote', enabled: true },
    { name: 'SOBRE', href: '/about', enabled: true },
    { name: 'CONTATO', href: '/contact', enabled: true },
  ],
  disabledHomeDestination: '/releases',
};

export function mergeStorefrontNavigation(settings?: StorefrontNavigationSettings | null) {
  if (!settings) return defaultStorefrontNavigation;
  return {
    disabledHomeDestination: settings.disabledHomeDestination || '/releases',
    items: defaultStorefrontNavigation.items.map((defaultItem) => ({
      ...defaultItem,
      ...settings.items?.find((item) => item.href === defaultItem.href),
    })),
  };
}

export function getStorefrontFallback(settings: StorefrontNavigationSettings) {
  const preferred = settings.items.find((item) => item.href === settings.disabledHomeDestination && item.enabled);
  return preferred?.href || settings.items.find((item) => item.enabled)?.href || '/catalog';
}