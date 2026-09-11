import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCreateReceipt, useUpdateReceipt } from '@/hooks/inbound/useInbound';
import { RECEIPT_STATUS_LABELS, type TruckReceipt } from '@/services/inbound/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt?: TruckReceipt | null;
}

const NONE = 'none';

function emptyForm() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    received_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    received_time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    supplier_id: NONE,
    origin_name: '',
    carrier: '',
    truck_plate: '',
    driver_name: '',
    document_number: '',
    invoice_number: '',
    estimated_quantity: '',
    lot_value: '',
    notes: '',
    status: 'open',
  };
}

export function ReceiptDialog({ open, onOpenChange, receipt }: Props) {
  const { data: suppliers = [] } = useSuppliers();
  const create = useCreateReceipt();
  const update = useUpdateReceipt();
  const [form, setForm] = useState(emptyForm);
  const [createLot, setCreateLot] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (receipt) {
      setForm({
        received_date: receipt.received_date,
        received_time: (receipt.received_time || '').slice(0, 5),
        supplier_id: receipt.supplier_id ?? NONE,
        origin_name: receipt.origin_name ?? '',
        carrier: receipt.carrier ?? '',
        truck_plate: receipt.truck_plate ?? '',
        driver_name: receipt.driver_name ?? '',
        document_number: receipt.document_number ?? '',
        invoice_number: receipt.invoice_number ?? '',
        estimated_quantity: String(receipt.estimated_quantity ?? ''),
        lot_value: String(receipt.lot_value ?? ''),
        notes: receipt.notes ?? '',
        status: receipt.status ?? 'open',
      });
    } else {
      setForm(emptyForm());
      setCreateLot(true);
    }
  }, [open, receipt]);

  const set = (k: keyof ReturnType<typeof emptyForm>, v: string) => setForm(f => ({ ...f, [k]: v }));

  const payload = () => ({
    received_date: form.received_date,
    received_time: form.received_time ? `${form.received_time}:00` : undefined,
    supplier_id: form.supplier_id === NONE ? null : form.supplier_id,
    origin_name: form.origin_name.trim() || null,
    carrier: form.carrier.trim() || null,
    truck_plate: form.truck_plate.trim().toUpperCase() || null,
    driver_name: form.driver_name.trim() || null,
    document_number: form.document_number.trim() || null,
    invoice_number: form.invoice_number.trim() || null,
    estimated_quantity: Number(form.estimated_quantity) || 0,
    lot_value: Number(String(form.lot_value).replace(',', '.')) || 0,
    notes: form.notes.trim() || null,
    status: form.status,
  });

  const save = () => {
    if (receipt) {
      update.mutate({ id: receipt.id, ...payload() }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate({ ...payload(), createLot }, { onSuccess: () => onOpenChange(false) });
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{receipt ? `Editar ${receipt.code}` : 'Novo recebimento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Chegada</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.received_date} onChange={e => set('received_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora</Label>
                <Input type="time" value={form.received_time} onChange={e => set('received_time', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Origem e transporte</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Fornecedor cadastrado</Label>
                <Select value={form.supplier_id} onValueChange={v => set('supplier_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {suppliers.map((s: { id: string; name: string }) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Origem (texto livre)</Label>
                <Input value={form.origin_name} onChange={e => set('origin_name', e.target.value)} placeholder="Ex.: Logística reversa Magalu" />
              </div>
              <div className="space-y-1.5">
                <Label>Transportadora</Label>
                <Input value={form.carrier} onChange={e => set('carrier', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Placa do caminhão</Label>
                <Input value={form.truck_plate} onChange={e => set('truck_plate', e.target.value)} placeholder="ABC1D23" />
              </div>
              <div className="space-y-1.5">
                <Label>Motorista</Label>
                <Input value={form.driver_name} onChange={e => set('driver_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Número do documento</Label>
                <Input value={form.document_number} onChange={e => set('document_number', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Número da nota</Label>
                <Input value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Situação</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RECEIPT_STATUS_LABELS).map(([v, label]) => (
                      <SelectItem key={v} value={v}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Carga</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Quantidade estimada (unidades)</Label>
                <Input type="number" inputMode="numeric" value={form.estimated_quantity} onChange={e => set('estimated_quantity', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor do lote (R$)</Label>
                <Input inputMode="decimal" value={form.lot_value} onChange={e => set('lot_value', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </section>

          {!receipt && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Criar lote automaticamente</p>
                <p className="text-xs text-muted-foreground">Gera um lote vinculado a este recebimento.</p>
              </div>
              <Switch checked={createLot} onCheckedChange={setCreateLot} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
