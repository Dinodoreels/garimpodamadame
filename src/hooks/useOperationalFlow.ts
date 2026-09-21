import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OperationalStage {
  key: string;
  title: string;
  description: string;
  count: number;
  status: 'ok' | 'attention' | 'blocked';
  action: string;
  path: string;
  details?: string[];
}

interface OperationalFlowData {
  stages: OperationalStage[];
  blocked: number;
  attention: number;
  warnings: string[];
  updatedAt: string;
}

type Row = Record<string, unknown>;

export function useOperationalFlow() {
  return useQuery<OperationalFlowData>({
    queryKey: ['operational-flow'],
    queryFn: async () => {
      const sources = [
        ['recebimentos', supabase.from('truck_receipts').select('id,status')],
        ['lotes', supabase.from('lots').select('id,status,expected_units,processed_units')],
        ['itens de entrada', supabase.from('inbound_items').select('id,state,quantity,location_id')],
        ['pendências de entrada', supabase.from('inbound_pendings').select('id,status')],
        ['posições físicas', supabase.from('warehouse_locations').select('id,is_active')],
        ['produtos', supabase.from('products').select('id,status,weight_grams,length_cm,width_cm,height_cm')],
        ['pedidos', supabase.from('orders').select('id,status,paid_at,shipping_address_id,source')],
        ['envios do site', supabase.from('melhor_envio_shipments').select('id,order_id,status,validation_status')],
        ['fila do Bling', supabase.from('bling_sync_queue').select('id,status,action,last_error,order_id,orders(order_number)')],
        ['publicações', supabase.from('marketplace_product_publications').select('id,status,pending_fields,last_error,products(title)')],
        ['reembolsos', supabase.from('refunds').select('id,status')],
        ['etiquetas de marketplace', supabase.from('marketplace_shipping_labels').select('id,order_id,status')],
      ] as const;
      const results = await Promise.all(sources.map(([, request]) => request));
      const warnings = results.flatMap((result, index) => result.error ? [`Não foi possível atualizar ${sources[index][0]}.`] : []);
      const rows = results.map(result => (result.data ?? []) as Row[]);
      const [receipts, lots, items, pendings, locations, products, orders, shipments, bling, publications, refunds, marketplaceLabels] = rows;
      const sum = (rows: Row[], field: string) => rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
      const where = (rows: Row[], field: string, values: string[]) => rows.filter(row => values.includes(String(row[field] ?? '')));
      const isMarketplace = (order: Row) => {
        const source = String(order.source ?? '').toLowerCase();
        return source.startsWith('bling:') || source.includes('marketplace') || source.includes('tiktok') || source.includes('shopify');
      };
      const isActionable = (order: Row) => Boolean(order.paid_at) && ['paid', 'processing'].includes(String(order.status));
      const paid = orders.filter(order => Boolean(order.paid_at) && !['cancelled', 'refunded'].includes(String(order.status)));
      const actionable = paid.filter(isActionable);
      const siteActionable = actionable.filter(order => !isMarketplace(order));
      const marketplaceActionable = actionable.filter(isMarketplace);
      const legacyPaid = paid.filter(order => !order.shipping_address_id);
      const shipmentOrders = new Set(shipments.map(shipment => String(shipment.order_id)));
      const marketplaceLabelOrders = new Set(marketplaceLabels.map(label => String(label.order_id)));
      const openLots = where(lots, 'status', ['open', 'processing']);
      const pendingUnits = Math.max(0, sum(openLots, 'expected_units') - sum(openLots, 'processed_units'));
      const triage = where(items, 'state', ['RECEIVED', 'TRIAGE', 'SCAN_PENDING']);
      const qc = where(items, 'state', ['IDENTIFIED', 'QC_PENDING']);
      const stock = where(items, 'state', ['QC_APPROVED', 'PRICED', 'ADDRESS_PENDING', 'STOCKED']);
      const activeProducts = where(products, 'status', ['active']);
      const incompleteShipping = activeProducts.filter(product => ['weight_grams', 'length_cm', 'width_cm', 'height_cm'].some(field => Number(product[field] ?? 0) <= 0));
      const siteWithoutShipment = siteActionable.filter(order => !shipmentOrders.has(String(order.id)));
      const marketplaceWithoutLabel = marketplaceActionable.filter(order => !marketplaceLabelOrders.has(String(order.id)));
      const blingFailed = where(bling, 'status', ['failed', 'error']);
      const publicationPending = where(publications, 'status', ['pending', 'queued', 'review', 'failed', 'error']);
      const refundPending = refunds.filter(refund => !['completed', 'cancelled', 'rejected'].includes(String(refund.status)));

      const stages: OperationalStage[] = [
        { key: 'receiving', title: '1. Chegada e recebimento', description: 'Cargas abertas aguardando conferência.', count: receipts.filter(row => !['closed', 'cancelled'].includes(String(row.status))).length, status: receipts.some(row => !['closed', 'cancelled'].includes(String(row.status))) ? 'attention' : 'ok', action: 'Abrir recebimentos', path: '/admin/inbound/receipts' },
        { key: 'lots', title: '2. Lotes', description: `${pendingUnits.toLocaleString('pt-BR')} unidades ainda não processadas.`, count: openLots.length, status: pendingUnits > 0 ? 'blocked' : 'ok', action: 'Processar lotes', path: '/admin/inbound/lots' },
        { key: 'triage', title: '3. Triagem e identificação', description: 'Itens aguardando leitura ou decisão humana.', count: triage.length + pendings.filter(row => String(row.status) === 'open').length, status: triage.length || pendings.some(row => String(row.status) === 'open') ? 'attention' : 'ok', action: 'Abrir triagem', path: '/admin/inbound/triage' },
        { key: 'qc', title: '4. Controle de qualidade', description: 'Itens identificados aguardando aprovação.', count: qc.length, status: qc.length ? 'attention' : 'ok', action: 'Conferir qualidade', path: '/admin/inbound/qc' },
        { key: 'address', title: '5. Endereçamento e estoque', description: locations.length ? 'Itens aguardando preço, posição ou guarda.' : 'Nenhuma posição física cadastrada.', count: stock.length, status: locations.length === 0 ? 'blocked' : stock.length ? 'attention' : 'ok', action: locations.length ? 'Organizar estoque' : 'Cadastrar posições', path: '/admin/inbound/locations' },
        { key: 'catalog', title: '6. Catálogo e embalagem', description: 'Produtos ativos sem peso ou medidas completas.', count: incompleteShipping.length, status: incompleteShipping.length ? 'blocked' : 'ok', action: 'Revisar produtos', path: '/admin/products' },
        { key: 'publish', title: '7. Bling e canais', description: `${blingFailed.length} falha(s) no Bling e ${publicationPending.length} publicação(ões) pendente(s).`, count: blingFailed.length + publicationPending.length, status: blingFailed.length ? 'blocked' : publicationPending.length ? 'attention' : 'ok', action: 'Abrir integrações', path: '/admin/settings?tab=bling', details: [
          ...blingFailed.map(row => {
            const order = row.orders as { order_number?: string } | null;
            return `${order?.order_number ?? 'Pedido'}: ${String(row.last_error ?? 'Falha sem detalhe')}`;
          }),
          ...publicationPending.map(row => {
            const product = row.products as { title?: string } | null;
            const pending = Array.isArray(row.pending_fields) && row.pending_fields.length ? `Faltam: ${row.pending_fields.join(', ')}` : String(row.last_error ?? 'Aguardando confirmação do canal');
            return `${product?.title ?? 'Produto'}: ${pending}`;
          }),
        ] },
        { key: 'orders', title: '8. Venda e separação', description: `${siteActionable.length} do site e ${marketplaceActionable.length} de marketplaces aguardam ação.`, count: actionable.length, status: actionable.length ? 'attention' : 'ok', action: 'Abrir fila de separação', path: '/admin/orders?operation=separation' },
        { key: 'shipping', title: '9. Fiscal, etiqueta e envio', description: `${siteWithoutShipment.length} envio(s) do site e ${marketplaceWithoutLabel.length} etiqueta(s) de marketplace pendentes.`, count: siteWithoutShipment.length + marketplaceWithoutLabel.length, status: siteWithoutShipment.length || marketplaceWithoutLabel.length ? 'blocked' : 'ok', action: 'Revisar expedição', path: '/admin/orders?operation=shipping' },
        { key: 'after-sales', title: '11. Pós-compra', description: 'Solicitações de reembolso aguardando conclusão.', count: refundPending.length, status: refundPending.length ? 'attention' : 'ok', action: 'Abrir pós-compra', path: '/admin/orders?operation=after-sales' },
        { key: 'restart', title: '12. Reinício do ciclo', description: 'Devoluções devem retornar para triagem antes do estoque.', count: where(items, 'state', ['RETURNED', 'QUARANTINE']).length, status: where(items, 'state', ['RETURNED', 'QUARANTINE']).length ? 'attention' : 'ok', action: 'Ver retornos', path: '/admin/inbound/triage' },
      ];
      if (legacyPaid.length > 0) {
        stages.splice(9, 0, { key: 'legacy', title: '10. Conciliação de pedidos antigos', description: 'Pedidos pagos sem endereço vinculado exigem revisão, sem baixa automática.', count: legacyPaid.length, status: 'attention', action: 'Revisar pedidos antigos', path: '/admin/orders?operation=reconciliation' });
      }
      return { stages, blocked: stages.filter(stage => stage.status === 'blocked').length, attention: stages.filter(stage => stage.status === 'attention').length, warnings, updatedAt: new Date().toISOString() };
    },
    refetchInterval: 60_000,
  });
}