import { useState, useMemo } from 'react';
import { Plus, Ticket, Loader2, Trash2, Edit2, ToggleLeft, ToggleRight, Bot, BarChart3, CheckCircle, Percent, DollarSign } from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDiscounts, DiscountCode } from '@/hooks/useDiscounts';
import { CompactStatsCard } from '@/components/admin/CompactStatsCard';
import { toast } from 'sonner';

const isAutoCoupon = (code: string) => /^[A-Z]+-[A-Z0-9]{6}$/.test(code);

export default function Discounts() {
  const { discounts, loading, createDiscount, updateDiscount, deleteDiscount, toggleActive } = useDiscounts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoPeriod, setAutoPeriod] = useState('30');

  const [formData, setFormData] = useState({
    code: '', type: 'percentage' as 'percentage' | 'fixed', value: '',
    min_order_value: '', max_discount: '', max_uses: '', uses_per_user: '1',
    starts_at: '', expires_at: '', is_active: true,
  });

  const resetForm = () => {
    setFormData({ code: '', type: 'percentage', value: '', min_order_value: '', max_discount: '', max_uses: '', uses_per_user: '1', starts_at: '', expires_at: '', is_active: true });
    setEditingDiscount(null);
  };

  const openEditDialog = (discount: DiscountCode) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code, type: discount.type, value: discount.value.toString(),
      min_order_value: discount.min_order_value?.toString() || '', max_discount: discount.max_discount?.toString() || '',
      max_uses: discount.max_uses?.toString() || '', uses_per_user: discount.uses_per_user.toString(),
      starts_at: discount.starts_at ? discount.starts_at.slice(0, 16) : '',
      expires_at: discount.expires_at ? discount.expires_at.slice(0, 16) : '',
      is_active: discount.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.value) { toast.error('Preencha os campos obrigatórios'); return; }
    setSaving(true);
    try {
      const data = {
        code: formData.code, type: formData.type, value: parseFloat(formData.value),
        min_order_value: formData.min_order_value ? parseFloat(formData.min_order_value) : null,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        uses_per_user: parseInt(formData.uses_per_user) || 1,
        starts_at: formData.starts_at || null, expires_at: formData.expires_at || null,
        is_active: formData.is_active,
      };
      if (editingDiscount) { await updateDiscount(editingDiscount.id, data); toast.success('Cupom atualizado!'); }
      else { await createDiscount(data); toast.success('Cupom criado!'); }
      setDialogOpen(false); resetForm();
    } catch (error: any) {
      toast.error(error.code === '23505' ? 'Este código já existe' : 'Erro ao salvar cupom');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteDiscount(deleteId); toast.success('Cupom excluído'); }
    catch { toast.error('Erro ao excluir cupom'); }
    finally { setDeleteId(null); }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try { await toggleActive(id, !isActive); toast.success(isActive ? 'Cupom desativado' : 'Cupom ativado'); }
    catch { toast.error('Erro ao atualizar cupom'); }
  };

  const formatValue = (d: DiscountCode) =>
    d.type === 'percentage' ? `${d.value}%` : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.value);

  const formatDate = (dateStr: string | null) =>
    dateStr ? format(new Date(dateStr), "dd/MM/yy", { locale: ptBR }) : '-';

  // Auto coupons stats
  const autoStats = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(autoPeriod));
    const autoCoupons = discounts.filter(d => isAutoCoupon(d.code) && isAfter(new Date(d.created_at), cutoff));
    const used = autoCoupons.filter(d => d.uses_count > 0);
    const totalDiscount = autoCoupons.reduce((sum, d) => {
      if (d.type === 'percentage') return sum; // can't calculate exact
      return sum + (d.value * d.uses_count);
    }, 0);
    return {
      coupons: autoCoupons,
      total: autoCoupons.length,
      used: used.length,
      conversion: autoCoupons.length > 0 ? ((used.length / autoCoupons.length) * 100) : 0,
      totalDiscount,
    };
  }, [discounts, autoPeriod]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const manualDiscounts = discounts.filter(d => !isAutoCoupon(d.code));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Cupons de Desconto</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus cupons promocionais</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Novo Cupom
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all"><Ticket className="h-4 w-4 mr-1.5" />Todos ({discounts.length})</TabsTrigger>
          <TabsTrigger value="auto"><Bot className="h-4 w-4 mr-1.5" />Automáticos</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CouponsTable
            discounts={discounts}
            formatValue={formatValue}
            formatDate={formatDate}
            onToggle={handleToggle}
            onEdit={openEditDialog}
            onDelete={setDeleteId}
          />
        </TabsContent>

        <TabsContent value="auto" className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={autoPeriod} onValueChange={setAutoPeriod}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <CompactStatsCard title="Total Gerados" value={autoStats.total} icon={Bot} />
            <CompactStatsCard title="Utilizados" value={autoStats.used} icon={CheckCircle} />
            <CompactStatsCard title="Conversão" value={`${autoStats.conversion.toFixed(1)}%`} icon={BarChart3} />
            <CompactStatsCard title="Desconto (fixo)" value={`R$ ${autoStats.totalDiscount.toFixed(0)}`} icon={DollarSign} />
          </div>

          <CouponsTable
            discounts={autoStats.coupons}
            formatValue={formatValue}
            formatDate={formatDate}
            onToggle={handleToggle}
            onEdit={openEditDialog}
            onDelete={setDeleteId}
            showCreatedAt
          />
        </TabsContent>
      </Tabs>

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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O cupom será removido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Extracted table component
function CouponsTable({ discounts, formatValue, formatDate, onToggle, onEdit, onDelete, showCreatedAt }: {
  discounts: DiscountCode[];
  formatValue: (d: DiscountCode) => string;
  formatDate: (s: string | null) => string;
  onToggle: (id: string, isActive: boolean) => void;
  onEdit: (d: DiscountCode) => void;
  onDelete: (id: string) => void;
  showCreatedAt?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead className="hidden sm:table-cell">Mín. Pedido</TableHead>
              <TableHead className="hidden md:table-cell">Usos</TableHead>
              {showCreatedAt && <TableHead className="hidden md:table-cell">Criado em</TableHead>}
              <TableHead className="hidden md:table-cell">Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCreatedAt ? 8 : 7} className="text-center py-12 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum cupom encontrado</p>
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell className="font-mono font-medium">{discount.code}</TableCell>
                  <TableCell><Badge variant="secondary">{formatValue(discount)}</Badge></TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {discount.min_order_value ? `R$ ${discount.min_order_value.toFixed(0)}` : '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{discount.uses_count}/{discount.max_uses || '∞'}</TableCell>
                  {showCreatedAt && <TableCell className="hidden md:table-cell text-sm">{formatDate(discount.created_at)}</TableCell>}
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
                      <Button variant="ghost" size="icon" onClick={() => onToggle(discount.id, discount.is_active)}>
                        {discount.is_active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(discount)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(discount.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
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
