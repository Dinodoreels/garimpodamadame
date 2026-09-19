type AdminClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

export type StockTransitionResult = {
  ok: boolean;
  blocked?: boolean;
  processed?: number;
  pending?: Array<Record<string, unknown>>;
  reason?: string;
  status?: string;
};

/** Applies an idempotent, transactional debit or return for the order's current status. */
export async function applyOrderStock(
  supa: AdminClient,
  orderId: string,
  source: string,
): Promise<StockTransitionResult> {
  const { data, error } = await supa.rpc("apply_order_stock_transition", {
    p_order_id: orderId,
    p_source: source,
  });
  if (error) throw new Error(`Falha ao contabilizar estoque do pedido: ${error.message}`);
  return (data ?? { ok: true, processed: 0 }) as StockTransitionResult;
}