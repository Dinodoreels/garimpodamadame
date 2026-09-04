import { useState } from 'react';
import { Search, UserPlus, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomersTable } from '@/components/admin/CustomersTable';
import { NewCustomerDialog } from '@/components/admin/NewCustomerDialog';
import { useAdminData } from '@/hooks/useAdminData';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { exportCustomersCSV, CustomerAddressRow } from '@/lib/customers-export';
import { toast } from 'sonner';

export default function Customers() {
  const { customers, loading, refetch } = useAdminData();
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'vendedor' | 'consignador' | 'user'>('all');
  const [exporting, setExporting] = useState(false);

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      customer.full_name?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.cpf?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower);
    const matchesRole = roleFilter === 'all' || (customer.role || 'user') === roleFilter;
    return matchesSearch && matchesRole;
  });

  const counts = customers.reduce(
    (acc, c) => {
      const r = c.role || 'user';
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const filterChips: { value: typeof roleFilter; label: string }[] = [
    { value: 'all', label: `Todos (${customers.length})` },
    { value: 'admin', label: `Admins (${counts.admin || 0})` },
    { value: 'vendedor', label: `Vendedores (${counts.vendedor || 0})` },
    { value: 'consignador', label: `Consignadores (${counts.consignador || 0})` },
    { value: 'user', label: `Clientes (${counts.user || 0})` },
  ];

  const handleExport = async () => {
    if (filteredCustomers.length === 0) {
      toast.error('Nenhum usuário para exportar');
      return;
    }
    setExporting(true);
    try {
      const userIds = filteredCustomers.map((c) => c.id);
      const { data: addresses, error } = await supabase
        .from('addresses')
        .select('user_id, zip_code, street, number, complement, neighborhood, city, state, is_default, created_at')
        .in('user_id', userIds);

      if (error) throw error;

      const map: Record<string, CustomerAddressRow> = {};
      (addresses || []).forEach((a: any) => {
        const existing = map[a.user_id];
        if (!existing || (a.is_default && !existing.is_default)) {
          map[a.user_id] = a as CustomerAddressRow;
        }
      });

      exportCustomersCSV(filteredCustomers, map);
      toast.success(`${filteredCustomers.length} usuários exportados`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Erro ao exportar usuários');
    } finally {
      setExporting(false);
    }
  };

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-light tracking-wide">Usuários</h1>
          <p className="text-sm text-muted-foreground font-light mt-1">
            Todos os usuários do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exportando...' : 'Exportar'}
          </Button>
          <Button onClick={() => setNewOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail, telefone ou CPF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 font-light"
        />
      </div>

      {/* Role filter */}
      <div className="flex flex-wrap gap-2">
        {filterChips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setRoleFilter(chip.value)}
            className={cn(
              'px-3 py-1.5 text-xs uppercase tracking-wider font-light border transition-colors',
              roleFilter === chip.value
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground/50'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Customers Table */}
      <CustomersTable customers={filteredCustomers} onCustomerUpdated={refetch} />

      {/* Summary */}
      <div className="text-sm text-muted-foreground font-light">
        {filteredCustomers.length} {filteredCustomers.length === 1 ? 'usuário' : 'usuários'} encontrado{filteredCustomers.length !== 1 ? 's' : ''}
      </div>

      <NewCustomerDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={() => refetch()}
      />
    </div>
  );
}
