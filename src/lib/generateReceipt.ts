interface ReceiptOrder {
  order_number: string;
  created_at: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: string;
  payment_method?: string;
  discount_code?: string;
  discount_amount?: number;
  shipping_address?: any;
}

interface ReceiptItem {
  product_title: string;
  variant_title?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ReceiptProfile {
  full_name?: string | null;
  cpf?: string | null;
  phone?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  payment_failed: 'Pagamento Falhou',
  processing: 'Processando',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  boleto: 'Boleto Bancário',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
};

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

export function generateReceiptText(
  order: ReceiptOrder,
  items: ReceiptItem[],
  profile?: ReceiptProfile | null,
  storeName = 'Loja'
): string {
  const lines: string[] = [];

  lines.push('📄 COMPROVANTE DE COMPRA');
  lines.push(`🏪 ${storeName}`);
  lines.push('');
  lines.push(`Pedido: #${order.order_number}`);
  lines.push(`Data: ${formatDate(order.created_at)}`);

  if (profile?.full_name) {
    lines.push(`Cliente: ${profile.full_name}`);
  }
  if (profile?.cpf) {
    lines.push(`CPF: ${profile.cpf}`);
  }

  lines.push('');
  lines.push('ITENS:');
  items.forEach((item) => {
    const variant = item.variant_title && item.variant_title !== 'Default Title' ? ` (${item.variant_title})` : '';
    lines.push(`- ${item.quantity}x ${item.product_title}${variant} - ${formatCurrency(item.unit_price)} = ${formatCurrency(item.total_price)}`);
  });

  lines.push('');
  lines.push(`Subtotal: ${formatCurrency(order.subtotal)}`);
  if (order.discount_amount && order.discount_amount > 0) {
    lines.push(`Desconto${order.discount_code ? ` (${order.discount_code})` : ''}: -${formatCurrency(order.discount_amount)}`);
  }
  lines.push(`Frete: ${formatCurrency(order.shipping_cost || 0)}`);
  lines.push(`*TOTAL: ${formatCurrency(order.total)}*`);

  lines.push('');
  lines.push(`Pagamento: ${order.payment_method ? PAYMENT_LABELS[order.payment_method] || order.payment_method : 'Não informado'}`);
  lines.push(`Status: ${STATUS_LABELS[order.status] || order.status}`);

  lines.push('');
  lines.push('Obrigado pela compra! 🙏');

  return lines.join('\n');
}

export function generateReceiptHTML(
  order: ReceiptOrder,
  items: ReceiptItem[],
  profile?: ReceiptProfile | null,
  storeName = 'Loja'
): string {
  const address = order.shipping_address;
  const discountAmount = order.discount_amount || 0;

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Comprovante - ${order.order_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; padding: 40px; max-width: 700px; margin: 0 auto; background: #fff; }
  .header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; font-weight: 700; letter-spacing: 2px; margin-bottom: 4px; }
  .header p { font-size: 12px; color: #666; }
  .title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 8px; margin-top: 24px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; }
  .info-grid .label { color: #888; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; padding: 8px 4px; border-bottom: 1px solid #ddd; }
  td { padding: 8px 4px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
  td:last-child, th:last-child { text-align: right; }
  .totals { margin-top: 16px; border-top: 1px solid #ddd; padding-top: 12px; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals .row.discount { color: #16a34a; }
  .totals .row.grand { font-size: 16px; font-weight: 700; border-top: 2px solid #1a1a1a; padding-top: 10px; margin-top: 8px; }
  .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #999; }
  .address-block { font-size: 13px; line-height: 1.6; }
  .actions { display: flex; justify-content: center; gap: 12px; padding: 16px 0 24px; }
  .actions button { padding: 10px 24px; font-size: 14px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; }
  .actions .btn-print { background: #1a1a1a; color: #fff; }
  .actions .btn-print:hover { background: #333; }
  .actions .btn-pdf { background: #fff; color: #1a1a1a; border: 2px solid #1a1a1a; }
  .actions .btn-pdf:hover { background: #f5f5f5; }
  @media print { body { padding: 20px; } .actions { display: none; } }
</style></head><body>

<div class="actions">
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
  <button class="btn-pdf" onclick="document.title='Comprovante_${order.order_number}';window.print()">📄 Salvar como PDF</button>
</div>

<div class="header">
  <h1>${storeName.toUpperCase()}</h1>
  <p>COMPROVANTE FISCAL DE COMPRA</p>
</div>

<div class="title">Dados do Pedido</div>
<div class="info-grid">
  <div><span class="label">Pedido:</span> #${order.order_number}</div>
  <div><span class="label">Data:</span> ${formatDateTime(order.created_at)}</div>
  <div><span class="label">Status:</span> ${STATUS_LABELS[order.status] || order.status}</div>
  <div><span class="label">Pagamento:</span> ${order.payment_method ? PAYMENT_LABELS[order.payment_method] || order.payment_method : 'N/A'}</div>
</div>

${profile ? `
<div class="title">Dados do Cliente</div>
<div class="info-grid">
  ${profile.full_name ? `<div><span class="label">Nome:</span> ${profile.full_name}</div>` : ''}
  ${profile.cpf ? `<div><span class="label">CPF:</span> ${profile.cpf}</div>` : ''}
  ${profile.phone ? `<div><span class="label">Telefone:</span> ${profile.phone}</div>` : ''}
</div>` : ''}

${address ? `
<div class="title">Endereço de Entrega</div>
<div class="address-block">
  ${address.recipient_name || ''}<br>
  ${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}<br>
  ${address.neighborhood}<br>
  ${address.city} - ${address.state}<br>
  CEP: ${address.zip_code}
</div>` : ''}

<div class="title">Itens</div>
<table>
  <thead><tr><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
  <tbody>
    ${items.map(i => `<tr>
      <td>${i.product_title}${i.variant_title && i.variant_title !== 'Default Title' ? ` <small style="color:#888">(${i.variant_title})</small>` : ''}</td>
      <td>${i.quantity}</td>
      <td>${formatCurrency(i.unit_price)}</td>
      <td>${formatCurrency(i.total_price)}</td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="totals">
  <div class="row"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
  ${discountAmount > 0 ? `<div class="row discount"><span>Desconto${order.discount_code ? ` (${order.discount_code})` : ''}</span><span>-${formatCurrency(discountAmount)}</span></div>` : ''}
  <div class="row"><span>Frete</span><span>${formatCurrency(order.shipping_cost || 0)}</span></div>
  <div class="row grand"><span>TOTAL</span><span>${formatCurrency(order.total)}</span></div>
</div>

<div class="footer">
  <p>Documento sem valor fiscal. Emitido em ${formatDateTime(new Date().toISOString())}.</p>
  <p style="margin-top: 4px;">Obrigado pela preferência!</p>
</div>


</body></html>`;
}
