import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSiteContent } from '@/hooks/useSiteContent';
import { getStorefrontFallback, mergeStorefrontNavigation, type StorefrontNavigationSettings } from '@/lib/storefrontNavigation';

export function StorefrontPageGuard({ path, children }: { path: string; children: ReactNode }) {
  const { data, isLoading } = useSiteContent<StorefrontNavigationSettings>('storefront_navigation');
  if (isLoading) return <div className="min-h-screen bg-background" aria-label="Carregando página" />;

  const settings = mergeStorefrontNavigation(data);
  const page = settings.items.find((item) => item.href === path);
  if (page && !page.enabled) return <Navigate to={getStorefrontFallback(settings)} replace />;
  return children;
}