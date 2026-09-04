import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getTierInfo, type LoyaltySettings } from './useLoyalty';

interface CreditLoyaltyResult {
  success: boolean;
  pointsEarned: number;
  error?: string;
}

export async function creditLoyaltyPoints(orderId: string): Promise<CreditLoyaltyResult> {
  try {
    // 1. Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, subtotal, shipping_cost, order_number, loyalty_credited, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, pointsEarned: 0, error: 'Pedido não encontrado' };
    }

    if (order.loyalty_credited) {
      return { success: true, pointsEarned: 0, error: 'Pontos já creditados' };
    }

    if (!order.user_id) {
      return { success: false, pointsEarned: 0, error: 'Pedido sem usuário associado' };
    }

    // 2. Get loyalty settings
    const { data: settings, error: settingsError } = await supabase
      .from('loyalty_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      return { success: false, pointsEarned: 0, error: 'Configurações de fidelidade não encontradas' };
    }

    if (!settings.is_active) {
      return { success: false, pointsEarned: 0, error: 'Programa de fidelidade inativo' };
    }

    // 3. Get user's current loyalty balance for tier calculation
    const { data: existingBalance } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('user_id', order.user_id)
      .single();

    const totalEarned = existingBalance?.total_earned || 0;

    // 4. Calculate tier multiplier
    const settingsTyped: LoyaltySettings = {
      id: settings.id,
      pointsPerReal: Number(settings.points_per_real),
      redemptionRate: Number(settings.redemption_rate),
      minRedemption: settings.min_redemption,
      isActive: settings.is_active,
      tiersEnabled: (settings as any).tiers_enabled ?? false,
      tierBronzeMin: (settings as any).tier_bronze_min ?? 0,
      tierBronzeMultiplier: Number((settings as any).tier_bronze_multiplier ?? 1),
      tierSilverMin: (settings as any).tier_silver_min ?? 500,
      tierSilverMultiplier: Number((settings as any).tier_silver_multiplier ?? 1.5),
      tierGoldMin: (settings as any).tier_gold_min ?? 2000,
      tierGoldMultiplier: Number((settings as any).tier_gold_multiplier ?? 2),
      expirationEnabled: (settings as any).expiration_enabled ?? false,
      expirationMonths: (settings as any).expiration_months ?? 6,
      minOrderValue: Number((settings as any).min_order_value ?? 0),
      maxDiscountPercent: (settings as any).max_discount_percent ?? 50,
      redemptionStep: (settings as any).redemption_step ?? 50,
      excludePromoItems: (settings as any).exclude_promo_items ?? false,
      earnOnShipping: (settings as any).earn_on_shipping ?? false,
      firstPurchaseBonus: (settings as any).first_purchase_bonus ?? 0,
    };

    const tierInfo = getTierInfo(totalEarned, settingsTyped);
    const multiplier = settingsTyped.tiersEnabled ? tierInfo.multiplier : 1;

    // 5. Calculate points with multiplier
    const baseValue = settingsTyped.earnOnShipping
      ? Number(order.subtotal || 0) + Number((order as any).shipping_cost || 0)
      : Number(order.subtotal || 0);
    const basePoints = Math.floor(baseValue * settings.points_per_real);
    let pointsToEarn = Math.floor(basePoints * multiplier);

    // First-purchase bonus: if user has no previous paid orders besides this one
    let firstPurchaseBonus = 0;
    if (settingsTyped.firstPurchaseBonus > 0) {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', order.user_id)
        .neq('id', orderId)
        .in('status', ['Pago', 'Enviado', 'Entregue', 'paid', 'shipped', 'delivered']);
      if ((count ?? 0) === 0) {
        firstPurchaseBonus = settingsTyped.firstPurchaseBonus;
        pointsToEarn += firstPurchaseBonus;
      }
    }

    if (pointsToEarn <= 0) {
      return { success: true, pointsEarned: 0, error: 'Nenhum ponto a creditar' };
    }

    // 6. Create earn transaction
    const descParts: string[] = [`Compra - Pedido #${order.order_number}`];
    if (multiplier > 1) descParts.push(`${multiplier}x ${tierInfo.label}`);
    if (firstPurchaseBonus > 0) descParts.push(`+${firstPurchaseBonus} bônus 1ª compra`);
    const description = descParts.join(' • ');

    const { error: transactionError } = await supabase
      .from('loyalty_transactions')
      .insert({
        user_id: order.user_id,
        order_id: orderId,
        type: 'earn',
        points: pointsToEarn,
        description,
      });

    if (transactionError) {
      console.error('Error creating loyalty transaction:', transactionError);
      return { success: false, pointsEarned: 0, error: 'Erro ao registrar transação' };
    }

    // 7. Update or create user's loyalty balance
    const now = new Date().toISOString();

    if (existingBalance) {
      const { error: updateError } = await supabase
        .from('loyalty_points')
        .update({
          balance: existingBalance.balance + pointsToEarn,
          total_earned: existingBalance.total_earned + pointsToEarn,
          updated_at: now,
          last_activity_at: now,
        } as any)
        .eq('user_id', order.user_id);

      if (updateError) {
        console.error('Error updating loyalty balance:', updateError);
        return { success: false, pointsEarned: 0, error: 'Erro ao atualizar saldo' };
      }
    } else {
      const { error: insertError } = await supabase
        .from('loyalty_points')
        .insert({
          user_id: order.user_id,
          balance: pointsToEarn,
          total_earned: pointsToEarn,
          total_redeemed: 0,
          last_activity_at: now,
        } as any);

      if (insertError) {
        console.error('Error creating loyalty balance:', insertError);
        return { success: false, pointsEarned: 0, error: 'Erro ao criar saldo' };
      }
    }

    // 8. Mark order as loyalty credited
    const { error: creditError } = await supabase
      .from('orders')
      .update({ loyalty_credited: true })
      .eq('id', orderId);

    if (creditError) {
      console.error('Error marking order as credited:', creditError);
    }

    return { success: true, pointsEarned: pointsToEarn };
  } catch (error) {
    console.error('Error crediting loyalty points:', error);
    return { 
      success: false, 
      pointsEarned: 0, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

export function useCreditLoyalty() {
  const creditPoints = async (orderId: string) => {
    const result = await creditLoyaltyPoints(orderId);
    
    if (result.success && result.pointsEarned > 0) {
      toast.success(`${result.pointsEarned} pontos creditados ao cliente!`);
    } else if (result.error && result.error !== 'Pontos já creditados') {
      toast.error(result.error);
    }
    
    return result;
  };

  return { creditPoints };
}
