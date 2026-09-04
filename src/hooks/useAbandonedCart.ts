import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore, CartItem } from '@/stores/cartStore';

interface AbandonedCart {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  shipping_info: {
    state: string;
    city: string;
    cost: number;
  } | null;
  last_activity_at: string;
}

export function useAbandonedCart() {
  const { user } = useAuth();
  const { items, getTotalPrice } = useCartStore();
  const [pendingCart, setPendingCart] = useState<AbandonedCart | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync cart to server (debounced, called from cartStore)
  const syncCartToServer = useCallback(async () => {
    if (!user || items.length === 0) return;

    try {
      // Check if there's an existing cart
      const { data: existing } = await supabase
        .from('abandoned_carts')
        .select('id')
        .eq('user_id', user.id)
        .is('recovered_at', null)
        .single();

      const cartData = {
        user_id: user.id,
        items: JSON.parse(JSON.stringify(items)),
        subtotal: getTotalPrice(),
        last_activity_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase
          .from('abandoned_carts')
          .update({
            items: cartData.items,
            subtotal: cartData.subtotal,
            last_activity_at: cartData.last_activity_at,
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('abandoned_carts')
          .insert({
            user_id: cartData.user_id,
            items: cartData.items,
            subtotal: cartData.subtotal,
            last_activity_at: cartData.last_activity_at,
          });
      }
    } catch (error) {
      console.error('Error syncing cart:', error);
    }
  }, [user, items, getTotalPrice]);

  // Check for abandoned cart on login
  const checkForAbandonedCart = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('user_id', user.id)
        .is('recovered_at', null)
        .order('last_activity_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        setPendingCart(null);
        return;
      }

      // Check if cart is newer than current local cart
      const localCartEmpty = items.length === 0;
      const serverCartItems = data.items as unknown as CartItem[];
      
      if (serverCartItems.length > 0 && localCartEmpty) {
        setPendingCart({
          ...data,
          items: serverCartItems,
          shipping_info: data.shipping_info as AbandonedCart['shipping_info'],
        });
      }
    } catch (error) {
      console.error('Error checking abandoned cart:', error);
    } finally {
      setLoading(false);
    }
  }, [user, items.length]);

  // Recover cart
  const recoverCart = useCallback(async () => {
    if (!pendingCart) return;

    const { addItem, setDiscount } = useCartStore.getState();
    
    // Add items to cart
    for (const item of pendingCart.items) {
      addItem(item);
    }

    // Apply discount if exists
    if (pendingCart.discount_code && pendingCart.discount_amount > 0) {
      setDiscount({
        id: '',
        code: pendingCart.discount_code,
        type: 'fixed',
        value: pendingCart.discount_amount,
        discountAmount: pendingCart.discount_amount,
      });
    }

    // Mark as recovered
    await supabase
      .from('abandoned_carts')
      .update({ recovered_at: new Date().toISOString() })
      .eq('id', pendingCart.id);

    setPendingCart(null);
  }, [pendingCart]);

  // Dismiss cart recovery prompt
  const dismissRecovery = useCallback(() => {
    setPendingCart(null);
  }, []);

  // Mark cart as recovered after checkout
  const markAsRecovered = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('abandoned_carts')
        .update({ recovered_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('recovered_at', null);
    } catch (error) {
      console.error('Error marking cart as recovered:', error);
    }
  }, [user]);

  // Check for abandoned cart on mount/login
  useEffect(() => {
    if (user) {
      checkForAbandonedCart();
    }
  }, [user, checkForAbandonedCart]);

  return {
    pendingCart,
    loading,
    syncCartToServer,
    recoverCart,
    dismissRecovery,
    markAsRecovered,
  };
}
