import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, FileText, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useAttachments, useCreateLot, useDeleteAttachment, useDeleteReceipt,
  useInboundEvents, useReceipt, useUploadAttachment,
} from '@/hooks/inbound/useInbound';
import { receiptService } from '@/services/inbound/receiptService';
import { ReceiptDialog } from '@/components/admin/inbound/ReceiptDialog';
import { InboundStatusBadge } from '@/components/admin/inbound/InboundStatusBadge';
import { useAdmin } from '@/hooks/useAdmin';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value === null || value === undefined || value === '' ? 'Não informado' : value}</p>
    </div>
  );
}

export default function InboundReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: receipt, isLoading } = useReceipt(id);
  const { data: attachments = [] } = useAttachments(id);
  const { data: events = [] } = useInboundEvents('truck_receipt', id);
  const upload = useUploadAttachment(id || '');
  const removeAttachment = useDeleteAttachment(id || '');
  const createLot = useCreateLot();
  const removeReceipt = useDeleteReceipt();
  const { isAdmin } = useAdmin();

  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (!receipt) {
    return (
      <Card><CardContent className="py-16 text-center text-muted-foreground">
        <p>Recebimento não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/inbound/receipts')}>Voltar</Button>
      </CardContent></Card>
    );
  }

  const openFile = async (path: string) => {
    const url = await receiptService.signedUrl(path);
    if (url) window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={receipt.code}
        subtitle={`${new Date(`${receipt.received_date}T00:00:00`).toLocaleDateString('pt-BR')} · ${(receipt.received_time || '').slice(0, 5)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => navigate('/admin/inbound/receipts')}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4 mr-2" />Editar</Button>
            {isAdmin && <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4 mr-2" />Excluir</Button>}
          </div>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dados do recebimento</CardTitle>
          <InboundStatusBadge status={receipt.status} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Origem" value={receipt.origin_name} />
          <Field label="Transportadora" value={receipt.carrier} />
          <Field label="Placa" value={receipt.truck_plate} />
          <Field label="Motorista" value={receipt.driver_name} />
          <Field label="Documento" value={receipt.document_number} />
          <Field label="Nota" value={receipt.invoice_number} />
          <Field label="Quantidade estimada" value={`${receipt.estimated_quantity} un`} />
          <Field label="Valor do lote" value={brl(Number(receipt.lot_value || 0))} />
          <Field label="Observações" value={receipt.notes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lotes</CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={createLot.isPending}
            onClick={() => createLot.mutate({ receipt_id: receipt.id, expected_units: receipt.estimated_quantity, description: receipt.origin_name })}
          >
            <Plus className="h-4 w-4 mr-2" />Novo lote
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(receipt.lots || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lote vinculado.</p>
          ) : (
            receipt.lots!.map(l => {
              const pct = l.expected_units > 0 ? Math.min(100, Math.round((l.processed_units / l.expected_units) * 100)) : 0;
              return (
                <div key={l.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{l.code}</span>
                    <InboundStatusBadge status={l.status} kind="lot" />
                  </div>
                  <Progress value={pct} />
                  <p className="text-xs text-muted-foreground">{l.processed_units} de {l.expected_units} unidades ({pct}%)</p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Fotos e documentos</CardTitle>
          <div className="flex gap-2">
            <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload.mutate({ file: f, kind: 'photo' }); e.target.value = ''; }} />
            <input ref={docRef} type="file" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload.mutate({ file: f, kind: 'document' }); e.target.value = ''; }} />
            <Button size="sm" variant="outline" onClick={() => photoRef.current?.click()} disabled={upload.isPending}>
              <ImagePlus className="h-4 w-4 mr-2" />Foto
            </Button>
            <Button size="sm" variant="outline" onClick={() => docRef.current?.click()} disabled={upload.isPending}>
              <FileText className="h-4 w-4 mr-2" />Documento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
          ) : (
            <ul className="divide-y">
              {attachments.map(a => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <button className="text-sm text-left underline underline-offset-4 truncate" onClick={() => openFile(a.file_path)}>
                    {a.file_name || a.file_path.split('/').pop()}
                  </button>
                  <Button size="icon" variant="ghost" onClick={() => removeAttachment.mutate(a)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro disponível.</p>
          ) : (
            <ul className="space-y-2">
              {events.map(ev => (
                <li key={ev.id} className="text-sm flex justify-between gap-3">
                  <span className="capitalize">{ev.action}</span>
                  <span className="text-muted-foreground">{new Date(ev.created_at).toLocaleString('pt-BR')}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ReceiptDialog open={editOpen} onOpenChange={setEditOpen} receipt={receipt} />

      <AlertDialog open={isAdmin && confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {receipt.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lotes e anexos vinculados também serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeReceipt.isPending}
              onClick={(event) => {
                event.preventDefault();
                removeReceipt.mutate(receipt.id, { onSuccess: () => navigate('/admin/inbound/receipts') });
              }}
            >
              {removeReceipt.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
