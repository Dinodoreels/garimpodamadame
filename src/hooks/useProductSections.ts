import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductImage, ProductOption } from './useProducts';

// Helper to format product with sorted images and options
const formatProduct = (product: any): Product => ({
  ...product,
  images: (product.images || []).sort((a: ProductImage, b: ProductImage) => a.position - b.position),
  options: (product.options || []).sort((a: ProductOption, b: ProductOption) => a.position - b.position),
});

// Fetch new products (last 30 days)
export function useNewProducts(limit: number = 8) {
  return useQuery({
    queryKey: ['products', 'new', limit],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          variants:product_variants(*),
          options:product_options(*)
        `)
        .eq('status', 'active')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching new products:', error);
        throw error;
      }

      return (data || []).map(formatProduct) as Product[];
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

// Fetch promo products (compare_at_price > price)
export function usePromoProducts(limit: number = 8) {
  return useQuery({
    queryKey: ['products', 'promo', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          variants:product_variants(*),
          options:product_options(*)
        `)
        .eq('status', 'active')
        .not('compare_at_price', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching promo products:', error);
        throw error;
      }

      // Filter products where compare_at_price > price
      const promoProducts = (data || []).filter(
        (product) => product.compare_at_price && product.compare_at_price > product.price
      );

      return promoProducts.map(formatProduct) as Product[];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

// Fetch top selling products
export function useTopProducts(limit: number = 8) {
  return useQuery({
    queryKey: ['products', 'top', limit],
    queryFn: async () => {
      // Step 1: Get top selling product IDs from order_items
      const { data: salesData, error: salesError } = await supabase
        .from('order_items')
        .select('product_id')
        .not('product_id', 'is', null);

      if (salesError) {
        console.error('Error fetching sales data:', salesError);
        throw salesError;
      }

      // Count sales per product
      const salesCount: Record<string, number> = {};
      (salesData || []).forEach((item) => {
        if (item.product_id) {
          salesCount[item.product_id] = (salesCount[item.product_id] || 0) + 1;
        }
      });

      // Get top product IDs sorted by sales
      const topProductIds = Object.entries(salesCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([id]) => id);

      if (topProductIds.length === 0) {
        // Fallback: return latest products if no sales data
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .select(`
            *,
            images:product_images(*),
            variants:product_variants(*),
            options:product_options(*)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fallbackError) throw fallbackError;
        return (fallbackData || []).map(formatProduct) as Product[];
      }

      // Step 2: Fetch products by IDs
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          variants:product_variants(*),
          options:product_options(*)
        `)
        .eq('status', 'active')
        .in('id', topProductIds);

      if (productsError) {
        console.error('Error fetching top products:', productsError);
        throw productsError;
      }

      // Sort by sales count
      const sortedProducts = (products || []).sort((a, b) => {
        return (salesCount[b.id] || 0) - (salesCount[a.id] || 0);
      });

      return sortedProducts.map(formatProduct) as Product[];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

// User preference interface
interface UserPreference {
  productTypes: string[];
  vendors: string[];
  purchasedProductIds: string[];
}

// Extract user preferences from favorites and orders
async function getUserPreferences(userId: string): Promise<UserPreference> {
  const preferences: UserPreference = {
    productTypes: [],
    vendors: [],
    purchasedProductIds: [],
  };

  // Get favorites with product details
  const { data: favorites } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', userId);

  const favoriteProductIds = (favorites || [])
    .map((f) => f.product_id)
    .filter(Boolean) as string[];

  if (favoriteProductIds.length > 0) {
    const { data: favoriteProducts } = await supabase
      .from('products')
      .select('product_type, vendor')
      .in('id', favoriteProductIds);

    (favoriteProducts || []).forEach((p) => {
      if (p.product_type && !preferences.productTypes.includes(p.product_type)) {
        preferences.productTypes.push(p.product_type);
      }
      if (p.vendor && !preferences.vendors.includes(p.vendor)) {
        preferences.vendors.push(p.vendor);
      }
    });
  }

  // Get orders with items
  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId);

  const orderIds = (orders || []).map((o) => o.id);

  if (orderIds.length > 0) {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id')
      .in('order_id', orderIds)
      .not('product_id', 'is', null);

    const purchasedIds = (orderItems || [])
      .map((item) => item.product_id)
      .filter(Boolean) as string[];

    preferences.purchasedProductIds = [...new Set(purchasedIds)];

    // Get product types and vendors from purchased products
    if (purchasedIds.length > 0) {
      const { data: purchasedProducts } = await supabase
        .from('products')
        .select('product_type, vendor')
        .in('id', purchasedIds);

      (purchasedProducts || []).forEach((p) => {
        if (p.product_type && !preferences.productTypes.includes(p.product_type)) {
          preferences.productTypes.push(p.product_type);
        }
        if (p.vendor && !preferences.vendors.includes(p.vendor)) {
          preferences.vendors.push(p.vendor);
        }
      });
    }
  }

  return preferences;
}

// Fetch recommended products for logged-in user
export function useRecommendedProducts(userId: string | undefined, limit: number = 8) {
  return useQuery({
    queryKey: ['products', 'recommended', userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      const preferences = await getUserPreferences(userId);

      // If no preferences, return empty (will fallback to top products in UI)
      if (preferences.productTypes.length === 0 && preferences.vendors.length === 0) {
        return [];
      }

      // Build query for similar products
      let query = supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          variants:product_variants(*),
          options:product_options(*)
        `)
        .eq('status', 'active');

      // Exclude already purchased products
      if (preferences.purchasedProductIds.length > 0) {
        query = query.not('id', 'in', `(${preferences.purchasedProductIds.join(',')})`);
      }

      // Filter by preferred product types or vendors
      const orConditions: string[] = [];
      if (preferences.productTypes.length > 0) {
        orConditions.push(`product_type.in.(${preferences.productTypes.join(',')})`);
      }
      if (preferences.vendors.length > 0) {
        orConditions.push(`vendor.in.(${preferences.vendors.join(',')})`);
      }

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      }

      const { data, error } = await query.limit(limit);

      if (error) {
        console.error('Error fetching recommended products:', error);
        throw error;
      }

      return (data || []).map(formatProduct) as Product[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}
