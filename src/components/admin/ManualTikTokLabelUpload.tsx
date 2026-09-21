import { useRef, useState } from 'react';
import { FileUp, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';

const BUCKET = 'shipping-labels';
const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface ManualTikTokLabelUploadProps {
  orderId: string;
  orderNumber: string;
  source?: string | null;
  blingOrderId?: string | null;
  label?: any;
  onChanged?: (label: any | null) => void;
  compact?: boolean;
}

export function ManualTikTokLabelUpload({
  orderId,
  orderNumber,
  source,
  blingOrderId,
  label,
  onChanged,
  compact = false,
}: ManualTikTokLabelUploadProps) {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const isTikTok = /tiktok/i.test(String(source ?? '') + String(label?.platform ?? ''));
  const isManual = String(label?.upload_source ?? '').startsWith('manual_tiktok');

  if (!isTikTok || roleLoading || !isAdmin) return null;

  const upload = async (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Selecione o PDF oficial baixado no TikTok Shop.');
      return;
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      toast.error('O PDF deve ter no máximo 20 MB.');
      return;
    }

    const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
    if (signature !== '%PDF-') {
      toast.error('O arquivo selecionado não é um PDF válido.');
      return;
    }

    setBusy(true);
    const storagePath = `tiktok/${orderId}/etiqueta-oficial.pdf`;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Sua sessão expirou. Entre novamente.');

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;

      const now = new Date().toISOString();
      const row = {
        order_id: orderId,
        bling_order_id: String(label?.bling_order_id ?? blingOrderId ?? orderNumber),
        platform: 'TikTok Shop',
        status: 'ready',
        format: 'PDF',
        label_url: null,
        storage_path: storagePath,
        upload_source: 'manual_tiktok',
        uploaded_at: now,
        uploaded_by: auth.user.id,
        printed_at: null,
        provider_note: 'PDF oficial enviado manualmente pelo painel.',
        provider_payload: { source: 'manual_tiktok', original_file_name: file.name },
        last_error: null,
        last_checked_at: now,
      };
      const { data, error } = await supabase
        .from('marketplace_shipping_labels')
        .upsert(row, { onConflict: 'order_id' })
        .select('*')
        .single();
      if (error) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw error;
      }
      onChanged?.(data);
      toast.success(`Etiqueta oficial vinculada ao pedido ${orderNumber}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a etiqueta.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    if (!label?.storage_path || !window.confirm(`Remover a etiqueta manual do pedido ${orderNumber}?`)) return;
    setBusy(true);
    try {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([label.storage_path]);
      if (storageError) throw storageError;
      const { data, error } = await supabase
        .from('marketplace_shipping_labels')
        .update({
          status: 'pending',
          label_url: null,
          storage_path: null,
          upload_source: null,
          uploaded_at: null,
          uploaded_by: null,
          printed_at: null,
          provider_note: 'Etiqueta manual removida. Aguardando PDF oficial.',
        })
        .eq('order_id', orderId)
        .select('*')
        .single();
      if (error) throw error;
      onChanged?.(data);
      toast.success('Etiqueta manual removida.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a etiqueta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={compact ? 'flex flex-wrap gap-2' : 'space-y-2'}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        aria-label={`Enviar etiqueta oficial do pedido ${orderNumber}`}
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
        {isManual ? 'Substituir PDF' : 'Enviar PDF do TikTok'}
      </Button>
      {isManual && (
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void remove()}>
          <Trash2 className="mr-2 h-4 w-4" />Remover
        </Button>
      )}
    </div>
  );
}