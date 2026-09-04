import { useState } from 'react';
import { useSuppliers, useDeleteSupplier, type Supplier } from '@/hooks/useSuppliers';
import { useConsignmentStats, useConsignmentItems, useCreateConsignmentItem, useUpdateConsignmentItem, useConsignmentFinancials, useCreateSupplierPayment } from '@/hooks/useConsignment';
import { useAdminProducts } from '@/hooks/useProductAdmin';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowDownToLine, Filter, DollarSign, Wallet, Plus, Pencil, Trash2, UserCheck, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SupplierFormDialog from '@/components/admin/SupplierFormDialog';

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Consignment() {
  const { data: suppliers = [] } = useSuppliers();
  const consignmentSuppliers = suppliers.filter(s => s.type === 'consignment');
  const deleteSupplier = useDeleteSupplier();
  const { data: stats = [] } = useConsignmentStats();
  const { data: financials = [] } = useConsignmentFinancials();
  const [filterSupplier, setFilterSupplier] = useState<string>('');
  const { data: items = [] } = useConsignmentItems(filterSupplier || undefined);
  const { data: products = [] } = useAdminProducts();
  const createItem = useCreateConsignmentItem();
  const updateItem = useUpdateConsignmentItem();
  const createPayment = useCreateSupplierPayment();

  // Entry dialog
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entrySupplierId, setEntrySupplierId] = useState('');
  const [entryProductId, setEntryProductId] = useState('');
  const [entryQuantity, setEntryQuantity] = useState('');
  const [entryUnitCost, setEntryUnitCost] = useState('');
  const [entryNotes, setEntryNotes] = useState('');

  // Update dialog
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateItemId, setUpdateItemId] = useState('');
  const [updateField, setUpdateField] = useState<'quantity_sold' | 'quantity_returned'>('quantity_sold');
  const [updateValue, setUpdateValue] = useState('');

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSupplierId, setPaymentSupplierId] = useState('');
  const [paymentSupplierName, setPaymentSupplierName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Supplier form dialog
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentPeriod, setPaymentPeriod] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentCreateExpense, setPaymentCreateExpense] = useState(true);

  const openEntryDialog = () => {
    setEntrySupplierId('');
    setEntryProductId('');
    setEntryQuantity('');
    setEntryUnitCost('');
    setEntryNotes('');
    setEntryDialogOpen(true);
  };

  const handleSubmitEntry = async () => {
    if (!entrySupplierId || !entryProductId || !entryQuantity) return;
    await createItem.mutateAsync({
      supplier_id: entrySupplierId,
      product_id: entryProductId,
      quantity_received: parseInt(entryQuantity),
      unit_cost: parseFloat(entryUnitCost) || 0,
      notes: entryNotes || undefined,
    });
    setEntryDialogOpen(false);
  };

  const openUpdateDialog = (itemId: string, field: 'quantity_sold' | 'quantity_returned', currentValue: number) => {
    setUpdateItemId(itemId);
    setUpdateField(field);
    setUpdateValue(String(currentValue));
    setUpdateDialogOpen(true);
  };

  const handleUpdate = async () => {
    await updateItem.mutateAsync({ id: updateItemId, [updateField]: parseInt(updateValue) });
    setUpdateDialogOpen(false);
  };

  const openPaymentDialog = (supplierId: string, supplierName: string, balance: number) => {
    setPaymentSupplierId(supplierId);
    setPaymentSupplierName(supplierName);
    setPaymentAmount(balance > 0 ? balance.toFixed(2) : '');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('');
    setPaymentPeriod('');
    setPaymentNotes('');
    setPaymentCreateExpense(true);
    setPaymentDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!paymentSupplierId || !paymentAmount) return;
    await createPayment.mutateAsync({
      supplier_id: paymentSupplierId,
      amount: parseFloat(paymentAmount),
      payment_date: paymentDate,
      payment_method: paymentMethod || undefined,
      reference_period: paymentPeriod || undefined,
      notes: paymentNotes || undefined,
      create_expense: paymentCreateExpense,
      supplier_name: paymentSupplierName,
    });
    setPaymentDialogOpen(false);
  };

  const filteredStats = filterSupplier ? stats.filter(s => s.supplier_id === filterSupplier) : stats;
  const filteredFinancials = filterSupplier ? financials.filter(f => f.supplier_id === filterSupplier) : financials;

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-light tracking-wide">Consignação</h1>
        <p className="text-sm text-muted-foreground font-light mt-1">
          Controle transparente de peças consignadas por parceiro
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-[220px] font-light">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Todos fornecedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {consignmentSuppliers.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <Button onClick={openEntryDialog} className="bg-gold text-gold-foreground hover:bg-gold/90 font-light">
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            Registrar Entrada
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="font-light">Resumo</TabsTrigger>
          <TabsTrigger value="details" className="font-light">Detalhes</TabsTrigger>
          <TabsTrigger value="financial" className="font-light">
            <DollarSign className="h-4 w-4 mr-1" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="font-light">
            <Users className="h-4 w-4 mr-1" />
            Fornecedores
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Fornecedor</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Recebidas</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Vendidas</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Devolvidas</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Em Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-light">
                      Nenhum dado de consignação encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStats.map(s => (
                    <TableRow key={s.supplier_id}>
                      <TableCell className="font-medium">{s.supplier_name}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{s.total_received}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="default">{s.total_sold}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{s.total_returned}</Badge></TableCell>
                      <TableCell className="text-center">
                        <Badge variant={s.in_stock > 0 ? 'outline' : 'destructive'}>{s.in_stock}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Fornecedor</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Produto</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Custo/un</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Recebidas</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Vendidas</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Devolvidas</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Estoque</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-light">
                      Nenhum item de consignação
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map(item => {
                    const inStock = item.quantity_received - item.quantity_sold - item.quantity_returned;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-light">{(item as any).suppliers?.name || '-'}</TableCell>
                        <TableCell className="font-medium">{(item as any).products?.title || '-'}</TableCell>
                        <TableCell className="text-center text-sm">{formatCurrency(item.unit_cost || 0)}</TableCell>
                        <TableCell className="text-center">{item.quantity_received}</TableCell>
                        <TableCell className="text-center">
                          <button onClick={() => openUpdateDialog(item.id, 'quantity_sold', item.quantity_sold)} className="hover:text-primary transition-colors">
                            {item.quantity_sold}
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          <button onClick={() => openUpdateDialog(item.id, 'quantity_returned', item.quantity_returned)} className="hover:text-primary transition-colors">
                            {item.quantity_returned}
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={inStock > 0 ? 'outline' : 'destructive'}>{inStock}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openUpdateDialog(item.id, 'quantity_sold', item.quantity_sold)}>Venda</Button>
                            <Button variant="ghost" size="sm" onClick={() => openUpdateDialog(item.id, 'quantity_returned', item.quantity_returned)}>Devol.</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Fornecedor</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Em Estoque</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Vendidas</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-right">A Pagar</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-right">Já Pago</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-right">Saldo</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFinancials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-light">
                      Nenhum dado financeiro
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFinancials.map(f => (
                    <TableRow key={f.supplier_id}>
                      <TableCell className="font-medium">{f.supplier_name}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{f.in_stock}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="default">{f.total_sold}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(f.amount_owed)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600">{formatCurrency(f.amount_paid)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        <span className={f.balance > 0 ? 'text-destructive' : 'text-green-600'}>
                          {formatCurrency(f.balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPaymentDialog(f.supplier_id, f.supplier_name, f.balance)}
                          disabled={f.balance <= 0}
                          className="font-light"
                        >
                          <Wallet className="h-4 w-4 mr-1" />
                          Pagar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => { setEditingSupplier(null); setSupplierDialogOpen(true); }}
              className="bg-gold text-gold-foreground hover:bg-gold/90 font-light"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Fornecedor
            </Button>
          </div>
          <div className="border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Nome</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Tipo</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Contato</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Telefone</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Usuário</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-light">
                      Nenhum fornecedor cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge variant={s.type === 'consignment' ? 'default' : 'outline'} className="font-light">
                          {s.type === 'consignment' ? 'Consignado' : 'Próprio'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-light">{s.contact_name || '-'}</TableCell>
                      <TableCell className="font-light">{s.phone || '-'}</TableCell>
                      <TableCell className="text-center">
                        {s.user_id ? (
                          <Badge variant="outline" className="font-light gap-1">
                            <UserCheck className="h-3 w-3" />
                            Vinculado
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground font-light">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingSupplier(s); setSupplierDialogOpen(true); }}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Excluir o fornecedor "${s.name}"?`)) {
                                deleteSupplier.mutate(s.id);
                              }
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <SupplierFormDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        supplier={editingSupplier}
      />

      {/* Entry Dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light">Registrar Entrada de Consignação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-light">Fornecedor</Label>
              <Select value={entrySupplierId} onValueChange={setEntrySupplierId}>
                <SelectTrigger className="font-light"><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                <SelectContent>
                  {consignmentSuppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-light">Produto</Label>
              <Select value={entryProductId} onValueChange={setEntryProductId}>
                <SelectTrigger className="font-light"><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-light">Quantidade</Label>
                <Input type="number" value={entryQuantity} onChange={e => setEntryQuantity(e.target.value)} min="1" className="font-light" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-light">Custo por peça (R$)</Label>
                <Input type="number" value={entryUnitCost} onChange={e => setEntryUnitCost(e.target.value)} min="0" step="0.01" className="font-light" placeholder="0,00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-light">Observações</Label>
              <Textarea value={entryNotes} onChange={e => setEntryNotes(e.target.value)} className="font-light" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)} className="font-light">Cancelar</Button>
            <Button onClick={handleSubmitEntry} className="bg-gold text-gold-foreground hover:bg-gold/90 font-light" disabled={createItem.isPending}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-light">
              {updateField === 'quantity_sold' ? 'Atualizar Vendidas' : 'Atualizar Devolvidas'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-light">Quantidade</Label>
              <Input type="number" value={updateValue} onChange={e => setUpdateValue(e.target.value)} min="0" className="font-light" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)} className="font-light">Cancelar</Button>
            <Button onClick={handleUpdate} className="bg-gold text-gold-foreground hover:bg-gold/90 font-light" disabled={updateItem.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light">Registrar Pagamento — {paymentSupplierName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-light">Valor (R$)</Label>
                <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} min="0.01" step="0.01" className="font-light" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-light">Data</Label>
                <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="font-light" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-light">Método</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="font-light"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-light">Período ref.</Label>
                <Input type="text" value={paymentPeriod} onChange={e => setPaymentPeriod(e.target.value)} className="font-light" placeholder="Ex: Abril/2026" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-light">Observações</Label>
              <Textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} className="font-light" />
            </div>
            <div className="flex items-center gap-3 pt-2 border-t">
              <Switch checked={paymentCreateExpense} onCheckedChange={setPaymentCreateExpense} />
              <Label className="text-sm font-light">Lançar como despesa no financeiro</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} className="font-light">Cancelar</Button>
            <Button onClick={handlePayment} className="bg-gold text-gold-foreground hover:bg-gold/90 font-light" disabled={createPayment.isPending}>
              Registrar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
