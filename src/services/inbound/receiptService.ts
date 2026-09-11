import { supabase } from '@/integrations/supabase/client';
import { auditService } from './auditService';
import type { ReceiptAttachment, ReceiptInput, TruckReceipt } from './types';

export const INBOUND_BUCKET = 'inbound-docs';

export interface ReceiptFilters {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
}

export interface ReceiptService {
  list(filters?: ReceiptFilters): Promise<TruckReceipt[]>;
  get(id: string): Promise<TruckReceipt | null>;
  create(input: ReceiptInput & { createLot?: boolean }): Promise<TruckReceipt>;
  update(id: string, input: ReceiptInput): Promise<TruckReceipt>;
  remove(id: string): Promise<void>;
  listAttachments(receiptId: string): Promise<ReceiptAttachment[]>;
  upload(receiptId: string, file: File, kind: 'photo' | 'document'): Promise<void>;
  removeAttachment(attachment: ReceiptAttachment): Promise<void>;
  signedUrl(path: string): Promise<string | null>;
}

const SELECT = '*, lots(id, code, status, expected_units, processed_units)';

export const receiptService: ReceiptService = {
  async list(filters = {}) {
    let query = supabase
      .from('truck_receipts')
      .select(SELECT)
      .order('received_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters.from) query = query.gte('received_date', filters.from);
    if (filters.to) query = query.lte('received_date', filters.to);
    if (filters.search?.trim()) {
      const s = filters.search.trim();
      query = query.or(
        `code.ilike.%${s}%,origin_name.ilike.%${s}%,carrier.ilike.%${s}%,truck_plate.ilike.%${s}%,invoice_number.ilike.%${s}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as TruckReceipt[];
  },

  async get(id) {
    const { data, error } = await supabase.from('truck_receipts').select(SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as unknown as TruckReceipt) ?? null;
  },

  async create({ createLot, ...input }) {
    const { data, error } = await supabase
      .from('truck_receipts')
      .insert(input as never)
      .select(SELECT)
      .single();
    if (error) throw error;
    const receipt = data as unknown as TruckReceipt;

    if (createLot) {
      const { error: lotError } = await supabase.from('lots').insert({
        receipt_id: receipt.id,
        expected_units: receipt.estimated_quantity ?? 0,
        description: receipt.origin_name ?? null,
      } as never);
      if (lotError) throw lotError;
    }

    await auditService.log({ entityType: 'truck_receipt', entityId: receipt.id, action: 'create', after: receipt });
    return receipt;
  },

  async update(id, input) {
    const before = await receiptService.get(id);
    const { data, error } = await supabase
      .from('truck_receipts')
      .update(input as never)
      .eq('id', id)
      .select(SELECT)
      .single();
    if (error) throw error;
    const after = data as unknown as TruckReceipt;
    await auditService.log({ entityType: 'truck_receipt', entityId: id, action: 'update', before, after });
    return after;
  },

  async remove(id) {
    const before = await receiptService.get(id);
    const { error } = await supabase.from('truck_receipts').delete().eq('id', id);
    if (error) throw error;
    await auditService.log({ entityType: 'truck_receipt', entityId: id, action: 'delete', before });
  },

  async listAttachments(receiptId) {
    const { data, error } = await supabase
      .from('receipt_attachments')
      .select('*')
      .eq('receipt_id', receiptId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ReceiptAttachment[];
  },

  async upload(receiptId, file, kind) {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `receipts/${receiptId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(INBOUND_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (upErr) throw upErr;

    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from('receipt_attachments').insert({
      receipt_id: receiptId,
      kind,
      file_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      created_by: auth.user?.id ?? null,
    } as never);
    if (error) throw error;
  },

  async removeAttachment(attachment) {
    await supabase.storage.from(INBOUND_BUCKET).remove([attachment.file_path]);
    const { error } = await supabase.from('receipt_attachments').delete().eq('id', attachment.id);
    if (error) throw error;
  },

  async signedUrl(path) {
    const { data } = await supabase.storage.from(INBOUND_BUCKET).createSignedUrl(path, 60 * 10);
    return data?.signedUrl ?? null;
  },
};
