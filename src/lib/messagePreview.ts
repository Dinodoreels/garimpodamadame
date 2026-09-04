export const SAMPLE_VARS: Record<string, string> = {
  nome: 'Maria',
  numero_pedido: 'PI20260001',
  total: 'R$ 249,90',
  itens: '2x Vestido Floral',
  codigo_rastreio: 'BR123456789BR',
  link_rastreio: 'https://rastreio.exemplo.com/BR123456789BR',
  link_carrinho: 'https://loja.com/carrinho',
  link_avaliacao: 'https://loja.com/avaliar/PI20260001',
  link_loja: 'https://loja.com',
  cupom: 'VOLTA10',
  tempo_cliente: '2 anos',
};

export function fillTemplate(text: string, vars: Record<string, string> = SAMPLE_VARS): string {
  return (text || '').replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function autolink(s: string): string {
  return s.replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}" target="_blank" rel="noopener" style="color:#1a73e8;text-decoration:underline">${url}</a>`);
}

/** Renders WhatsApp-style formatting: *bold* _italic_ ~strike~ ```mono``` */
export function formatWhatsApp(text: string): string {
  let s = escapeHtml(fillTemplate(text));
  s = s.replace(/```([^`]+)```/g, '<code style="background:rgba(0,0,0,.06);padding:0 4px;border-radius:3px;font-family:monospace">$1</code>');
  s = s.replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|[.,!?])/g, '$1<strong>$2</strong>');
  s = s.replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,!?])/g, '$1<em>$2</em>');
  s = s.replace(/(^|\s)~([^~\n]+)~(?=\s|$|[.,!?])/g, '$1<span style="text-decoration:line-through">$2</span>');
  s = autolink(s);
  s = s.replace(/\n/g, '<br/>');
  return s;
}

/** Renders email body as plain text with line breaks + autolinks. */
export function formatEmailBody(text: string): string {
  let s = escapeHtml(fillTemplate(text));
  s = autolink(s);
  s = s.replace(/\n/g, '<br/>');
  return s;
}

export function fillSubject(text: string): string {
  return fillTemplate(text);
}