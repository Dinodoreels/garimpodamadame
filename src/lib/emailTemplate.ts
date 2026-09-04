export type EmailBlockType = 'banner' | 'products' | 'coupon' | 'cta' | 'divider';

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  content: any;
}

export interface EmailSettings {
  primaryColor: string;
  backgroundColor: string;
  contentBackground: string;
  width: number;
}

export const DEFAULT_SETTINGS: EmailSettings = {
  primaryColor: '#111111',
  backgroundColor: '#f5f5f5',
  contentBackground: '#ffffff',
  width: 600,
};

export function newBlock(type: EmailBlockType): EmailBlock {
  const id = Math.random().toString(36).slice(2, 10);
  switch (type) {
    case 'banner':
      return { id, type, content: { image: '', title: 'Sua chamada principal', subtitle: 'Subtítulo opcional', align: 'center', linkUrl: '' } };
    case 'products':
      return { id, type, content: { title: 'Confira', products: [] } };
    case 'coupon':
      return { id, type, content: { code: 'PROMO10', description: '10% de desconto', validUntil: '', accentColor: '#111111' } };
    case 'cta':
      return { id, type, content: { text: 'Texto do email aqui...', buttonText: 'Comprar agora', buttonUrl: 'https://', align: 'center' } };
    case 'divider':
      return { id, type, content: { height: 16 } };
  }
}

const esc = (s: string = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderBanner(c: any, s: EmailSettings) {
  const align = c.align || 'center';
  const inner = `
    ${c.image ? `<a href="${esc(c.linkUrl || '#')}" style="text-decoration:none;"><img src="${esc(c.image)}" width="${s.width}" alt="" style="display:block;width:100%;max-width:${s.width}px;height:auto;border:0;" /></a>` : ''}
    ${c.title ? `<h1 style="margin:24px 0 8px;font-family:Georgia,serif;font-size:28px;line-height:1.2;color:${s.primaryColor};text-align:${align};font-weight:400;">${esc(c.title)}</h1>` : ''}
    ${c.subtitle ? `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#555;text-align:${align};">${esc(c.subtitle)}</p>` : ''}
  `;
  return `<tr><td style="padding:0 24px 24px;">${inner}</td></tr>`;
}

function renderProducts(c: any, s: EmailSettings) {
  const products = c.products || [];
  if (!products.length) {
    return `<tr><td style="padding:0 24px 24px;text-align:center;color:#999;font-family:Arial,sans-serif;font-size:13px;">[Nenhum produto selecionado]</td></tr>`;
  }
  const rows: string[] = [];
  for (let i = 0; i < products.length; i += 2) {
    const a = products[i];
    const b = products[i + 1];
    const cell = (p: any) => p ? `
      <td width="50%" valign="top" style="padding:8px;">
        <a href="${esc(p.url || '#')}" style="text-decoration:none;color:#111;">
          ${p.image ? `<img src="${esc(p.image)}" width="260" alt="" style="display:block;width:100%;max-width:260px;height:auto;border:0;" />` : ''}
          <div style="font-family:Arial,sans-serif;font-size:14px;margin-top:8px;color:#111;">${esc(p.title || '')}</div>
          <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:bold;margin-top:4px;color:${s.primaryColor};">${esc(p.price || '')}</div>
        </a>
      </td>
    ` : '<td width="50%"></td>';
    rows.push(`<tr>${cell(a)}${cell(b)}</tr>`);
  }
  return `<tr><td style="padding:0 16px 24px;">
    ${c.title ? `<h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:20px;color:${s.primaryColor};text-align:center;font-weight:400;padding:0 8px;">${esc(c.title)}</h2>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows.join('')}</table>
  </td></tr>`;
}

function renderCoupon(c: any, s: EmailSettings) {
  return `<tr><td style="padding:0 24px 24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center" style="border:2px dashed ${esc(c.accentColor || s.primaryColor)};padding:24px;background:#fafafa;">
        <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;color:#666;text-transform:uppercase;">Use o cupom</div>
        <div style="font-family:Georgia,serif;font-size:32px;font-weight:bold;color:${esc(c.accentColor || s.primaryColor)};margin:8px 0;letter-spacing:3px;">${esc(c.code || '')}</div>
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#333;">${esc(c.description || '')}</div>
        ${c.validUntil ? `<div style="font-family:Arial,sans-serif;font-size:12px;color:#999;margin-top:6px;">Válido até ${esc(c.validUntil)}</div>` : ''}
      </td></tr>
    </table>
  </td></tr>`;
}

function renderCTA(c: any, s: EmailSettings) {
  const align = c.align || 'center';
  const paragraphs = String(c.text || '').split('\n').filter(Boolean)
    .map((p: string) => `<p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;text-align:${align};">${esc(p)}</p>`)
    .join('');
  const button = c.buttonText ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${align}" style="margin:16px auto 0;">
      <tr><td style="background:${s.primaryColor};padding:14px 28px;">
        <a href="${esc(c.buttonUrl || '#')}" style="font-family:Arial,sans-serif;font-size:14px;color:#fff;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">${esc(c.buttonText)}</a>
      </td></tr>
    </table>
  ` : '';
  return `<tr><td style="padding:0 24px 24px;text-align:${align};">${paragraphs}${button}</td></tr>`;
}

function renderDivider(c: any) {
  const h = c.height || 16;
  return `<tr><td style="padding:0 24px;"><div style="height:${h}px;line-height:${h}px;border-top:1px solid #eee;">&nbsp;</div></td></tr>`;
}

export function buildEmailHtml(blocks: EmailBlock[], settings: EmailSettings, preheader = ''): string {
  const body = blocks.map((b) => {
    switch (b.type) {
      case 'banner': return renderBanner(b.content, settings);
      case 'products': return renderProducts(b.content, settings);
      case 'coupon': return renderCoupon(b.content, settings);
      case 'cta': return renderCTA(b.content, settings);
      case 'divider': return renderDivider(b.content);
      default: return '';
    }
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title></title></head>
<body style="margin:0;padding:0;background:${settings.backgroundColor};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</div>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${settings.backgroundColor};">
<tr><td align="center" style="padding:24px 8px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${settings.width}" style="max-width:${settings.width}px;width:100%;background:${settings.contentBackground};">
<tr><td style="padding:24px 24px 8px;text-align:center;font-family:Georgia,serif;font-size:13px;letter-spacing:4px;color:${settings.primaryColor};text-transform:uppercase;">Vanguard Store</td></tr>
${body}
<tr><td style="padding:24px;text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#999;border-top:1px solid #eee;">
Você recebeu este email porque é cliente da nossa loja.<br>
<a href="{{unsubscribe_url}}" style="color:#999;">Cancelar inscrição</a>
</td></tr>
</table></td></tr></table></body></html>`;
}
