import { AnalyticsData } from '@/hooks/useAnalytics';

function escapeValue(value: string | number) {
  const stringValue = String(value ?? '');
  if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function exportAnalyticsCSV(data: AnalyticsData) {
  const rows: Array<Array<string | number>> = [
    ['Analytics', data.rangeLabel],
    [],
    ['KPIs'],
    ['Métrica', 'Atual', 'Anterior', 'Variação %'],
    ['Visitantes únicos', Math.round(data.kpis.uniqueVisitors.value), Math.round(data.kpis.uniqueVisitors.previousValue), data.kpis.uniqueVisitors.change.toFixed(1)],
    ['Visualizações', Math.round(data.kpis.pageViews.value), Math.round(data.kpis.pageViews.previousValue), data.kpis.pageViews.change.toFixed(1)],
    ['Sessões', Math.round(data.kpis.sessions.value), Math.round(data.kpis.sessions.previousValue), data.kpis.sessions.change.toFixed(1)],
    ['Páginas / sessão', data.kpis.pagesPerSession.value.toFixed(1), data.kpis.pagesPerSession.previousValue.toFixed(1), data.kpis.pagesPerSession.change.toFixed(1)],
    ['Taxa de conversão', data.kpis.conversionRate.value.toFixed(1), data.kpis.conversionRate.previousValue.toFixed(1), data.kpis.conversionRate.change.toFixed(1)],
    ['Bounce rate', data.kpis.bounceRate.value.toFixed(1), data.kpis.bounceRate.previousValue.toFixed(1), data.kpis.bounceRate.change.toFixed(1)],
    [],
    ['Funil de compra'],
    ['Etapa', 'Quantidade'],
    ['Foram para o carrinho', data.commerceFunnel.cartSessions],
    ['Foram para o checkout', data.commerceFunnel.ordersCreated],
    ['Finalizaram a compra', data.commerceFunnel.ordersPaid],
    [],
    ['Série diária'],
    ['Data', 'Visualizações', 'Sessões'],
    ...data.daily.map((item) => [item.date, item.views, item.sessions]),
    [],
    ['Top páginas'],
    ['Página', 'Views', 'Saídas', 'Taxa de saída %'],
    ...data.topPages.map((item) => [item.path, item.views, item.exits, item.exitRate.toFixed(1)]),
    [],
    ['Campanhas'],
    ['Fonte', 'Meio', 'Campanha', 'Sessões'],
    ...data.campaigns.map((item) => [item.source, item.medium, item.campaign, item.sessions]),
    [],
    ['Top produtos visualizados'],
    ['#', 'Produto', 'Handle', 'Preço', 'Estoque', 'Views', 'Visitantes únicos', 'Carrinho', 'Checkout', 'Finalizadas'],
    ...data.topProducts.map((item, idx) => [idx + 1, item.title, item.handle, item.price.toFixed(2), item.stock, item.views, item.uniqueViewers, item.cartSessions, item.checkoutOrders, item.paidOrders]),
  ];

  const csv = rows.map((row) => row.map(escapeValue).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `analytics-${data.rangeLabel.replace(/[^0-9-]/g, '') || 'periodo'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
