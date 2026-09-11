import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { receiptService, type ReceiptFilters } from '@/services/inbound/receiptService';
import { lotService, type LotFilters } from '@/services/inbound/lotService';
import { auditService } from '@/services/inbound/auditService';
import type { LotInput, ReceiptInput } from '@/services/inbound/types';

const RECEIPTS = ['inbound', 'receipts'];
const LOTS = ['inbound', 'lots'];

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['inbound'] });
}

export function useReceipts(filters: ReceiptFilters = {}) {
  return useQuery({
    queryKey: [...RECEIPTS, filters],
    queryFn: () => receiptService.list(filters),
  });
}

export function useReceipt(id?: string) {
  return useQuery({
    queryKey: [...RECEIPTS, 'one', id],
    queryFn: () => receiptService.get(id!),
    enabled: !!id,
  });
}

export function useCreateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReceiptInput & { createLot?: boolean }) => receiptService.create(input),
    onSuccess: (r) => {
      invalidateAll(qc);
      toast.success(`Recebimento ${r.code} criado`);
    },
    onError: (e: Error) => toast.error('Não foi possível salvar', { description: e.message }),
  });
}

export function useUpdateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ReceiptInput & { id: string }) => receiptService.update(id, input),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Recebimento atualizado');
    },
    onError: (e: Error) => toast.error('Não foi possível salvar', { description: e.message }),
  });
}

export function useDeleteReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => receiptService.remove(id),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Recebimento excluído');
    },
    onError: (e: Error) => toast.error('Não foi possível excluir', { description: e.message }),
  });
}

export function useAttachments(receiptId?: string) {
  return useQuery({
    queryKey: ['inbound', 'attachments', receiptId],
    queryFn: () => receiptService.listAttachments(receiptId!),
    enabled: !!receiptId,
  });
}

export function useUploadAttachment(receiptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, kind }: { file: File; kind: 'photo' | 'document' }) =>
      receiptService.upload(receiptId, file, kind),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbound', 'attachments', receiptId] });
      toast.success('Arquivo enviado');
    },
    onError: (e: Error) => toast.error('Não foi possível enviar o arquivo', { description: e.message }),
  });
}

export function useDeleteAttachment(receiptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: receiptService.removeAttachment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbound', 'attachments', receiptId] });
      toast.success('Arquivo removido');
    },
    onError: (e: Error) => toast.error('Não foi possível remover', { description: e.message }),
  });
}

export function useLots(filters: LotFilters = {}) {
  return useQuery({
    queryKey: [...LOTS, filters],
    queryFn: () => lotService.list(filters),
  });
}

export function useCreateLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LotInput) => lotService.create(input),
    onSuccess: (l) => {
      invalidateAll(qc);
      toast.success(`Lote ${l.code} criado`);
    },
    onError: (e: Error) => toast.error('Não foi possível criar o lote', { description: e.message }),
  });
}

export function useUpdateLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: LotInput & { id: string }) => lotService.update(id, input),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Lote atualizado');
    },
    onError: (e: Error) => toast.error('Não foi possível salvar', { description: e.message }),
  });
}

export function useDeleteLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lotService.remove(id),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Lote excluído');
    },
    onError: (e: Error) => toast.error('Não foi possível excluir', { description: e.message }),
  });
}

export function useInboundEvents(entityType: string, entityId?: string) {
  return useQuery({
    queryKey: ['inbound', 'events', entityType, entityId],
    queryFn: () => auditService.list(entityType, entityId!),
    enabled: !!entityId,
  });
}

/** Indicadores do painel — apenas dados reais já disponíveis nesta fase. */
export function useInboundDashboard() {
  return useQuery({
    queryKey: ['inbound', 'dashboard'],
    queryFn: async () => {
      const today = new Date();
      const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

      const [todayReceipts, openLots, recent] = await Promise.all([
        supabase.from('truck_receipts').select('id, estimated_quantity, lot_value').eq('received_date', iso),
        supabase.from('lots').select('id, expected_units, processed_units').eq('status', 'open'),
        supabase
          .from('truck_receipts')
          .select('*, lots(id, code, status, expected_units, processed_units)')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      if (todayReceipts.error) throw todayReceipts.error;
      if (openLots.error) throw openLots.error;
      if (recent.error) throw recent.error;

      const trucksToday = todayReceipts.data?.length ?? 0;
      const unitsToday = (todayReceipts.data || []).reduce((s, r) => s + (r.estimated_quantity || 0), 0);
      const valueToday = (todayReceipts.data || []).reduce((s, r) => s + Number(r.lot_value || 0), 0);
      const openLotsCount = openLots.data?.length ?? 0;
      const pendingUnits = (openLots.data || []).reduce(
        (s, l) => s + Math.max(0, (l.expected_units || 0) - (l.processed_units || 0)),
        0,
      );

      return {
        trucksToday,
        unitsToday,
        valueToday,
        openLotsCount,
        pendingUnits,
        recent: (recent.data || []) as unknown as import('@/services/inbound/types').TruckReceipt[],
      };
    },
  });
}
