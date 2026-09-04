import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { OrdersTable } from '@/components/admin/OrdersTable';
import { useAdminData } from '@/hooks/useAdminData';
import { useMyStoreRole } from '@/hooks/useStores';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SellerOrders() {
  const { user } = useAuth();
  const { data: storeInfo } = useMyStoreRole();
  const { orders, loading, updateOrderStatus } = useAdminData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isGerente = storeInfo?.role === 'gerente';

  // Filter orders based on role
  const roleFilteredOrders = orders.filter(o => {
    if (isGerente && storeInfo?.storeId) {
      return o.store_id === storeInfo.storeId || o.created_by === user?.id;
    }
    return o.created_by === user?.id;
  });

  const filteredOrders = roleFilteredOrders.filter((order) => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.profile?.full_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-light tracking-wide">Pedidos</h1>
        <p className="text-sm text-muted-foreground font-light mt-1">
          {isGerente ? 'Todos os pedidos da loja' : 'Seus pedidos'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 font-light"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 font-light">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="payment_failed">Pagamento Falhou</SelectItem>
            <SelectItem value="processing">Processando</SelectItem>
            <SelectItem value="shipped">Enviado</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <OrdersTable orders={filteredOrders} onStatusChange={updateOrderStatus} />

      {/* Summary */}
      <div className="text-sm text-muted-foreground font-light">
        {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'} encontrado{filteredOrders.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
