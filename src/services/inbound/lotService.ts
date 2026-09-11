import { supabase } from '@/integrations/supabase/client';
import { auditService } from './auditService';
import type { Lot, LotInput } from './types';

export interface LotFilters {
  search?: string;
  status?: string;
  receiptId?: string;
}

export interface LotService {
  list(filters?: LotFilters): Promise<Lot[]>;
  get(id: string): Promise<Lot | null>;
  create(input: LotInput): Promise<Lot>;
  update(id: string, input: LotInput): Promise<Lot>;
  close(id: string): Promise<Lot>;
  reopen(id: string): Promise<Lot>;
  remove(id: string): Promise<void>;
}

const SELECT = '*, truck_receipts(id, code, received_date)';

export const lotService: LotService = {
  async list(filters = {}) {
    let query = supabase.from('lots').select(SELECT).order('created_at', { ascending: false });
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters.receiptId) query = query.eq('receipt_id', filters.receiptId);
    if (filters.search?.trim()) query = query.ilike('code', `%${filters.search.trim()}%`);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as Lot[];
  },

  async get(id) {
    const { data, error } = await supabase.from('lots').select(SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as unknown as Lot) ?? null;
  },

  async create(input) {
    const { data, error } = await supabase.from('lots').insert(input as never).select(SELECT).single();
    if (error) throw error;
    const lot = data as unknown as Lot;
    await auditService.log({ entityType: 'lot', entityId: lot.id, action: 'create', after: lot });
    return lot;
  },

  async update(id, input) {
    const before = await lotService.get(id);
    const { data, error } = await supabase.from('lots').update(input as never).eq('id', id).select(SELECT).single();
    if (error) throw error;
    const after = data as unknown as Lot;
    await auditService.log({ entityType: 'lot', entityId: id, action: 'update', before, after });
    return after;
  },

  async close(id) {
    return lotService.update(id, { status: 'closed', closed_at: new Date().toISOString() });
  },

  async reopen(id) {
    return lotService.update(id, { status: 'open', closed_at: null });
  },

  async remove(id) {
    const before = await lotService.get(id);
    const { error } = await supabase.from('lots').delete().eq('id', id);
    if (error) throw error;
    await auditService.log({ entityType: 'lot', entityId: id, action: 'delete', before });
  },
};
