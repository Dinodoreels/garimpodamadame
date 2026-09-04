import { useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, MapPin, Pencil, Trash2, Users, Package, Store as StoreIcon } from 'lucide-react';
import {
  useStores, useCreateStore, useUpdateStore, useDeleteStore,
  useStoreEmployees, useAddEmployee, useRemoveEmployee,
  useStoreInventory, useUpsertInventory,
  useAllProfiles, useAllProducts, useStoreStats,
  type Store,
} from '@/hooks/useStores';

const emptyStore = { name: '', phone: '', email: '', zip_code: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', is_active: true };

export default function Stores() {
  const { data: stores = [], isLoading } = useStores();
  const { data: stats } = useStoreStats();
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form, setForm] = useState(emptyStore);
  const [detailStore, setDetailStore] = useState<Store | null>(null);

  const openNew = () => { setEditingStore(null); setForm(emptyStore); setDialogOpen(true); };
  const openEdit = (s: Store) => {
    setEditingStore(s);
    setForm({ name: s.name, phone: s.phone || '', email: s.email || '', zip_code: s.zip_code || '', street: s.street || '', number: s.number || '', complement: s.complement || '', neighborhood: s.neighborhood || '', city: s.city || '', state: s.state || '', is_active: s.is_active });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingStore) {
      updateStore.mutate({ id: editingStore.id, ...form }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createStore.mutate(form as any, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const setField = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Lojas Físicas" subtitle="Gerencie suas lojas, funcionários e estoque" actions={
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Loja</Button>
      } />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : stores.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <StoreIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhuma loja cadastrada</p>
          <Button variant="outline" className="mt-4" onClick={openNew}><Plus className="h-4 w-4 mr-2" />Criar Primeira Loja</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {stores.map(s => (
            <Card key={s.id} className="relative">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{s.name}</h3>
                      <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Ativa' : 'Inativa'}</Badge>
                    </div>
                    {s.street && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {s.street}, {s.number}{s.complement ? ` - ${s.complement}` : ''} · {s.city}/{s.state}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{stats?.empCount[s.id] || 0} funcionários</span>
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" />{stats?.invCount[s.id] || 0} produtos</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteStore.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setDetailStore(s)}>Ver Detalhes</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingStore ? 'Editar Loja' : 'Nova Loja'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setField('name', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setField('phone', e.target.value)} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setField('email', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>CEP</Label><Input value={form.zip_code} onChange={e => setField('zip_code', e.target.value)} /></div>
              <div className="col-span-2"><Label>Rua</Label><Input value={form.street} onChange={e => setField('street', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Número</Label><Input value={form.number} onChange={e => setField('number', e.target.value)} /></div>
              <div className="col-span-2"><Label>Complemento</Label><Input value={form.complement} onChange={e => setField('complement', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Bairro</Label><Input value={form.neighborhood} onChange={e => setField('neighborhood', e.target.value)} /></div>
              <div><Label>Cidade</Label><Input value={form.city} onChange={e => setField('city', e.target.value)} /></div>
              <div><Label>Estado</Label><Input value={form.state} onChange={e => setField('state', e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} id="active" />
              <Label htmlFor="active">Loja ativa</Label>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={createStore.isPending || updateStore.isPending}>
              {editingStore ? 'Salvar' : 'Criar Loja'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!detailStore} onOpenChange={o => !o && setDetailStore(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{detailStore?.name}</SheetTitle></SheetHeader>
          {detailStore && <StoreDetailTabs storeId={detailStore.id} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StoreDetailTabs({ storeId }: { storeId: string }) {
  return (
    <Tabs defaultValue="employees" className="mt-4">
      <TabsList className="w-full"><TabsTrigger value="employees" className="flex-1">Funcionários</TabsTrigger><TabsTrigger value="inventory" className="flex-1">Estoque</TabsTrigger></TabsList>
      <TabsContent value="employees"><EmployeesTab storeId={storeId} /></TabsContent>
      <TabsContent value="inventory"><InventoryTab storeId={storeId} /></TabsContent>
    </Tabs>
  );
}

function EmployeesTab({ storeId }: { storeId: string }) {
  const { data: employees = [] } = useStoreEmployees(storeId);
  const { data: profiles = [] } = useAllProfiles();
  const addEmployee = useAddEmployee();
  const removeEmployee = useRemoveEmployee();
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('vendedor');

  const existingIds = new Set(employees.map(e => e.user_id));
  const available = profiles.filter(p => !existingIds.has(p.id));

  const handleAdd = () => {
    if (!selectedUser) return;
    addEmployee.mutate({ store_id: storeId, user_id: selectedUser, role: selectedRole }, {
      onSuccess: () => setSelectedUser(''),
    });
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2">
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
          <SelectContent>
            {available.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || 'Sem nome'}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
           <SelectContent>
            <SelectItem value="gerente">Gerente</SelectItem>
            <SelectItem value="vendedor">Vendedor</SelectItem>
            <SelectItem value="vendedor_externo">Vendedor Externo</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={!selectedUser || addEmployee.isPending}><Plus className="h-4 w-4" /></Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cargo</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum funcionário</TableCell></TableRow>
          ) : employees.map(e => (
            <TableRow key={e.id}>
              <TableCell>{e.profile?.full_name || 'Sem nome'}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{e.role}</Badge></TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={() => removeEmployee.mutate(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function InventoryTab({ storeId }: { storeId: string }) {
  const { data: inventory = [] } = useStoreInventory(storeId);
  const { data: products = [] } = useAllProducts();
  const upsert = useUpsertInventory();
  const [addProductId, setAddProductId] = useState('');

  const existingIds = new Set(inventory.map(i => i.product_id));
  const available = products.filter(p => !existingIds.has(p.id));

  const handleAdd = () => {
    if (!addProductId) return;
    upsert.mutate({ store_id: storeId, product_id: addProductId, quantity: 0 }, {
      onSuccess: () => setAddProductId(''),
    });
  };

  const handleQtyChange = (productId: string, qty: number) => {
    upsert.mutate({ store_id: storeId, product_id: productId, quantity: Math.max(0, qty) });
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2">
        <Select value={addProductId} onValueChange={setAddProductId}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Adicionar produto" /></SelectTrigger>
          <SelectContent>
            {available.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={!addProductId}><Plus className="h-4 w-4" /></Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="w-28">Quantidade</TableHead></TableRow></TableHeader>
        <TableBody>
          {inventory.length === 0 ? (
            <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum produto no estoque</TableCell></TableRow>
          ) : inventory.map(i => (
            <TableRow key={i.id}>
              <TableCell>{i.product?.title || i.product_id}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  defaultValue={i.quantity}
                  className="w-24 h-8"
                  onBlur={e => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val !== i.quantity) handleQtyChange(i.product_id, val);
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
