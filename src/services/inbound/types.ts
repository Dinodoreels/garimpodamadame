// Tipos compartilhados do módulo Inbound Intelligence / Garimpo Scan.
// A interface nunca deve depender de um provedor específico (IA, pesquisa de
// mercado, etc.): tudo passa pela camada de services em src/services/inbound.

/** Estados possíveis de uma unidade/SKU dentro do fluxo de entrada. */
export const PRODUCT_STATES = [
  'RECEIVED',
  'TRIAGE',
  'QC_PENDING',
  'QC_APPROVED',
  'SCAN_PENDING',
  'IDENTIFIED',
  'PRICED',
  'ADDRESS_PENDING',
  'STOCKED',
  'AVAILABLE',
  'RESERVED',
  'PICKED',
  'PACKED',
  'SHIPPED',
  'RETURNED',
  'QUARANTINE',
  'REJECTED',
] as const;

export type ProductState = (typeof PRODUCT_STATES)[number];

/** Transições permitidas. Uma etapa só avança com os dados da anterior completos. */
export const PRODUCT_STATE_FLOW: Record<ProductState, ProductState[]> = {
  RECEIVED: ['TRIAGE', 'QUARANTINE', 'REJECTED'],
  TRIAGE: ['SCAN_PENDING', 'QC_PENDING', 'QUARANTINE', 'REJECTED'],
  SCAN_PENDING: ['IDENTIFIED', 'QUARANTINE', 'REJECTED'],
  IDENTIFIED: ['QC_PENDING', 'PRICED', 'QUARANTINE'],
  QC_PENDING: ['QC_APPROVED', 'QUARANTINE', 'REJECTED'],
  QC_APPROVED: ['PRICED', 'ADDRESS_PENDING'],
  PRICED: ['ADDRESS_PENDING'],
  ADDRESS_PENDING: ['STOCKED'],
  STOCKED: ['AVAILABLE', 'QUARANTINE'],
  AVAILABLE: ['RESERVED', 'QUARANTINE'],
  RESERVED: ['PICKED', 'AVAILABLE'],
  PICKED: ['PACKED', 'AVAILABLE'],
  PACKED: ['SHIPPED'],
  SHIPPED: ['RETURNED'],
  RETURNED: ['TRIAGE', 'QUARANTINE'],
  QUARANTINE: ['TRIAGE', 'REJECTED', 'AVAILABLE'],
  REJECTED: [],
};

export function canTransition(from: ProductState, to: ProductState) {
  return PRODUCT_STATE_FLOW[from]?.includes(to) ?? false;
}

/** Classificação de condição usada em SKU, QC e regras de canal. */
export const CONDITIONS = {
  T1: { label: 'T1 · Novo lacrado', blocked: false },
  T2: { label: 'T2 · Novo, caixa avariada', blocked: false },
  O1: { label: 'O1 · Caixa aberta', blocked: false },
  U1: { label: 'U1 · Usado excelente', blocked: false },
  R1: { label: 'R1 · Recondicionado', blocked: false },
  D1: { label: 'D1 · Defeito / reparo', blocked: false },
  Q: { label: 'Q · Quarentena', blocked: true },
} as const;

export type ConditionCode = keyof typeof CONDITIONS;

export type ReceiptStatus = 'open' | 'processing' | 'closed' | 'cancelled';
export type LotStatus = 'open' | 'processing' | 'closed' | 'cancelled';

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  open: 'Aberto',
  processing: 'Em processamento',
  closed: 'Finalizado',
  cancelled: 'Cancelado',
};

export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  open: 'Aberto',
  processing: 'Em processamento',
  closed: 'Fechado',
  cancelled: 'Cancelado',
};

export interface TruckReceipt {
  id: string;
  code: string;
  received_date: string;
  received_time: string;
  supplier_id: string | null;
  origin_name: string | null;
  carrier: string | null;
  truck_plate: string | null;
  driver_name: string | null;
  document_number: string | null;
  invoice_number: string | null;
  estimated_quantity: number;
  lot_value: number;
  notes: string | null;
  status: ReceiptStatus | string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lots?: Lot[];
}

export interface Lot {
  id: string;
  code: string;
  receipt_id: string | null;
  description: string | null;
  status: LotStatus | string;
  expected_units: number;
  processed_units: number;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  truck_receipts?: Pick<TruckReceipt, 'id' | 'code' | 'received_date'> | null;
}

export interface ReceiptAttachment {
  id: string;
  receipt_id: string | null;
  lot_id: string | null;
  kind: 'photo' | 'document' | string;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_by: string | null;
  created_at: string;
}

export interface InboundEvent {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  before_data: unknown;
  after_data: unknown;
  actor_id: string | null;
  source: string;
  created_at: string;
}

export type ReceiptInput = Partial<Omit<TruckReceipt, 'id' | 'code' | 'created_at' | 'updated_at'>>;
export type LotInput = Partial<Omit<Lot, 'id' | 'code' | 'created_at' | 'updated_at'>>;
