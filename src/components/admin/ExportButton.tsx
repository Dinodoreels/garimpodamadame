import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminOrder, AdminCustomer } from '@/hooks/useAdminData';
import { toast } from 'sonner';

interface ExportButtonProps {
  orders?: AdminOrder[];
  customers?: AdminCustomer[];
}

export function ExportButton({ orders, customers }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return value.toFixed(2).replace('.', ',');
  };

  const downloadCSV = (content: string, filename: string) => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportOrders = () => {
    if (!orders || orders.length === 0) {
      toast.error('Nenhum pedido para exportar');
      return;
    }

    setExporting(true);

    try {
      const headers = [
        'Número do Pedido',
        'Data',
        'Cliente',
        'Telefone',
        'Status',
        'Subtotal',
        'Frete',
        'Desconto',
        'Total',
        'Código de Rastreio',
        'Itens',
      ];

      const rows = orders.map(order => {
        const items = order.order_items
          ?.map((item: any) => `${item.product_title} (${item.quantity}x)`)
          .join('; ') || '';

        return [
          order.order_number,
          formatDate(order.created_at),
          order.profile?.full_name || '-',
          order.profile?.phone || '-',
          order.status,
          formatCurrency(order.subtotal),
          formatCurrency(order.shipping_cost),
          formatCurrency((order as any).discount_amount || 0),
          formatCurrency(order.total),
          (order as any).tracking_code || '-',
          `"${items}"`,
        ];
      });

      const csv = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(csv, `pedidos_${date}.csv`);
      
      toast.success(`${orders.length} pedidos exportados`);
    } catch (error) {
      toast.error('Erro ao exportar pedidos');
    } finally {
      setExporting(false);
    }
  };

  const exportCustomers = () => {
    if (!customers || customers.length === 0) {
      toast.error('Nenhum cliente para exportar');
      return;
    }

    setExporting(true);

    try {
      const headers = [
        'Nome',
        'Email',
        'Telefone',
        'CPF',
        'Data de Nascimento',
        'Total de Pedidos',
        'Total Gasto',
        'Cadastro',
      ];

      const rows = customers.map(customer => [
        customer.full_name || '-',
        customer.email || '-',
        customer.phone || '-',
        customer.cpf || '-',
        customer.birth_date ? formatDate(customer.birth_date) : '-',
        customer.orders_count || 0,
        formatCurrency(customer.total_spent || 0),
        formatDate(customer.created_at),
      ]);

      const csv = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(csv, `clientes_${date}.csv`);
      
      toast.success(`${customers.length} clientes exportados`);
    } catch (error) {
      toast.error('Erro ao exportar clientes');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {orders && (
          <DropdownMenuItem onClick={exportOrders}>
            Exportar Pedidos (CSV)
          </DropdownMenuItem>
        )}
        {customers && (
          <DropdownMenuItem onClick={exportCustomers}>
            Exportar Clientes (CSV)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
