import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calculateShippingOptions, formatZipCode, type ShippingCalcResponse } from '@/lib/shipping';

const STORAGE_KEY = 'catalog_shipping_cep';

export function useCatalogShippingCep() {
  const [cep, setCepState] = useState<string>('');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCepState(stored);
    } catch {
      // ignore
    }
  }, []);

  const setCep = useCallback((value: string) => {
    const formatted = formatZipCode(value);
    setCepState(formatted);
    try {
      if (formatted.replace(/\D/g, '').length === 8) {
        localStorage.setItem(STORAGE_KEY, formatted);
      } else if (!formatted) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const clearCep = useCallback(() => {
    setCepState('');
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }, []);

  const cleanCep = cep.replace(/\D/g, '');
  const isValid = cleanCep.length === 8;

  return { cep, setCep, clearCep, cleanCep, isValid };
}

/**
 * Per-product shipping estimate with caching (5min) keyed by product+cep+price.
 * Skips fetching unless `enabled` is true (use IntersectionObserver to gate).
 */
export function useProductShippingEstimate(params: {
  productId: string;
  cleanCep: string;
  subtotal: number;
  enabled: boolean;
}) {
  const { productId, cleanCep, subtotal, enabled } = params;

  return useQuery<ShippingCalcResponse | null>({
    queryKey: ['product-shipping', productId, cleanCep, subtotal],
    queryFn: async () => {
      if (!productId || cleanCep.length !== 8) return null;
      return calculateShippingOptions(cleanCep, {
        subtotal,
        items: [{ product_id: productId, quantity: 1 }],
      });
    },
    enabled: enabled && cleanCep.length === 8 && !!productId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}