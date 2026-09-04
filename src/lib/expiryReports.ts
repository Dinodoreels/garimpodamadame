import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateBR, getDaysToExpiry, getExpiryStatus } from './expiry';

export interface ExpiryRow {
  productTitle: string;
  variantTitle: string | null;
  category: string | null;
  stock: number;
  expiryDate: string | null;
  alertDays: number;
}

function statusLabel(date: string | null, alertDays: number): string {
  const s = getExpiryStatus(date, alertDays);
  if (s === 'expired') return 'VENCIDO';
  if (s === 'expiring') return 'Vencendo';
  if (s === 'ok') return 'OK';
  return '—';
}

export function downloadExpiryCSV(rows: ExpiryRow[]) {
  const header = ['Produto', 'Variante', 'Categoria', 'Estoque', 'Validade', 'Dias Restantes', 'Status'];
  const escape = (v: any) => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(';')];
  rows.forEach((r) => {
    const days = getDaysToExpiry(r.expiryDate);
    lines.push(
      [
        r.productTitle,
        r.variantTitle ?? '',
        r.category ?? '',
        r.stock,
        formatDateBR(r.expiryDate),
        days ?? '',
        statusLabel(r.expiryDate, r.alertDays),
      ]
        .map(escape)
        .join(';')
    );
  });
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `validade-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadExpiryPDF(rows: ExpiryRow[], opts?: { storeName?: string; alertDays?: number }) {
  const doc = new jsPDF();
  const storeName = opts?.storeName || 'Loja';
  const today = new Date().toLocaleDateString('pt-BR');

  doc.setFontSize(16);
  doc.text('Relatório de Validade de Produtos', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${storeName} — Gerado em ${today}`, 14, 25);

  const expired = rows.filter((r) => getExpiryStatus(r.expiryDate, r.alertDays) === 'expired');
  const expiring = rows.filter((r) => getExpiryStatus(r.expiryDate, r.alertDays) === 'expiring');

  let startY = 32;

  const drawSection = (title: string, list: ExpiryRow[]) => {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`${title} (${list.length})`, 14, startY);
    startY += 4;
    autoTable(doc, {
      startY: startY + 2,
      head: [['Produto', 'Variante', 'Categoria', 'Estoque', 'Validade', 'Dias']],
      body: list.map((r) => [
        r.productTitle,
        r.variantTitle ?? '—',
        r.category ?? '—',
        String(r.stock),
        formatDateBR(r.expiryDate),
        String(getDaysToExpiry(r.expiryDate) ?? ''),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [40, 40, 40] },
      margin: { left: 14, right: 14 },
    });
    // @ts-ignore
    startY = (doc as any).lastAutoTable.finalY + 8;
  };

  drawSection('Vencidos', expired);
  if (startY > 250) {
    doc.addPage();
    startY = 20;
  }
  drawSection('Vencendo em breve', expiring);

  doc.save(`validade-${new Date().toISOString().slice(0, 10)}.pdf`);
}