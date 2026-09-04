import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CashRegister {
  id: string;
  store_id: string | null;
  opened_by: string;
  closed_by: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  status: string;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string | null;
  next_day_opening_amount?: number | null;
}

export interface CashMovement {
  id: string;
  register_id: string;
  type: string;
  amount: number;
  description: string | null;
  created_by: string;
  created_at: string | null;
}

export function useOpenRegister() {
  return useQuery({
    queryKey: ['cash-register-open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CashRegister | null;
    },
  });
}

/** Returns the next-day opening suggestion from the most recently closed register. */
export function useNextOpeningSuggestion() {
  return useQuery({
    queryKey: ['cash-register-next-suggestion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('id, closed_at, next_day_opening_amount')
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.next_day_opening_amount == null) return null;
      return {
        amount: Number(data.next_day_opening_amount),
        closedAt: data.closed_at as string | null,
      };
    },
  });
}

export function useRegisterHistory(limit = 20) {
  return useQuery({
    queryKey: ['cash-register-history', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .order('opened_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = (data || []) as CashRegister[];
      // Enrich with operator names
      const userIds = Array.from(new Set(rows.flatMap(r => [r.opened_by, r.closed_by].filter(Boolean) as string[])));
      const nameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        (profiles || []).forEach((p: any) => nameMap.set(p.id, p.full_name || 'Operador'));
      }
      return rows.map(r => ({
        ...r,
        opened_by_name: r.opened_by ? (nameMap.get(r.opened_by) || 'Operador') : null,
        closed_by_name: r.closed_by ? (nameMap.get(r.closed_by) || 'Operador') : null,
      })) as (CashRegister & { opened_by_name: string | null; closed_by_name: string | null })[];
    },
  });
}

export function useRegisterMovements(registerId: string | undefined) {
  return useQuery({
    queryKey: ['cash-movements', registerId],
    enabled: !!registerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('register_id', registerId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as CashMovement[];
    },
  });
}

export function useOpenCashRegister() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ openingAmount, storeId }: { openingAmount: number; storeId?: string }) => {
      const { data, error } = await supabase
        .from('cash_registers')
        .insert({
          opened_by: user!.id,
          opening_amount: openingAmount,
          store_id: storeId || null,
          status: 'open',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-register'] }),
  });
}

export function useCloseCashRegister() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ registerId, closingAmount, notes, nextDayOpeningAmount }: { registerId: string; closingAmount: number; notes?: string; nextDayOpeningAmount?: number | null }) => {
      // Get movements to calculate expected
      const { data: movements } = await supabase
        .from('cash_movements')
        .select('type, amount')
        .eq('register_id', registerId);

      const { data: register } = await supabase
        .from('cash_registers')
        .select('opening_amount')
        .eq('id', registerId)
        .single();

      let expected = register?.opening_amount || 0;
      (movements || []).forEach((m: any) => {
        if (m.type === 'sale' || m.type === 'supply') expected += m.amount;
        if (m.type === 'withdrawal') expected -= m.amount;
      });

      const difference = closingAmount - expected;

      const { data, error } = await supabase
        .from('cash_registers')
        .update({
          closed_by: user!.id,
          closing_amount: closingAmount,
          expected_amount: expected,
          difference,
          status: 'closed',
          closed_at: new Date().toISOString(),
          notes: notes || null,
          next_day_opening_amount:
            nextDayOpeningAmount != null && !isNaN(nextDayOpeningAmount)
              ? nextDayOpeningAmount
              : null,
        })
        .eq('id', registerId)
        .select()
        .single();
      if (error) throw error;
      // Fire-and-forget admin notification (no UI feedback if it fails)
      supabase.functions.invoke('notify-accounting-events', {
        body: { event_type: 'cash_register_closed', register_id: registerId },
      }).catch((e) => console.warn('notify cash close failed:', e));
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-register'] });
      qc.invalidateQueries({ queryKey: ['cash-register-next-suggestion'] });
    },
  });
}

export function useAddCashMovement() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ registerId, type, amount, description }: { registerId: string; type: string; amount: number; description?: string }) => {
      const { data, error } = await supabase
        .from('cash_movements')
        .insert({
          register_id: registerId,
          type,
          amount,
          description: description || null,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['cash-movements', vars.registerId] });
    },
  });
}
