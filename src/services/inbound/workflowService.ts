import { supabase } from '@/integrations/supabase/client';

export interface InboundItem {
  id: string; state: string; condition_code: string; barcode: string | null; quantity: number;
  sku: string | null; title: string | null; brand: string | null; category: string | null;
  photo_path: string | null; ai_source: string | null; ai_confidence: number | null;
  cost: number | null; suggested_price: number | null; approved_price: number | null;
  location_id: string | null; created_at: string; updated_at: string;
  lots?: { code: string } | null; warehouse_locations?: { code: string } | null;
}

export interface WarehouseLocation {
  id: string; code: string; zone: string | null; aisle: string | null; rack: string | null;
  shelf: string | null; bin: string | null; description: string | null; capacity: number | null; is_active: boolean;
}

export interface InboundUser { id: string; email: string | null; full_name: string | null; role: string }

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('inbound-workflow', { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = await context.json().catch(() => null);
      if (payload?.error) throw new Error(payload.error);
    }
    throw error;
  }
  return data as T;
}

export const workflowService = {
  list: (states?: string[]) => call<{ ok: boolean; items: InboundItem[] }>({ action: 'list', states }).then(r => r.items),
  detail: (item_id: string) => call<Record<string, unknown> & { item: InboundItem }>({ action: 'detail', item_id }),
  locations: () => call<{ locations: WarehouseLocation[] }>({ action: 'locations' }).then(r => r.locations),
  createLocation: (input: Record<string, unknown>) => call({ action: 'create_location', ...input }),
  triage: (item_id: string, notes?: string) => call({ action: 'triage', item_id, notes }),
  qc: (item_id: string, decision: string, notes?: string, checklist?: Record<string, boolean>) => call({ action: 'qc', item_id, decision, notes, checklist }),
  price: (item_id: string, price: number, reason?: string) => call({ action: 'price', item_id, price, reason }),
  address: (item_id: string, location_id: string) => call({ action: 'address', item_id, location_id }),
  stock: (item_id: string) => call({ action: 'stock', item_id }),
  release: (item_id: string, title: string, sku: string, price: number, notes?: string) => call({ action: 'release', item_id, title, sku, price, notes }),
  resolvePending: (pending_id: string, item_id: string, title: string, sku: string) => call({ action: 'resolve_pending', pending_id, item_id, title, sku }),
  users: () => call<{ users: InboundUser[] }>({ action: 'users' }).then(r => r.users),
  assignRole: (user_id: string, role: string) => call({ action: 'assign_role', user_id, role }),
  uploadPhoto: (item_id: string, photo_base64: string, kind: string, caption?: string) => call({ action: 'upload_photo', item_id, photo_base64, kind, caption }),
};