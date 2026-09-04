import { format } from 'date-fns';
import { AdminCustomer } from '@/hooks/useAdminData';

export interface CustomerAddressRow {
  user_id: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
  created_at: string;
}

function escapeValue(value: string | number | null | undefined) {
  const stringValue = String(value ?? '');
  if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function formatAddress(addr?: CustomerAddressRow | null) {
  if (!addr) return '';
  const parts = [
    `${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}`,
    addr.neighborhood,
    `${addr.city}/${addr.state}`,
    `CEP ${addr.zip_code}`,
  ];
  return parts.filter(Boolean).join(' - ');
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function exportCustomersCSV(
  customers: AdminCustomer[],
  addressesByUser: Record<string, CustomerAddressRow>,
) {
  const header = ['Nome', 'CPF', 'Telefone', 'E-mail', 'Cadastro', 'Pedidos', 'Total Gasto', 'Endereço'];
  const rows: Array<Array<string | number>> = [
    header,
    ...customers.map((c) => [
      c.full_name || '',
      c.cpf || '',
      c.phone || '',
      c.email || '',
      c.created_at ? format(new Date(c.created_at), 'dd/MM/yyyy') : '',
      c.orders_count ?? 0,
      formatCurrency(c.total_spent || 0),
      formatAddress(addressesByUser[c.id]),
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeValue).join(';')).join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `usuarios-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}