import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Mail, 
  Phone, 
  Cake, 
  FileText, 
  MapPin, 
  ShoppingBag,
  ExternalLink,
  Home,
  Building2,
  Shield,
  ShieldCheck,
  User,
  Store,
  KeyRound,
  TrendingUp,
  DollarSign,
  Calendar
} from 'lucide-react';
import { AdminResetPasswordDialog } from './AdminResetPasswordDialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useCustomerDetails, CustomerDetails, UserRole } from '@/hooks/useCustomerDetails';
import { useManageUserRole, StoreRole } from '@/hooks/useManageUserRole';
import { supabase } from '@/integrations/supabase/client';

interface CustomerDetailsSheetProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

interface StoreOption {
  id: string;
  name: string;
}

interface StoreEmployeeInfo {
  store_id: string;
  role: string;
  stores: { name: string } | null;
}

const storeRoleLabels: Record<string, string> = {
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  vendedor_externo: 'Vendedor Externo',
  atendente: 'Atendente',
};

export function CustomerDetailsSheet({ customerId, open, onOpenChange, onUpdated }: CustomerDetailsSheetProps) {
  const { data, loading, error, refetch } = useCustomerDetails(customerId);
  const { updateRole, loading: roleLoading } = useManageUserRole();
  
  // Simple confirm dialog for admin/user roles
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; role: UserRole; title: string; description: string } | null>(null);
  
  // Seller promotion dialog with store/role selection
  const [sellerDialog, setSellerDialog] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedStoreRole, setSelectedStoreRole] = useState<StoreRole>('vendedor');
  
  // Stores list and current employee info
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<StoreEmployeeInfo | null>(null);

  // Reset password dialog
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  // Fetch stores and current employee link
  useEffect(() => {
    if (!open || !customerId) return;
    
    const fetchData = async () => {
      const [storesRes, employeeRes] = await Promise.all([
        supabase.from('stores').select('id, name').eq('is_active', true),
        supabase.from('store_employees').select('store_id, role, stores(name)').eq('user_id', customerId).eq('is_active', true).maybeSingle(),
      ]);
      
      if (storesRes.data) setStores(storesRes.data);
      if (employeeRes.data) {
        setCurrentEmployee(employeeRes.data as unknown as StoreEmployeeInfo);
      } else {
        setCurrentEmployee(null);
      }
    };
    
    fetchData();
  }, [open, customerId]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const formatBirthDate = (date: string | null) => {
    if (!date) return null;
    try {
      return format(new Date(date), "d 'de' MMMM", { locale: ptBR });
    } catch {
      return null;
    }
  };

  const openWhatsApp = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const whatsappNumber = digits.startsWith('55') ? digits : `55${digits}`;
    window.open(`https://wa.me/${whatsappNumber}`, '_blank');
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = { admin: 'Administrador', vendedor: 'Vendedor', user: 'Cliente' };
    return labels[role];
  };

  const getRoleVariant = (role: UserRole): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (role === 'admin') return 'destructive';
    if (role === 'vendedor') return 'default';
    return 'secondary';
  };

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole === 'vendedor') {
      // Open seller dialog with store/role selection
      setSelectedStoreId(currentEmployee?.store_id || '');
      setSelectedStoreRole((currentEmployee?.role as StoreRole) || 'vendedor');
      setSellerDialog(true);
      return;
    }

    const descriptions: Record<UserRole, string> = {
      admin: 'Este usuário terá acesso total ao painel administrativo, incluindo gerenciamento de produtos, pedidos, clientes e configurações.',
      vendedor: '',
      user: 'O usuário perderá todos os acessos especiais e voltará a ser um cliente comum.',
    };
    
    setConfirmDialog({
      open: true,
      role: newRole,
      title: newRole === 'user' ? 'Remover acesso especial?' : `Promover para ${getRoleLabel(newRole)}?`,
      description: descriptions[newRole],
    });
  };

  const confirmRoleChange = async () => {
    if (!customerId || !confirmDialog) return;
    const result = await updateRole(customerId, confirmDialog.role);
    setConfirmDialog(null);
    if (result.success) {
      refetch();
      onUpdated?.();
    }
  };

  const confirmSellerPromotion = async () => {
    if (!customerId || !selectedStoreId) return;
    const result = await updateRole(customerId, 'vendedor', selectedStoreId, selectedStoreRole);
    setSellerDialog(false);
    if (result.success) {
      refetch();
      onUpdated?.();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-light tracking-wide">Detalhes do Cliente</SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground animate-spin rounded-full" />
          </div>
        )}

        {error && (
          <div className="py-8 text-center text-muted-foreground font-light">{error}</div>
        )}

        {data && !loading && (
          <div className="mt-6 space-y-6">
            {/* Header with Avatar */}
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-16 w-16 mb-3">
                <AvatarFallback className="bg-muted text-lg font-light">
                  {getInitials(data.profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-medium">{data.profile.full_name || 'Sem nome'}</h2>
              <p className="text-sm text-muted-foreground font-light">
                Cadastrado em {format(new Date(data.profile.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium tracking-[0.1em] uppercase text-muted-foreground">
                Informações de Contato
              </h3>

              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-light truncate">{data.email || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <div className="flex items-center gap-2">
                    <p className="font-light">{data.profile.phone || '-'}</p>
                    {data.profile.phone && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => openWhatsApp(data.profile.phone!)}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Cake className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Aniversário</p>
                  <p className="font-light">{formatBirthDate(data.profile.birth_date) || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">CPF</p>
                  <p className="font-light">{data.profile.cpf || '-'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Access Level / Role Management */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium tracking-[0.1em] uppercase text-muted-foreground">
                Nível de Acesso
              </h3>

              <div className="flex items-center gap-3">
                {data.role === 'admin' && <ShieldCheck className="h-5 w-5 text-destructive" />}
                {data.role === 'vendedor' && <Shield className="h-5 w-5 text-primary" />}
                {data.role === 'user' && <User className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <p className="text-xs text-muted-foreground">Atual</p>
                  <Badge variant={getRoleVariant(data.role)} className="mt-1">
                    {getRoleLabel(data.role)}
                  </Badge>
                </div>
              </div>

              {/* Show current store link if vendedor */}
              {data.role === 'vendedor' && currentEmployee && (
                <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Loja / Cargo</p>
                    <p className="text-sm font-medium">
                      {currentEmployee.stores?.name || 'Loja desconhecida'} — {storeRoleLabels[currentEmployee.role] || currentEmployee.role}
                    </p>
                  </div>
                </div>
              )}

              {data.role === 'vendedor' && !currentEmployee && (
                <div className="p-3 border border-destructive/30 rounded-lg">
                  <p className="text-xs text-destructive">⚠️ Vendedor sem loja vinculada</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {data.role !== 'vendedor' && (
                  <Button variant="outline" size="sm" className="justify-start" onClick={() => handleRoleChange('vendedor')} disabled={roleLoading}>
                    <Shield className="h-4 w-4 mr-2" />
                    {data.role === 'admin' ? 'Rebaixar para Vendedor' : 'Promover para Vendedor'}
                  </Button>
                )}
                {data.role === 'vendedor' && (
                  <Button variant="outline" size="sm" className="justify-start" onClick={() => handleRoleChange('vendedor')} disabled={roleLoading}>
                    <Shield className="h-4 w-4 mr-2" />
                    Alterar loja/cargo
                  </Button>
                )}
                {data.role !== 'admin' && (
                  <Button variant="outline" size="sm" className="justify-start" onClick={() => handleRoleChange('admin')} disabled={roleLoading}>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Promover para Admin
                  </Button>
                )}
                {data.role !== 'user' && (
                  <Button variant="ghost" size="sm" className="justify-start text-muted-foreground" onClick={() => handleRoleChange('user')} disabled={roleLoading}>
                    <User className="h-4 w-4 mr-2" />
                    Remover acesso especial
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Admin Actions */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium tracking-[0.1em] uppercase text-muted-foreground">
                Ações administrativas
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="justify-start w-full"
                onClick={() => setResetPasswordOpen(true)}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Resetar senha
              </Button>
            </div>

            <Separator />

            {/* Addresses */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium tracking-[0.1em] uppercase text-muted-foreground">
                Endereços ({data.addresses.length})
              </h3>

              {data.addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground font-light">Nenhum endereço cadastrado</p>
              ) : (
                <div className="space-y-3">
                  {data.addresses.map((address) => (
                    <div key={address.id} className="p-3 border border-border rounded-lg space-y-1">
                      <div className="flex items-center gap-2">
                        {address.label.toLowerCase().includes('trabalho') ? (
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Home className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm">{address.label}</span>
                        {address.is_default && <Badge variant="secondary" className="text-xs">Padrão</Badge>}
                      </div>
                      <p className="text-sm font-light">
                        {address.street}, {address.number}
                        {address.complement && ` - ${address.complement}`}
                      </p>
                      <p className="text-sm text-muted-foreground font-light">{address.neighborhood}</p>
                      <p className="text-sm text-muted-foreground font-light">
                        {address.city} - {address.state}, {address.zip_code}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Order History */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium tracking-[0.1em] uppercase text-muted-foreground">
                Histórico
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border border-border rounded-lg text-center">
                  <ShoppingBag className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-medium">{data.stats.orders_count}</p>
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                </div>
                <div className="p-3 border border-border rounded-lg text-center">
                  <p className="text-lg font-medium">{formatCurrency(data.stats.total_spent)}</p>
                  <p className="text-xs text-muted-foreground">Total gasto</p>
                </div>
              </div>

              {data.stats.last_order && (
                <div className="p-3 border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Último pedido</p>
                  <p className="text-sm font-light">
                    {format(new Date(data.stats.last_order.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-sm font-medium">{formatCurrency(data.stats.last_order.total)}</p>
                </div>
              )}
            </div>

            {/* Seller Performance — only for vendedor/admin */}
            {data.seller_stats && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-xs font-medium tracking-[0.1em] uppercase text-muted-foreground">
                    Performance de Vendas
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border border-border rounded-lg text-center">
                      <ShoppingBag className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-medium">{data.seller_stats.total_orders}</p>
                      <p className="text-xs text-muted-foreground">Vendas realizadas</p>
                    </div>
                    <div className="p-3 border border-border rounded-lg text-center">
                      <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-medium">{formatCurrency(data.seller_stats.total_revenue)}</p>
                      <p className="text-xs text-muted-foreground">Faturamento total</p>
                    </div>
                    <div className="p-3 border border-border rounded-lg text-center">
                      <Calendar className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-medium">{data.seller_stats.month_orders}</p>
                      <p className="text-xs text-muted-foreground">Vendas no mês</p>
                    </div>
                    <div className="p-3 border border-border rounded-lg text-center">
                      <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-medium">{formatCurrency(data.seller_stats.month_revenue)}</p>
                      <p className="text-xs text-muted-foreground">Faturado no mês</p>
                    </div>
                  </div>

                  <div className="p-3 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Ticket médio</p>
                    <p className="text-sm font-medium">{formatCurrency(data.seller_stats.avg_ticket)}</p>
                  </div>

                  {data.seller_stats.last_sale && (
                    <div className="p-3 border border-border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Última venda</p>
                      <p className="text-sm font-light">
                        {format(new Date(data.seller_stats.last_sale.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm font-medium">{formatCurrency(data.seller_stats.last_sale.total)}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>

      {/* Simple Role Change Confirmation Dialog (admin/user) */}
      <AlertDialog open={!!confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} disabled={roleLoading}>
              {roleLoading ? 'Processando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Seller Promotion Dialog with Store & Role Selection */}
      <AlertDialog open={sellerDialog} onOpenChange={setSellerDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {data?.role === 'vendedor' ? 'Alterar loja/cargo' : 'Promover para Vendedor'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Selecione a loja e o cargo deste usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Loja</Label>
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cargo na loja</Label>
              <Select value={selectedStoreRole} onValueChange={(v) => setSelectedStoreRole(v as StoreRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="vendedor_externo">Vendedor Externo</SelectItem>
                  <SelectItem value="atendente">Atendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSellerPromotion} disabled={roleLoading || !selectedStoreId}>
              {roleLoading ? 'Processando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <AdminResetPasswordDialog
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        targetUserId={customerId}
        targetUserName={data?.profile.full_name}
        targetUserEmail={data?.email}
      />
    </Sheet>
  );
}
