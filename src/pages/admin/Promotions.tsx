import { useState, useCallback, useEffect } from 'react';
import { Plus, Ticket, Loader2, Trash2, Edit2, ToggleLeft, ToggleRight, Star, Users, Settings2, TrendingUp, Save, UserPlus, Search, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { useDiscounts, DiscountCode } from '@/hooks/useDiscounts';
import { useLoyaltySettings, useAdminLoyalty } from '@/hooks/useLoyalty';
import { useManualOrder } from '@/hooks/useManualOrder';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ========== DISCOUNTS TAB ==========
function DiscountsTab() {
  const { discounts, loading, createDiscount, updateDiscount, deleteDiscount, toggleActive } = useDiscounts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignDiscount, setAssignDiscount] = useState<DiscountCode | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignResults, setAssignResults] = useState<any[]>([]);
  const [assigningCustomerId, setAssigningCustomerId] = useState<string | null>(null);
  const [assignNote, setAssignNote] = useState('');
  const [assignExpires, setAssignExpires] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const { searchCustomers, searchingCustomers } = useManualOrder();

  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    min_order_value: '',
    max_discount: '',
    max_uses: '',
    uses_per_user: '1',
    starts_at: '',
    expires_at: '',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: '',
      min_order_value: '',
      max_discount: '',
      max_uses: '',
      uses_per_user: '1',
      starts_at: '',
      expires_at: '',
      is_active: true,
    });
    setEditingDiscount(null);
  };

  const openEditDialog = (discount: DiscountCode) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      type: discount.type,
      value: discount.value.toString(),
      min_order_value: discount.min_order_value?.toString() || '',
      max_discount: discount.max_discount?.toString() || '',
      max_uses: discount.max_uses?.toString() || '',
      uses_per_user: discount.uses_per_user.toString(),
      starts_at: discount.starts_at ? discount.starts_at.slice(0, 16) : '',
      expires_at: discount.expires_at ? discount.expires_at.slice(0, 16) : '',
      is_active: discount.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.value) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const data = {
        code: formData.code,
        type: formData.type,
        value: parseFloat(formData.value),
        min_order_value: formData.min_order_value ? parseFloat(formData.min_order_value) : null,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        uses_per_user: parseInt(formData.uses_per_user) || 1,
        starts_at: formData.starts_at || null,
        expires_at: formData.expires_at || null,
        is_active: formData.is_active,
      };

      if (editingDiscount) {
        await updateDiscount(editingDiscount.id, data);
        toast.success('Cupom atualizado!');
      } else {
        await createDiscount(data);
        toast.success('Cupom criado!');
      }

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Este código já existe');
      } else {
        toast.error('Erro ao salvar cupom');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDiscount(deleteId);
      toast.success('Cupom excluído');
    } catch (error) {
      toast.error('Erro ao excluir cupom');
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleActive(id, !isActive);
      toast.success(isActive ? 'Cupom desativado' : 'Cupom ativado');
    } catch (error) {
      toast.error('Erro ao atualizar cupom');
    }
  };

  const handleAssignSearch = async (query: string) => {
    setAssignSearch(query);
    if (query.length >= 2) {
      const results = await searchCustomers(query);
      setAssignResults(results);
    } else {
      setAssignResults([]);
    }
  };

  const handleAssignCoupon = async () => {
    if (!assignDiscount || !assigningCustomerId) return;
    setAssignSaving(true);
    try {
      const { error } = await supabase
        .from('customer_coupons' as any)
        .insert({
          user_id: assigningCustomerId,
          discount_id: assignDiscount.id,
          note: assignNote || null,
          expires_at: assignExpires || null,
        } as any);

      if (error) {
        if (error.code === '23505') {
          toast.error('Este cliente já possui este cupom');
        } else {
          toast.error('Erro ao atribuir cupom');
        }
        return;
      }

      toast.success('Cupom atribuído ao cliente!');
      setAssignDiscount(null);
      setAssignSearch('');
      setAssignResults([]);
      setAssigningCustomerId(null);
      setAssignNote('');
      setAssignExpires('');
    } catch {
      toast.error('Erro ao atribuir cupom');
    } finally {
      setAssignSaving(false);
    }
  };

  const formatValue = (discount: DiscountCode) => {
    if (discount.type === 'percentage') {
      return `${discount.value}%`;
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discount.value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd/MM/yy", { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cupom
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead className="hidden sm:table-cell">Mín. Pedido</TableHead>
                <TableHead className="hidden md:table-cell">Usos</TableHead>
                <TableHead className="hidden md:table-cell">Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum cupom cadastrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                 discounts.map((discount) => (
                   <TableRow key={discount.id}>
                     <TableCell className="font-mono font-medium">{discount.code}</TableCell>
                     <TableCell>
                       <Badge variant="secondary">{formatValue(discount)}</Badge>
                     </TableCell>
                     <TableCell className="hidden sm:table-cell">
                       {discount.min_order_value ? `R$ ${discount.min_order_value.toFixed(0)}` : '-'}
                     </TableCell>
                     <TableCell className="hidden md:table-cell">
                       {discount.uses_count}/{discount.max_uses || '∞'}
                     </TableCell>
                     <TableCell className="hidden md:table-cell text-sm">
                       {discount.expires_at ? formatDate(discount.expires_at) : 'Sem limite'}
                     </TableCell>
                     <TableCell>
                       <Badge variant={discount.is_active ? 'default' : 'outline'}>
                         {discount.is_active ? 'Ativo' : 'Inativo'}
                       </Badge>
                     </TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-1">
                         <Button variant="ghost" size="icon" title="Atribuir a cliente" onClick={() => setAssignDiscount(discount)}>
                           <UserPlus className="h-4 w-4 text-primary" />
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleToggle(discount.id, discount.is_active)}>
                           {discount.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => openEditDialog(discount)}>
                           <Edit2 className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => setDeleteId(discount.id)}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDiscount ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Código *</Label>
              <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="PRIMEIRACOMPRA" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo *</Label>
                <Select value={formData.type} onValueChange={(v: 'percentage' | 'fixed') => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Valor *</Label>
                <Input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} placeholder={formData.type === 'percentage' ? '10' : '50.00'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Pedido Mínimo</Label>
                <Input type="number" value={formData.min_order_value} onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })} placeholder="100" />
              </div>
              {formData.type === 'percentage' && (
                <div className="grid gap-2">
                  <Label>Desconto Máximo</Label>
                  <Input type="number" value={formData.max_discount} onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })} placeholder="50" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Limite Total de Usos</Label>
                <Input type="number" value={formData.max_uses} onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })} placeholder="100" />
              </div>
              <div className="grid gap-2">
                <Label>Limite por Usuário</Label>
                <Input type="number" value={formData.uses_per_user} onChange={(e) => setFormData({ ...formData, uses_per_user: e.target.value })} placeholder="1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data Início</Label>
                <Input type="datetime-local" value={formData.starts_at} onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Data Fim</Label>
                <Input type="datetime-local" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingDiscount ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Coupon Dialog */}
      <Dialog open={!!assignDiscount} onOpenChange={(open) => { if (!open) { setAssignDiscount(null); setAssignSearch(''); setAssignResults([]); setAssigningCustomerId(null); setAssignNote(''); setAssignExpires(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Cupom: {assignDiscount?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Buscar Cliente *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={assignSearch}
                  onChange={(e) => handleAssignSearch(e.target.value)}
                  placeholder="Nome ou telefone..."
                  className="pl-10"
                />
              </div>
              {searchingCustomers && <p className="text-xs text-muted-foreground"><Loader2 className="h-3 w-3 inline animate-spin mr-1" />Buscando...</p>}
              {assignResults.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {assignResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setAssigningCustomerId(c.id); setAssignSearch(c.full_name || c.phone || c.id); setAssignResults([]); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${assigningCustomerId === c.id ? 'bg-primary/10' : ''}`}
                    >
                      <p className="font-medium">{c.full_name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground">{c.phone || '-'}</p>
                    </button>
                  ))}
                </div>
              )}
              {assigningCustomerId && (
                <p className="text-xs text-primary">✓ Cliente selecionado</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Validade (opcional)</Label>
              <Input type="datetime-local" value={assignExpires} onChange={(e) => setAssignExpires(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Textarea value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="Motivo da atribuição..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDiscount(null)}>Cancelar</Button>
            <Button onClick={handleAssignCoupon} disabled={assignSaving || !assigningCustomerId}>
              {assignSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== LOYALTY TAB ==========
function LoyaltyTab() {
  const { data: settings, isLoading: loadingSettings } = useLoyaltySettings();
  const { allBalances, loadingBalances, updateSettings, adjustPoints } = useAdminLoyalty();

  const [formData, setFormData] = useState({
    pointsPerReal: 1,
    redemptionRate: 10,
    minRedemption: 100,
    isActive: true,
  });

  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; userId: string; userName: string }>({
    open: false, userId: '', userName: '',
  });
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Update form when settings load
  useState(() => {
    if (settings) {
      setFormData({
        pointsPerReal: settings.pointsPerReal,
        redemptionRate: settings.redemptionRate,
        minRedemption: settings.minRedemption,
        isActive: settings.isActive,
      });
    }
  });

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      await updateSettings.mutateAsync({ id: settings.id, ...formData });
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleAdjustPoints = async () => {
    if (!adjustAmount || !adjustReason) {
      toast.error('Preencha todos os campos');
      return;
    }
    try {
      await adjustPoints.mutateAsync({
        userId: adjustDialog.userId,
        points: parseInt(adjustAmount),
        description: adjustReason,
      });
      toast.success('Pontos ajustados com sucesso!');
      setAdjustDialog({ open: false, userId: '', userName: '' });
      setAdjustAmount('');
      setAdjustReason('');
    } catch (error) {
      toast.error('Erro ao ajustar pontos');
    }
  };

  const totalPoints = allBalances.reduce((sum, b) => sum + (b.balance || 0), 0);
  const activeCustomers = allBalances.filter(b => b.balance > 0).length;

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Pontos</p>
                <p className="text-2xl font-bold">{totalPoints.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clientes com Pontos</p>
                <p className="text-2xl font-bold">{activeCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor em Pontos</p>
                <p className="text-2xl font-bold">
                  R$ {((totalPoints / 100) * (settings?.redemptionRate || 10)).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              <CardTitle>Configurações</CardTitle>
            </div>
            <CardDescription>Defina as regras do programa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Programa Ativo</Label>
                <p className="text-sm text-muted-foreground">Habilitar/desabilitar o programa</p>
              </div>
              <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
            </div>

            <div className="space-y-2">
              <Label>Pontos por R$ 1,00</Label>
              <Input type="number" value={formData.pointsPerReal} onChange={(e) => setFormData({ ...formData, pointsPerReal: Number(e.target.value) })} min={0.1} step={0.1} />
            </div>

            <div className="space-y-2">
              <Label>Valor de 100 Pontos (R$)</Label>
              <Input type="number" value={formData.redemptionRate} onChange={(e) => setFormData({ ...formData, redemptionRate: Number(e.target.value) })} min={1} step={1} />
            </div>

            <div className="space-y-2">
              <Label>Mínimo para Resgate</Label>
              <Input type="number" value={formData.minRedemption} onChange={(e) => setFormData({ ...formData, minRedemption: Number(e.target.value) })} min={1} />
            </div>

            <Button onClick={handleSaveSettings} disabled={updateSettings.isPending} className="w-full">
              {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Top Clientes</CardTitle>
            </div>
            <CardDescription>Clientes com mais pontos acumulados</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBalances ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : allBalances.length > 0 ? (
              <div className="space-y-3">
                {allBalances.slice(0, 10).map((customer: any, index: number) => (
                  <div key={customer.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-muted text-muted-foreground' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{customer.profiles?.full_name || 'Cliente'}</p>
                        <p className="text-xs text-muted-foreground">Total: {customer.total_earned?.toLocaleString('pt-BR') || 0} pts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{customer.balance?.toLocaleString('pt-BR') || 0}</Badge>
                      <Dialog 
                        open={adjustDialog.open && adjustDialog.userId === customer.user_id}
                        onOpenChange={(open) => setAdjustDialog({ open, userId: open ? customer.user_id : '', userName: open ? (customer.profiles?.full_name || 'Cliente') : '' })}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><UserPlus className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ajustar Pontos - {adjustDialog.userName}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label>Quantidade de Pontos</Label>
                              <Input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="Ex: 100 ou -50" />
                              <p className="text-xs text-muted-foreground">Use valores negativos para deduzir pontos</p>
                            </div>
                            <div className="space-y-2">
                              <Label>Motivo</Label>
                              <Textarea value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Descreva o motivo do ajuste" />
                            </div>
                            <Button onClick={handleAdjustPoints} className="w-full" disabled={adjustPoints.isPending}>
                              {adjustPoints.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              Confirmar Ajuste
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum cliente com pontos ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ========== CUSTOMER COUPONS TAB ==========
function CustomerCouponsTab() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cc, error: ccErr } = await supabase
        .from('customer_coupons' as any)
        .select('*')
        .order('assigned_at', { ascending: false });

      if (ccErr || !cc) { setCoupons([]); return; }

      // Get unique user_ids and discount_ids
      const userIds = [...new Set((cc as any[]).map((c: any) => c.user_id))];
      const discountIds = [...new Set((cc as any[]).map((c: any) => c.discount_id))];

      const [profilesRes, discountsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, phone').in('id', userIds),
        supabase.from('discount_codes').select('id, code, type, value').in('id', discountIds),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const discountMap = new Map((discountsRes.data || []).map((d: any) => [d.id, d]));

      setCoupons((cc as any[]).map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id),
        discount: discountMap.get(c.discount_id),
      })));
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRevoke = async (id: string) => {
    const { error } = await supabase
      .from('customer_coupons' as any)
      .delete()
      .eq('id', id);
    if (error) { toast.error('Erro ao revogar'); return; }
    toast.success('Cupom revogado');
    fetchAll();
  };

  const formatValue = (d: any) => {
    if (!d) return '-';
    return d.type === 'percentage' ? `${d.value}%` : `R$ ${d.value?.toFixed(2)}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cupons Atribuídos</CardTitle>
        <CardDescription>Cupons vinculados a clientes específicos</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Cupom</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead className="hidden md:table-cell">Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum cupom atribuído</p>
                  <p className="text-xs">Use o botão <UserPlus className="h-3 w-3 inline" /> na aba Cupons para atribuir</p>
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium">{item.profile?.full_name || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">{item.profile?.phone || '-'}</p>
                  </TableCell>
                  <TableCell className="font-mono">{item.discount?.code || '-'}</TableCell>
                  <TableCell><Badge variant="secondary">{formatValue(item.discount)}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {item.expires_at ? format(new Date(item.expires_at), "dd/MM/yy", { locale: ptBR }) : 'Sem limite'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_used ? 'secondary' : 'default'}>
                      {item.is_used ? 'Usado' : 'Disponível'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!item.is_used && (
                      <Button variant="ghost" size="icon" onClick={() => handleRevoke(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ========== MAIN PAGE ==========
export default function Promotions() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Promoções"
        subtitle="Gerencie cupons de desconto e programa de fidelidade"
      />

      <Tabs defaultValue="coupons" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="coupons" className="gap-2">
            <Ticket className="h-4 w-4" />
            Cupons
          </TabsTrigger>
          <TabsTrigger value="customer-coupons" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Por Cliente
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-2">
            <Star className="h-4 w-4" />
            Fidelidade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="mt-6">
          <DiscountsTab />
        </TabsContent>

        <TabsContent value="customer-coupons" className="mt-6">
          <CustomerCouponsTab />
        </TabsContent>

        <TabsContent value="loyalty" className="mt-6">
          <LoyaltyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}