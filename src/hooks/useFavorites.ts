import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Product } from './useProducts';

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string | null;
  shopify_product_id: string; // Legacy field - kept for DB compatibility
  product_handle: string;
  product_title: string;
  product_image: string | null;
  product_price: number | null;
  currency_code: string;
  created_at: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addFavorite = async (product: Product) => {
    if (!user) return { error: new Error('User not authenticated') };

    const price = product.price;
    const image = product.images?.[0]?.url || null;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          product_id: product.id,
          shopify_product_id: product.id, // Use product.id for legacy field
          product_handle: product.handle,
          product_title: product.title,
          product_image: image,
          product_price: price,
          currency_code: 'BRL'
        })
        .select()
        .single();

      if (error) throw error;
      await fetchFavorites();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const removeFavorite = async (productId: string) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .or(`product_id.eq.${productId},shopify_product_id.eq.${productId}`);

      if (error) throw error;
      await fetchFavorites();
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const isFavorite = useCallback((productId: string) => {
    return favorites.some(f => f.product_id === productId || f.shopify_product_id === productId);
  }, [favorites]);

  const toggleFavorite = async (product: Product) => {
    if (isFavorite(product.id)) {
      return removeFavorite(product.id);
    } else {
      return addFavorite(product);
    }
  };

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    refetch: fetchFavorites
  };
}
