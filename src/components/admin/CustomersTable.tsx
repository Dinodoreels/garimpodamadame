import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminCustomer } from '@/hooks/useAdminData';
import { CustomerDetailsSheet } from './CustomerDetailsSheet';
import { Badge } from '@/components/ui/badge';

interface CustomersTableProps {
  customers: AdminCustomer[];
  onCustomerUpdated?: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  vendedor: 'Vendedor',
  consignador: 'Consignador',
  user: 'Cliente',
};

const ROLE_CLASS: Record<string, string> = {
  admin: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  vendedor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  consignador: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  user: 'bg-muted text-muted-foreground border-border',
};

export function CustomersTable({ customers, onCustomerUpdated }: CustomersTableProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleRowClick = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSheetOpen(true);
  };

  return (
    <>
      <div className="border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap">Nome</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap">Função</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap hidden md:table-cell">E-mail</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap hidden sm:table-cell">Telefone</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap hidden lg:table-cell">CPF</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap hidden md:table-cell">Cadastro</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center whitespace-nowrap">Pedidos</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-right whitespace-nowrap">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-light">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => handleRowClick(customer.id)}
                >
                  <TableCell className="font-medium whitespace-nowrap">
                    {customer.full_name || 'N/A'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="outline" className={`font-light text-[10px] tracking-wide uppercase ${ROLE_CLASS[customer.role || 'user']}`}>
                      {ROLE_LABEL[customer.role || 'user']}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-light text-muted-foreground hidden md:table-cell whitespace-nowrap max-w-[220px] truncate">
                    {customer.email || '-'}
                  </TableCell>
                  <TableCell className="font-light text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                    {customer.phone || '-'}
                  </TableCell>
                  <TableCell className="font-light text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                    {customer.cpf || '-'}
                  </TableCell>
                  <TableCell className="font-light text-muted-foreground hidden md:table-cell whitespace-nowrap">
                    {format(new Date(customer.created_at), "dd MMM yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-center font-light">
                    {customer.orders_count}
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {formatCurrency(customer.total_spent || 0)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CustomerDetailsSheet
        customerId={selectedCustomerId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdated={onCustomerUpdated}
      />
    </>
  );
}
