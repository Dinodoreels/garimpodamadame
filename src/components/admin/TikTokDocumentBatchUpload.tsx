import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileCheck2, FileUp, Loader2, PackageCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import type { AdminOrder } from '@/hooks/useAdminData';
import { extractSinglePdfPage, parseTikTokPdf, type ParsedTikTokPdf } from '@/lib/tiktokPdfBatch';
import { toast } from 'sonner';

const BUCKET = 'shipping-labels';

interface MatchRow {
  order: AdminOrder;
  trackingCode: string;
  labelPage?: number;
  danfePage?: number;
  replacesLabel: boolean;
}

interface TikTokDocumentBatchUploadProps {
  orders: AdminOrder[];
  onCompleted: (labels: Record<string, any>) => void;
}

function normalizeCode(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

function pageForCode(pdf: ParsedTikTokPdf | null, trackingCode: string) {
  return pdf?.pages.find(page => page.numericCodes.includes(trackingCode))?.pageNumber;
}

export function TikTokDocumentBatchUpload({ orders, onCompleted }: TikTokDocumentBatchUploadProps) {
  const labelInputRef = useRef<HTMLInputElement>(null);
  const danfeInputRef = useRef<HTMLInputElement>(null);
  const [labelsPdf, setLabelsPdf] = useState<ParsedTikTokPdf | null>(null);
  const [danfePdf, setDanfePdf] = useState<ParsedTikTokPdf | null>(null);
  const [reading, setReading] = useState<'labels' | 'danfe' | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const tikTokOrders = useMemo(
    () => orders.filter(order => /tiktok/i.test(`${order.source ?? ''} ${order.bling_channel ?? ''}`)),
    [orders],
  );

  const matches = useMemo<MatchRow[]>(() => {
    const rows: MatchRow[] = [];
    for (const order of tikTokOrders) {
      const trackingCode = normalizeCode(order.tracking_code);
      if (!trackingCode) continue;
      const labelPage = pageForCode(labelsPdf, trackingCode);
      const danfePage = pageForCode(danfePdf, trackingCode);
      if (!labelPage && !danfePage) continue;
      rows.push({
        order,
        trackingCode,
        labelPage,
        danfePage,
        replacesLabel: Boolean(order.marketplace_shipping_label?.storage_path || order.marketplace_shipping_label?.label_url),
      });
    }
    return rows;
  }, [danfePdf, labelsPdf, tikTokOrders]);

  const unmatched = useMemo(() => {
    const matchedLabelPages = new Set(matches.map(row => row.labelPage).filter(Boolean));
    const matchedDanfePages = new Set(matches.map(row => row.danfePage).filter(Boolean));
    return {
      labels: labelsPdf?.pages.filter(page => !matchedLabelPages.has(page.pageNumber)).map(page => page.pageNumber) ?? [],
      danfes: danfePdf?.pages.filter(page => !matchedDanfePages.has(page.pageNumber)).map(page => page.pageNumber) ?? [],
    };
  }, [danfePdf, labelsPdf, matches]);

  const choosePdf = async (kind: 'labels' | 'danfe', file?: File) => {
    if (!file) return;
    setReading(kind);
    try {
      const parsed = await parseTikTokPdf(file);
      if (kind === 'labels') setLabelsPdf(parsed);
      else setDanfePdf(parsed);
      toast.success(`${parsed.pages.length} página(s) lida(s) em ${file.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível ler o PDF.');
    } finally {
      setReading(null);
      if (kind === 'labels' && labelInputRef.current) labelInputRef.current.value = '';
      if (kind === 'danfe' && danfeInputRef.current) danfeInputRef.current.value = '';
    }
  };

  const uploadPage = async (path: string, blob: Blob) => {
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (error) throw error;
  };

  const save = async () => {
    if (!matches.length) {
      toast.error('Nenhuma página corresponde ao rastreamento dos pedidos TikTok atuais.');
      return;
    }
    const replacements = matches.filter(row => row.replacesLabel && row.labelPage).length;
    if (replacements && !window.confirm(`${replacements} etiqueta(s) existente(s) serão substituídas pelos PDFs enviados. Continuar?`)) return;

    setSaving(true);
    setProgress(0);
    const updatedLabels: Record<string, any> = {};
    let completed = 0;
    const totalSteps = matches.reduce((sum, row) => sum + Number(Boolean(row.labelPage)) + Number(Boolean(row.danfePage)), 0);

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Sua sessão expirou. Entre novamente.');
      const now = new Date().toISOString();

      for (const row of matches) {
        if (row.labelPage && labelsPdf) {
          const path = `tiktok/${row.order.id}/etiqueta-oficial.pdf`;
          const page = await extractSinglePdfPage(labelsPdf.bytes, row.labelPage - 1);
          await uploadPage(path, page);
          const labelRow = {
            order_id: row.order.id,
            bling_order_id: String(row.order.marketplace_shipping_label?.bling_order_id ?? row.order.bling_order_number ?? row.order.order_number),
            platform: 'TikTok Shop',
            status: 'ready',
            format: 'PDF',
            label_url: null,
            storage_path: path,
            upload_source: 'manual_tiktok_batch',
            uploaded_at: now,
            uploaded_by: auth.user.id,
            printed_at: null,
            provider_note: `Etiqueta oficial importada em lote pelo rastreamento ${row.trackingCode}.`,
            provider_payload: { source: 'manual_tiktok_batch', original_file_name: labelsPdf.file.name, page: row.labelPage, tracking_code: row.trackingCode },
            last_error: null,
            last_checked_at: now,
          };
          const { data, error } = await supabase.from('marketplace_shipping_labels').upsert(labelRow, { onConflict: 'order_id' }).select('*').single();
          if (error) throw error;
          updatedLabels[row.order.id] = data;
          completed += 1;
          setProgress(Math.round((completed / totalSteps) * 100));
        }

        if (row.danfePage && danfePdf) {
          const path = `tiktok-danfe/${row.order.id}/danfe-oficial.pdf`;
          const page = await extractSinglePdfPage(danfePdf.bytes, row.danfePage - 1);
          await uploadPage(path, page);
          const fiscalRow = {
            order_id: row.order.id,
            provider: 'bling',
            status: 'ready',
            danfe_url: null,
            danfe_storage_path: path,
            upload_source: 'manual_tiktok_batch',
            uploaded_at: now,
            uploaded_by: auth.user.id,
            requested_by: auth.user.id,
            validation_errors: [],
            validation_details: { source: 'manual_tiktok_batch', original_file_name: danfePdf.file.name, page: row.danfePage, tracking_code: row.trackingCode },
            error_message: null,
          };
          const { error } = await supabase.from('fiscal_documents').upsert(fiscalRow, { onConflict: 'order_id' });
          if (error) throw error;
          completed += 1;
          setProgress(Math.round((completed / totalSteps) * 100));
        }
      }
      onCompleted(updatedLabels);
      const both = matches.filter(row => row.labelPage && row.danfePage).length;
      const labelOnly = matches.filter(row => row.labelPage && !row.danfePage).length;
      const danfeOnly = matches.filter(row => !row.labelPage && row.danfePage).length;
      toast.success(`${both} pedido(s) com etiqueta e DANFE; ${labelOnly} somente etiqueta; ${danfeOnly} somente DANFE.`);
      setLabelsPdf(null);
      setDanfePdf(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a importação em lote.');
    } finally {
      setSaving(false);
    }
  };

  const hasFiles = Boolean(labelsPdf || danfePdf);
  const noTrackedOrders = tikTokOrders.every(order => !normalizeCode(order.tracking_code));

  return (
    <section className="space-y-4 border p-4">
      <div className="flex items-start gap-3">
        <PackageCheck className="mt-0.5 h-5 w-5" />
        <div>
          <h3 className="font-medium">Importar etiquetas e DANFEs em lote</h3>
          <p className="text-xs text-muted-foreground">Selecione os dois PDFs baixados do TikTok. Cada página será vinculada pelo código de rastreamento.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input ref={labelInputRef} className="hidden" type="file" accept="application/pdf,.pdf" aria-label="Selecionar PDF de etiquetas TikTok" onChange={event => void choosePdf('labels', event.target.files?.[0])} />
        <Button type="button" variant="outline" className="h-auto min-h-20 justify-start" disabled={reading !== null || saving} onClick={() => labelInputRef.current?.click()}>
          {reading === 'labels' ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <FileUp className="mr-3 h-5 w-5" />}
          <span className="min-w-0 text-left"><span className="block font-medium">PDF de etiquetas</span><span className="block truncate text-xs text-muted-foreground">{labelsPdf ? `${labelsPdf.file.name} · ${labelsPdf.pages.length} página(s)` : 'Selecionar Shipping_label.pdf'}</span></span>
        </Button>
        <input ref={danfeInputRef} className="hidden" type="file" accept="application/pdf,.pdf" aria-label="Selecionar PDF de DANFEs TikTok" onChange={event => void choosePdf('danfe', event.target.files?.[0])} />
        <Button type="button" variant="outline" className="h-auto min-h-20 justify-start" disabled={reading !== null || saving} onClick={() => danfeInputRef.current?.click()}>
          {reading === 'danfe' ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <FileCheck2 className="mr-3 h-5 w-5" />}
          <span className="min-w-0 text-left"><span className="block font-medium">PDF de NF-e/DANFE</span><span className="block truncate text-xs text-muted-foreground">{danfePdf ? `${danfePdf.file.name} · ${danfePdf.pages.length} página(s)` : 'Selecionar NF-e.pdf'}</span></span>
        </Button>
      </div>

      {hasFiles && noTrackedOrders && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Pedidos sem rastreamento</AlertTitle><AlertDescription>Atualize os pedidos do TikTok antes de importar. O vínculo seguro depende do mesmo código presente nos PDFs.</AlertDescription></Alert>}

      {hasFiles && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{matches.length} pedido(s) encontrado(s)</Badge>
            {!!unmatched.labels.length && <Badge variant="outline">Etiqueta: página(s) {unmatched.labels.join(', ')} sem pedido</Badge>}
            {!!unmatched.danfes.length && <Badge variant="outline">DANFE: página(s) {unmatched.danfes.join(', ')} sem pedido</Badge>}
          </div>
          {!!matches.length && (
            <Table>
              <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Rastreamento</TableHead><TableHead>Etiqueta</TableHead><TableHead>DANFE</TableHead></TableRow></TableHeader>
              <TableBody>{matches.map(row => (
                <TableRow key={row.order.id}>
                  <TableCell className="font-medium">{row.order.order_number}</TableCell>
                  <TableCell>{row.trackingCode}</TableCell>
                  <TableCell>{row.labelPage ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />Página {row.labelPage}{row.replacesLabel ? ' · substituirá' : ''}</span> : 'Ausente'}</TableCell>
                  <TableCell>{row.danfePage ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />Página {row.danfePage}</span> : 'Ausente'}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
          {saving && <Progress value={progress} aria-label={`Importação ${progress}% concluída`} />}
          <Button type="button" onClick={() => void save()} disabled={saving || !matches.length}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
            Confirmar e vincular {matches.length || ''} pedido(s)
          </Button>
        </div>
      )}
    </section>
  );
}