import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '@/hooks/useProducts';
import { parseSearchIntent, searchProducts, type ProductSearchIntent } from '@/lib/productSearch';

function useDebouncedValue(value: string, delay = 650) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useSmartProductSearch(products: Product[], query: string, useAI = true) {
  const debouncedQuery = useDebouncedValue(query.trim());
  const localIntent = useMemo(() => parseSearchIntent(query), [query]);
  const localResults = useMemo(() => searchProducts(products, query), [products, query]);
  const shouldAskAI = useAI && debouncedQuery.length >= 4 && (/\s/.test(debouncedQuery) || localResults.length === 0);

  const aiQuery = useQuery({
    queryKey: ['smart-product-search-intent', debouncedQuery],
    enabled: shouldAskAI,
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('product-search-intent', {
        body: { query: debouncedQuery },
      });
      if (error || !data?.intent) return null;
      return data.intent as ProductSearchIntent;
    },
  });

  const intent = aiQuery.data ?? localIntent;
  const results = useMemo(
    () => searchProducts(products, query, intent),
    [products, query, intent],
  );

  return { results, intent, isInterpreting: aiQuery.isFetching };
}
