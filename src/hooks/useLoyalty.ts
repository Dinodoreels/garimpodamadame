import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LoyaltyBalance {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  lastActivityAt: string | null;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  orderId: string | null;
  type: 'earn' | 'redeem' | 'expire' | 'adjust';
  points: number;
  description: string | null;
  createdAt: string;
  orderNumber?: string;
}

export interface LoyaltySettings {
  id: string;
  pointsPerReal: number;
  redemptionRate: number;
  minRedemption: number;
  isActive: boolean;
  tiersEnabled: boolean;
  tierBronzeMin: number;
  tierBronzeMultiplier: number;
  tierSilverMin: number;
  tierSilverMultiplier: number;
  tierGoldMin: number;
  tierGoldMultiplier: number;
  expirationEnabled: boolean;
  expirationMonths: number;
  minOrderValue: number;
  maxDiscountPercent: number;
  redemptionStep: number;
  excludePromoItems: boolean;
  earnOnShipping: boolean;
  firstPurchaseBonus: number;
}

export type TierName = 'bronze' | 'silver' | 'gold';

export interface TierInfo {
  name: TierName;
  label: string;
  multiplier: number;
  nextTier: TierName | null;
  nextTierLabel: string | null;
  nextTierMin: number | null;
  pointsToNext: number | null;
  progress: number; // 0-100
}

export function getTierInfo(totalEarned: number, settings: LoyaltySettings): TierInfo {
  if (!settings.tiersEnabled) {
    return {
      name: 'bronze',
      label: 'Bronze',
      multiplier: 1,
      nextTier: null,
      nextTierLabel: null,
      nextTierMin: null,
      pointsToNext: null,
      progress: 0,
    };
  }

  if (totalEarned >= settings.tierGoldMin) {
    return {
      name: 'gold',
      label: 'Ouro',
      multiplier: settings.tierGoldMultiplier,
      nextTier: null,
      nextTierLabel: null,
      nextTierMin: null,
      pointsToNext: null,
      progress: 100,
    };
  }

  if (totalEarned >= settings.tierSilverMin) {
    const pointsToNext = settings.tierGoldMin - totalEarned;
    const rangeSize = settings.tierGoldMin - settings.tierSilverMin;
    const progress = ((totalEarned - settings.tierSilverMin) / rangeSize) * 100;
    return {
      name: 'silver',
      label: 'Prata',
      multiplier: settings.tierSilverMultiplier,
      nextTier: 'gold',
      nextTierLabel: 'Ouro',
      nextTierMin: settings.tierGoldMin,
      pointsToNext,
      progress: Math.min(progress, 100),
    };
  }

  const pointsToNext = settings.tierSilverMin - totalEarned;
  const rangeSize = settings.tierSilverMin - settings.tierBronzeMin;
  const progress = rangeSize > 0 ? ((totalEarned - settings.tierBronzeMin) / rangeSize) * 100 : 0;
  return {
    name: 'bronze',
    label: 'Bronze',
    multiplier: settings.tierBronzeMultiplier,
    nextTier: 'silver',
    nextTierLabel: 'Prata',
    nextTierMin: settings.tierSilverMin,
    pointsToNext,
    progress: Math.min(Math.max(progress, 0), 100),
  };
}

export function useLoyaltySettings() {
  return useQuery({
    queryKey: ['loyalty-settings'],
    queryFn: async (): Promise<LoyaltySettings | null> => {
      const { data, error } = await supabase
        .from('loyalty_settings')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching loyalty settings:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        pointsPerReal: Number(data.points_per_real),
        redemptionRate: Number(data.redemption_rate),
        minRedemption: data.min_redemption,
        isActive: data.is_active,
        tiersEnabled: (data as any).tiers_enabled ?? false,
        tierBronzeMin: (data as any).tier_bronze_min ?? 0,
        tierBronzeMultiplier: Number((data as any).tier_bronze_multiplier ?? 1),
        tierSilverMin: (data as any).tier_silver_min ?? 500,
        tierSilverMultiplier: Number((data as any).tier_silver_multiplier ?? 1.5),
        tierGoldMin: (data as any).tier_gold_min ?? 2000,
        tierGoldMultiplier: Number((data as any).tier_gold_multiplier ?? 2),
        expirationEnabled: (data as any).expiration_enabled ?? false,
        expirationMonths: (data as any).expiration_months ?? 6,
        minOrderValue: Number((data as any).min_order_value ?? 0),
        maxDiscountPercent: (data as any).max_discount_percent ?? 50,
        redemptionStep: (data as any).redemption_step ?? 50,
        excludePromoItems: (data as any).exclude_promo_items ?? false,
        earnOnShipping: (data as any).earn_on_shipping ?? false,
        firstPurchaseBonus: (data as any).first_purchase_bonus ?? 0,
      };
    },
  });
}

export function useLoyaltyBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['loyalty-balance', user?.id],
    queryFn: async (): Promise<LoyaltyBalance | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching loyalty balance:', error);
        return null;
      }

      if (!data) {
        return {
          id: '',
          userId: user.id,
          balance: 0,
          totalEarned: 0,
          totalRedeemed: 0,
          lastActivityAt: null,
        };
      }

      return {
        id: data.id,
        userId: data.user_id,
        balance: data.balance,
        totalEarned: data.total_earned,
        totalRedeemed: data.total_redeemed,
        lastActivityAt: (data as any).last_activity_at ?? null,
      };
    },
    enabled: !!user,
  });
}

export function useLoyaltyTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['loyalty-transactions', user?.id],
    queryFn: async (): Promise<LoyaltyTransaction[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select(`
          *,
          orders:order_id(order_number)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching loyalty transactions:', error);
        return [];
      }

      return data.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        orderId: t.order_id,
        type: t.type as LoyaltyTransaction['type'],
        points: t.points,
        description: t.description,
        createdAt: t.created_at,
        orderNumber: t.orders?.order_number,
      }));
    },
    enabled: !!user,
  });
}

export function useAdminLoyalty() {
  const queryClient = useQueryClient();

  const { data: allBalances = [], isLoading: loadingBalances } = useQuery({
    queryKey: ['admin-loyalty-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_points')
        .select(`
          *,
          profiles:user_id(full_name)
        `)
        .order('balance', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<LoyaltySettings> & { id: string }) => {
      const updateData: any = {};
      if (settings.pointsPerReal !== undefined) updateData.points_per_real = settings.pointsPerReal;
      if (settings.redemptionRate !== undefined) updateData.redemption_rate = settings.redemptionRate;
      if (settings.minRedemption !== undefined) updateData.min_redemption = settings.minRedemption;
      if (settings.isActive !== undefined) updateData.is_active = settings.isActive;
      if (settings.tiersEnabled !== undefined) updateData.tiers_enabled = settings.tiersEnabled;
      if (settings.tierBronzeMin !== undefined) updateData.tier_bronze_min = settings.tierBronzeMin;
      if (settings.tierBronzeMultiplier !== undefined) updateData.tier_bronze_multiplier = settings.tierBronzeMultiplier;
      if (settings.tierSilverMin !== undefined) updateData.tier_silver_min = settings.tierSilverMin;
      if (settings.tierSilverMultiplier !== undefined) updateData.tier_silver_multiplier = settings.tierSilverMultiplier;
      if (settings.tierGoldMin !== undefined) updateData.tier_gold_min = settings.tierGoldMin;
      if (settings.tierGoldMultiplier !== undefined) updateData.tier_gold_multiplier = settings.tierGoldMultiplier;
      if (settings.expirationEnabled !== undefined) updateData.expiration_enabled = settings.expirationEnabled;
      if (settings.expirationMonths !== undefined) updateData.expiration_months = settings.expirationMonths;
      if (settings.minOrderValue !== undefined) updateData.min_order_value = settings.minOrderValue;
      if (settings.maxDiscountPercent !== undefined) updateData.max_discount_percent = settings.maxDiscountPercent;
      if (settings.redemptionStep !== undefined) updateData.redemption_step = settings.redemptionStep;
      if (settings.excludePromoItems !== undefined) updateData.exclude_promo_items = settings.excludePromoItems;
      if (settings.earnOnShipping !== undefined) updateData.earn_on_shipping = settings.earnOnShipping;
      if (settings.firstPurchaseBonus !== undefined) updateData.first_purchase_bonus = settings.firstPurchaseBonus;

      const { error } = await supabase
        .from('loyalty_settings')
        .update(updateData)
        .eq('id', settings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-settings'] });
    },
  });

  const adjustPoints = useMutation({
    mutationFn: async ({ userId, points, description }: { userId: string; points: number; description: string }) => {
      const { data: existing } = await supabase
        .from('loyalty_points')
        .select('id, balance, total_earned, total_redeemed')
        .eq('user_id', userId)
        .single();

      if (existing) {
        const newBalance = existing.balance + points;
        const updates: any = { balance: newBalance, last_activity_at: new Date().toISOString() };
        
        if (points > 0) {
          updates.total_earned = existing.total_earned + points;
        } else {
          updates.total_redeemed = existing.total_redeemed + Math.abs(points);
        }

        const { error: updateError } = await supabase
          .from('loyalty_points')
          .update(updates)
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('loyalty_points')
          .insert({
            user_id: userId,
            balance: Math.max(0, points),
            total_earned: points > 0 ? points : 0,
            total_redeemed: 0,
            last_activity_at: new Date().toISOString(),
          } as any);

        if (insertError) throw insertError;
      }

      const { error: txError } = await supabase
        .from('loyalty_transactions')
        .insert({
          user_id: userId,
          type: 'adjust',
          points,
          description,
        });

      if (txError) throw txError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-balances'] });
    },
  });

  return {
    allBalances,
    loadingBalances,
    updateSettings,
    adjustPoints,
  };
}

// Helper to calculate discount from points
export function calculatePointsDiscount(points: number, redemptionRate: number): number {
  return (points / 100) * redemptionRate;
}

// Helper to calculate points from subtotal
export function calculateEarnedPoints(subtotal: number, pointsPerReal: number): number {
  return Math.floor(subtotal * pointsPerReal);
}

// Compute the maximum redeemable points given balance + cart subtotal,
// honouring min_order_value, max_discount_percent and redemption_step.
export interface RedeemableInfo {
  maxPoints: number;
  blockedReason: string | null;
  step: number;
  minOrderValue: number;
  maxDiscountPercent: number;
}

export function getRedeemableInfo(
  balance: number,
  subtotal: number,
  settings: LoyaltySettings,
): RedeemableInfo {
  const step = Math.max(1, settings.redemptionStep || 1);
  const info: RedeemableInfo = {
    maxPoints: 0,
    blockedReason: null,
    step,
    minOrderValue: settings.minOrderValue,
    maxDiscountPercent: settings.maxDiscountPercent,
  };

  if (!settings.isActive) {
    info.blockedReason = 'Programa de fidelidade inativo';
    return info;
  }
  if (balance < settings.minRedemption) {
    info.blockedReason = `Mínimo ${settings.minRedemption} pontos para resgatar`;
    return info;
  }
  if (settings.minOrderValue > 0 && subtotal < settings.minOrderValue) {
    const falta = settings.minOrderValue - subtotal;
    info.blockedReason = `Adicione mais R$ ${falta.toFixed(2)} para usar pontos (pedido mínimo R$ ${settings.minOrderValue.toFixed(2)})`;
    return info;
  }

  // Max discount in R$
  const pct = Math.min(100, Math.max(0, settings.maxDiscountPercent || 100));
  const maxDiscount = (subtotal * pct) / 100;
  const rate = settings.redemptionRate || 1; // R$ per 100 pts
  const maxByDiscount = Math.floor((maxDiscount / rate) * 100);

  let max = Math.min(balance, maxByDiscount);
  // floor to step
  max = Math.floor(max / step) * step;
  // ensure not below min redemption
  if (max < settings.minRedemption) {
    max = 0;
    info.blockedReason = `Saldo ou desconto máximo (${pct}%) abaixo do resgate mínimo`;
  }
  info.maxPoints = max;
  return info;
}
