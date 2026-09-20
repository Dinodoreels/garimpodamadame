import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductVariant } from '@/hooks/useProducts';
import type { ShippingOption } from '@/lib/shipping';

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  /** When set, this item belongs to a kit/combo. Used to group items in the cart UI. */
  kitId?: string;
  kitTitle?: string;
  /** Unit price after applying the kit discount/fixed price (per unit). If unset, variant.price is used. */
  kitUnitPrice?: number;
  savedForLater?: boolean;
}

export interface SelectedAddress {
  recipient_name: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface AppliedDiscount {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  discountAmount: number;
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  
  // Delivery type
  deliveryType: 'shipping' | 'pickup';
  pickupStoreId: string | null;
  pickupStoreName: string | null;
  
  // Shipping states
  shippingCost: number;
  shippingState: string | null;
  shippingCity: string | null;
  shippingZipCode: string | null;
  shippingEstimate: string | null;
  shippingService: string | null;
  shippingOption: ShippingOption | null;
  selectedAddress: SelectedAddress | null;
  
  // Discount states
  appliedDiscount: AppliedDiscount | null;
  
  // Loyalty states
  loyaltyPointsUsed: number;
  loyaltyDiscount: number;
  
  // Actions
  addItem: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  removeKit: (kitId: string) => void;
  toggleSavedForLater: (variantId: string) => void;
  clearActiveItems: () => void;
  clearCart: () => void;
  setLoading: (loading: boolean) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getDiscountedPrice: () => number;
  getGrandTotal: () => number;
  createCheckout: () => Promise<string | null>;
  createDirectCheckout: (item: CartItem) => Promise<string | null>;
  
  // Shipping actions
  setShipping: (cost: number, state: string, city: string, zipCode: string, estimate: string, address?: SelectedAddress, service?: string, option?: ShippingOption) => void;
  clearShipping: () => void;
  
  // Pickup actions
  setPickup: (storeId: string, storeName: string) => void;
  clearPickup: () => void;
  
  // Discount actions
  setDiscount: (discount: AppliedDiscount | null) => void;
  
  // Loyalty actions
  setLoyaltyRedemption: (points: number, discount: number) => void;
  clearLoyaltyRedemption: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      
      // Delivery type
      deliveryType: 'shipping' as const,
      pickupStoreId: null,
      pickupStoreName: null,
      
      // Shipping initial states
      shippingCost: 0,
      shippingState: null,
      shippingCity: null,
      shippingZipCode: null,
      shippingEstimate: null,
      shippingService: null,
      shippingOption: null,
      selectedAddress: null,
      
      // Discount initial state
      appliedDiscount: null,
      
      // Loyalty initial state
      loyaltyPointsUsed: 0,
      loyaltyDiscount: 0,

      addItem: (item) => {
        const { items } = get();
        const existingItem = items.find(i => i.variant.id === item.variant.id);
        
        if (existingItem) {
          set({
            items: items.map(i =>
              i.variant.id === item.variant.id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
            shippingCost: 0,
            shippingOption: null,
            shippingService: null,
            shippingEstimate: null,
          });
        } else {
          set({
            items: [...items, item],
            shippingCost: 0,
            shippingOption: null,
            shippingService: null,
            shippingEstimate: null,
          });
        }
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        
        set({
          items: get().items.map(item =>
            item.variant.id === variantId ? { ...item, quantity } : item
          ),
          shippingCost: 0,
          shippingOption: null,
          shippingService: null,
          shippingEstimate: null,
        });
      },

      removeItem: (variantId) => {
        set({
          items: get().items.filter(item => item.variant.id !== variantId),
          shippingCost: 0,
          shippingOption: null,
          shippingService: null,
          shippingEstimate: null,
        });
      },

      removeKit: (kitId) => {
        set({
          items: get().items.filter(item => item.kitId !== kitId),
          shippingCost: 0,
          shippingOption: null,
          shippingService: null,
          shippingEstimate: null,
        });
      },

      toggleSavedForLater: (variantId) => {
        set({
          items: get().items.map(item =>
            item.variant.id === variantId
              ? { ...item, savedForLater: !item.savedForLater }
              : item
          )
        });
      },

      clearActiveItems: () => {
        set({
          items: get().items.filter(i => i.savedForLater),
          shippingCost: 0,
          shippingState: null,
          shippingCity: null,
          shippingZipCode: null,
          shippingEstimate: null,
          shippingService: null,
          shippingOption: null,
          selectedAddress: null,
          appliedDiscount: null,
          loyaltyPointsUsed: 0,
          loyaltyDiscount: 0,
        });
      },

      clearCart: () => {
        set({ 
          items: [],
          deliveryType: 'shipping',
          pickupStoreId: null,
          pickupStoreName: null,
          shippingCost: 0,
          shippingState: null,
          shippingCity: null,
          shippingZipCode: null,
          shippingEstimate: null,
          shippingService: null,
          shippingOption: null,
          selectedAddress: null,
          appliedDiscount: null,
          loyaltyPointsUsed: 0,
          loyaltyDiscount: 0
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      getTotalItems: () => {
        return get().items.filter(i => !i.savedForLater).reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.filter(i => !i.savedForLater).reduce((sum, item) => {
          const unit = item.kitUnitPrice ?? item.variant.price;
          return sum + unit * item.quantity;
        }, 0);
      },

      getDiscountedPrice: () => {
        const { appliedDiscount } = get();
        const subtotal = get().getTotalPrice();
        const loyaltyDiscount = get().loyaltyDiscount;
        if (!appliedDiscount) return Math.max(0, subtotal - loyaltyDiscount);
        return Math.max(0, subtotal - appliedDiscount.discountAmount - loyaltyDiscount);
      },

      getGrandTotal: () => {
        const { shippingCost } = get();
        return get().getDiscountedPrice() + shippingCost;
      },

      setShipping: (cost, state, city, zipCode, estimate, address, service, option) => set({
        shippingCost: cost,
        shippingState: state,
        shippingCity: city,
        shippingZipCode: zipCode,
        shippingEstimate: estimate,
        shippingService: service || null,
        shippingOption: option || null,
        selectedAddress: address || null
      }),

      clearShipping: () => set({
        shippingCost: 0,
        shippingState: null,
        shippingCity: null,
        shippingZipCode: null,
        shippingEstimate: null,
        shippingService: null,
        shippingOption: null,
        selectedAddress: null
      }),

      setPickup: (storeId, storeName) => set({
        deliveryType: 'pickup',
        pickupStoreId: storeId,
        pickupStoreName: storeName,
        shippingCost: 0,
        shippingState: null,
        shippingCity: null,
        shippingZipCode: null,
        shippingEstimate: null,
        shippingService: null,
        shippingOption: null,
        selectedAddress: null,
      }),

      clearPickup: () => set({
        deliveryType: 'shipping',
        pickupStoreId: null,
        pickupStoreName: null,
      }),

      setDiscount: (discount) => set({ appliedDiscount: discount }),

      setLoyaltyRedemption: (points, discount) => set({ 
        loyaltyPointsUsed: points, 
        loyaltyDiscount: discount 
      }),

      clearLoyaltyRedemption: () => set({ loyaltyPointsUsed: 0, loyaltyDiscount: 0 }),

      createCheckout: async () => {
        const { items, setLoading, shippingCost, shippingOption, selectedAddress, appliedDiscount, loyaltyPointsUsed, loyaltyDiscount } = get();
        const activeItems = items.filter(i => !i.savedForLater);
        if (activeItems.length === 0) return null;

        setLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error('User not authenticated');
            return null;
          }

          const checkoutItems = activeItems.map(item => ({
            product_id: item.product.id,
            variant_id: item.variant.id,
            quantity: item.quantity,
            title: item.product.title,
            variant_title: item.variant.title !== 'Default' ? item.variant.title : undefined,
            price: item.kitUnitPrice ?? item.variant.price,
            image_url: item.product.images?.[0]?.url,
            kit_id: item.kitId,
            kit_title: item.kitTitle,
          }));

          const { data, error } = await supabase.functions.invoke('create-checkout', {
            body: {
              items: checkoutItems,
              shipping_cost: shippingCost,
              shipping_option: shippingOption || undefined,
              shipping_address: selectedAddress || undefined,
              discount_code: appliedDiscount?.code || undefined,
              discount_amount: (appliedDiscount?.discountAmount || 0) + loyaltyDiscount,
              loyalty_points_used: loyaltyPointsUsed,
              loyalty_discount: loyaltyDiscount,
            },
          });

          if (error) {
            console.error('Checkout error:', error);
            return null;
          }

          if (data?.checkout_url) {
            return data.checkout_url;
          }

          return null;
        } catch (error) {
          console.error('Falha ao criar checkout:', error);
          return null;
        } finally {
          setLoading(false);
        }
      },

      createDirectCheckout: async (item: CartItem) => {
        const { setLoading, shippingCost, shippingOption, selectedAddress } = get();
        setLoading(true);
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error('User not authenticated');
            return null;
          }

          const checkoutItems = [{
            product_id: item.product.id,
            variant_id: item.variant.id,
            quantity: item.quantity,
            title: item.product.title,
            variant_title: item.variant.title !== 'Default' ? item.variant.title : undefined,
            price: item.variant.price,
            image_url: item.product.images?.[0]?.url,
          }];

          const { data, error } = await supabase.functions.invoke('create-checkout', {
            body: {
              items: checkoutItems,
              shipping_cost: shippingCost,
              shipping_address: selectedAddress || undefined,
              shipping_option: shippingOption || undefined,
            },
          });

          if (error) {
            console.error('Direct checkout error:', error);
            return null;
          }

          if (data?.checkout_url) {
            return data.checkout_url;
          }

          return null;
        } catch (error) {
          console.error('Falha no checkout direto:', error);
          return null;
        } finally {
          setLoading(false);
        }
      }
    }),
    {
      name: 'principe-imports-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
