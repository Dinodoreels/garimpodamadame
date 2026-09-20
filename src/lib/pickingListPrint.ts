import type { AdminOrder } from '@/hooks/useAdminData';

type PickingItem = {
  key: string;
  title: string;
  variant: string;
  sku: string;
  quantity: number;
  imageUrl: string;
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const itemFromOrder = (item: any): PickingItem => ({
  key: String(item.sku || `${item.product_id || item.product_title}:${item.variant_id || item.variant_title || ''}`),
  title: String(item.product_title || 'Produto sem nome'),
  variant: String(item.variant_title || ''),
  sku: String(item.sku || 'Não informado'),
  quantity: Math.max(0, Number(item.quantity) || 0),
  imageUrl: String(item.image_url || ''),
});

const itemImage = (item: PickingItem) => item.imageUrl
  ? `<img src="${escapeHtml(item.imageUrl)}" alt="" />`
  : '<div class="no-image">Sem foto</div>';

const itemDescription = (item: PickingItem) => `
  <div class="item-copy">
    <strong>${escapeHtml(item.title)}</strong>
    ${item.variant ? `<span>${escapeHtml(item.variant)}</span>` : ''}
    <span>SKU: ${escapeHtml(item.sku)}</span>
  </div>`;

const summaryRows = (items: PickingItem[]) => items.map((item) => `
  <tr>
    <td class="check">□</td>
    <td class="photo">${itemImage(item)}</td>
    <td>${itemDescription(item)}</td>
    <td class="quantity">${item.quantity}</td>
  </tr>`).join('');

const orderPage = (order: AdminOrder) => {
  const items = (order.order_items ?? []).map(itemFromOrder).filter(item => item.quantity > 0);
  const customerName = order.profile?.full_name || (order as any).guest_info?.name || 'Não informado';
  const source = order.bling_channel || String(order.source ?? 'Site').replace(/^bling:/, '') || 'Plataforma';
  return `
    <section class="order-page page-break">
      <header class="order-header">
        <div><p class="eyebrow">SEPARAÇÃO POR PEDIDO</p><h2>Pedido ${escapeHtml(order.order_number)}</h2></div>
        <div class="order-checks"><span>□ Separado</span><span>□ Conferido</span><span>□ Embalado</span></div>
      </header>
      <div class="order-meta">
        <span><b>Cliente:</b> ${escapeHtml(customerName)}</span>
        <span><b>Origem:</b> ${escapeHtml(source)}</span>
        <span><b>Data:</b> ${new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
        <span><b>Volumes:</b> ______</span>
      </div>
      <table>
        <thead><tr><th class="check">OK</th><th class="photo">Foto</th><th>Produto</th><th class="quantity">Qtd.</th></tr></thead>
        <tbody>${summaryRows(items)}</tbody>
      </table>
      <footer><span>Responsável: ______________________________</span><span>Horário: ______:______</span></footer>
    </section>`;
};

export function openPickingListPrint(orders: AdminOrder[]) {
  const eligibleOrders = orders
    .filter(order => !['cancelled', 'refunded', 'delivered', 'shipped', 'payment_failed'].includes(order.status))
    .filter(order => (order.order_items ?? []).some(item => Number(item.quantity) > 0))
    .slice(0, 50);

  if (!eligibleOrders.length) return null;

  const aggregate = new Map<string, PickingItem>();
  for (const order of eligibleOrders) {
    for (const rawItem of order.order_items ?? []) {
      const item = itemFromOrder(rawItem);
      if (!item.quantity) continue;
      const existing = aggregate.get(item.key);
      if (existing) existing.quantity += item.quantity;
      else aggregate.set(item.key, { ...item });
    }
  }
  const items = [...aggregate.values()].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const target = window.open('', '_blank');
  if (!target) return false;

  target.document.open();
  target.document.write(`<!doctype html>
    <html lang="pt-BR"><head><meta charset="utf-8" /><title>Lista de separação</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #171717; font: 12px Arial, sans-serif; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 22px; } h2 { font-size: 20px; }
      .eyebrow { margin-bottom: 4px; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; }
      .summary-header, .order-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 16px; border-bottom: 2px solid #171717; padding-bottom: 12px; }
      .stats, .order-checks { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px 16px; font-weight: 700; }
      .order-meta { display: grid; grid-template-columns: 1.4fr 1fr; gap: 8px 24px; margin-bottom: 14px; padding: 10px; border: 1px solid #a3a3a3; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #ededed; text-align: left; font-size: 10px; text-transform: uppercase; }
      th, td { border: 1px solid #a3a3a3; padding: 7px; vertical-align: middle; }
      tr { break-inside: avoid; }
      .check { width: 34px; text-align: center; font-size: 20px; }
      .photo { width: 60px; text-align: center; }
      .photo img, .no-image { width: 44px; height: 44px; object-fit: cover; border: 1px solid #d4d4d4; }
      .no-image { display: grid; place-items: center; color: #737373; font-size: 8px; }
      .item-copy { display: grid; gap: 3px; } .item-copy span { color: #525252; font-size: 10px; }
      .quantity { width: 54px; text-align: center; font-size: 17px; font-weight: 700; }
      .page-break { break-before: page; }
      footer { display: flex; justify-content: space-between; gap: 20px; margin-top: 18px; border-top: 1px solid #a3a3a3; padding-top: 14px; }
      .screen-actions { position: fixed; right: 18px; bottom: 18px; }
      .screen-actions button { border: 0; background: #171717; color: #fff; padding: 12px 18px; cursor: pointer; font-weight: 700; }
      @media print { .screen-actions { display: none; } }
    </style></head><body>
      <section>
        <header class="summary-header">
          <div><p class="eyebrow">O GARIMPO DIGITAL</p><h1>Lista geral de separação</h1><p>Produtos somados dos pedidos selecionados</p></div>
          <div class="stats"><span>${eligibleOrders.length} pedido(s)</span><span>${items.length} produto(s)</span><span>${totalUnits} unidade(s)</span></div>
        </header>
        <table><thead><tr><th class="check">OK</th><th class="photo">Foto</th><th>Produto</th><th class="quantity">Total</th></tr></thead><tbody>${summaryRows(items)}</tbody></table>
      </section>
      ${eligibleOrders.map(orderPage).join('')}
      <div class="screen-actions"><button type="button" onclick="window.print()">Imprimir ou salvar PDF</button></div>
    </body></html>`);
  target.document.close();
  return true;
}