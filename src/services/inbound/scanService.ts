// Camada de acesso do Garimpo Scan. Funciona tanto no painel (usuário logado)
// quanto no tablet do galpão (token de operador), sem duplicar telas.
import { supabase } from '@/integrations/supabase/client';

export const OPERATOR_TOKEN_KEY = 'garimpo-operator-token';

export interface ScanLot {
  id: string;
  code: string;
  description: string | null;
  status: string;
  expected_units: number;
  processed_units: number;
}

export interface IdentifyResult {
  ok: boolean;
  source?: 'catalog' | 'cosmos' | 'google_lens' | 'external';
  confidence?: number;
  error?: string;
  match?: {
    product_id: string | null;
    variant_id: string | null;
    sku: string | null;
    title: string | null;
    brand: string | null;
    category: string | null;
    price: number | null;
    cost: number | null;
  };
  result?: {
    title: string;
    brand: string | null;
    category: string | null;
    description: string | null;
    color: string | null;
    size: string | null;
    condition_guess: string | null;
    estimated_price_brl: number | null;
    confidence: number;
    reasoning_note: string | null;
    price?: number | null;
    source?: string;
  };
  candidates?: Array<Record<string, unknown>>;
  result_ids?: string[];
  needs_review?: boolean;
  warnings?: string[];
}

export interface SaveItemInput {
  lot_id: string;
  barcode?: string | null;
  quantity: number;
  condition_code: string;
  title?: string | null;
  brand?: string | null;
  category?: string | null;
  sku?: string | null;
  product_id?: string | null;
  variant_id?: string | null;
  suggested_price?: number | null;
  notes?: string | null;
  ai_source: 'catalog' | 'cosmos' | 'google_lens' | 'external' | 'manual';
  ai_confidence?: number | null;
  ai_data?: unknown;
  photo_base64?: string | null;
  identification_result_ids?: string[];
  force_review?: boolean;
}

function operatorHeaders() {
  const token = localStorage.getItem(OPERATOR_TOKEN_KEY);
  return token ? { 'x-operator-token': token } : undefined;
}

async function call<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const headers = operatorHeaders();
  const { data, error } = await supabase.functions.invoke(fn, { body, ...(headers ? { headers } : {}) });
  if (error) {
    // A função devolve mensagens em português no corpo — tenta ler antes de cair no genérico.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const parsed = await ctx.json();
        if (parsed?.error) throw new Error(parsed.error);
      } catch (e) {
        if (e instanceof Error && e.message) throw e;
      }
    }
    throw new Error(error.message || 'Falha na comunicação com o servidor.');
  }
  return data as T;
}

export const scanService = {
  listLots: () => call<{ ok: boolean; lots: ScanLot[] }>('inbound-scan', { action: 'lots' }).then(r => r.lots ?? []),

  lotStats: (lot_id: string) =>
    call<{ ok: boolean; scanned: number; pending: number }>('inbound-scan', { action: 'lot_stats', lot_id }),

  identify: (input: { barcode?: string; image_base64?: string; hint?: string }) =>
    call<IdentifyResult>('inbound-identify', input),

  save: (input: SaveItemInput) =>
    call<{ ok: boolean; item_id: string; state: string; pending: boolean }>('inbound-scan', {
      action: 'save',
      ...input,
    }),
};

export const operatorService = {
  login: async (code: string, pin: string) => {
    const res = await call<{
      ok: boolean; token: string; expires_at: string;
      operator: { id: string; code: string; name: string; role: string };
    }>('operator-auth', { action: 'login', code, pin });
    localStorage.setItem(OPERATOR_TOKEN_KEY, res.token);
    return res;
  },
  me: () => call<{ ok: boolean; operator: { operator_id: string; code: string; name: string; role: string } }>(
    'operator-auth', { action: 'me' },
  ),
  logout: async () => {
    try {
      await call('operator-auth', { action: 'logout' });
    } finally {
      localStorage.removeItem(OPERATOR_TOKEN_KEY);
    }
  },
  list: async () => {
    const { data, error } = await supabase
      .from('operators' as never)
      .select('id, code, name, role, is_active, last_login_at, created_at')
      .order('name');
    if (error) throw error;
    return (data ?? []) as unknown as {
      id: string; code: string; name: string; role: string;
      is_active: boolean; last_login_at: string | null; created_at: string;
    }[];
  },
  create: (input: { code: string; name: string; pin: string; role: string }) =>
    call('operator-auth', { action: 'create', ...input }),
  update: (input: { id: string; name?: string; role?: string; is_active?: boolean; pin?: string }) =>
    call('operator-auth', { action: 'update', ...input }),
  remove: (id: string) => call('operator-auth', { action: 'delete', id }),
};
