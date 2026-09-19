import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ScanLine, Sparkles, Check, RotateCcw, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { scanService, type IdentifyResult, type ScanLot } from '@/services/inbound/scanService';
import { fileToCompressedDataUrl } from '@/lib/imageCapture';
import { CONDITIONS } from '@/services/inbound/types';
import { BarcodeCamera } from './BarcodeCamera';

const EMPTY_FORM = {
  title: '', brand: '', category: '', sku: '',
  condition_code: 'T1', quantity: 1, suggested_price: '', description: '', notes: '',
};

type Form = typeof EMPTY_FORM;

interface Props {
  /** Quando true, ocupa a tela inteira (tablet do galpão). */
  fullscreen?: boolean;
}

export function ScanScreen({ fullscreen = false }: Props) {
  const qc = useQueryClient();
  const [lotId, setLotId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [identified, setIdentified] = useState<IdentifyResult | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [times, setTimes] = useState<number[]>([]);
  const startedAt = useRef<number>(Date.now());
  const saveInFlight = useRef(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const barcodeInput = useRef<HTMLInputElement>(null);

  const { data: lots = [], isLoading: loadingLots } = useQuery({
    queryKey: ['inbound', 'scan', 'lots'],
    queryFn: scanService.listLots,
  });

  const { data: stats } = useQuery({
    queryKey: ['inbound', 'scan', 'stats', lotId],
    queryFn: () => scanService.lotStats(lotId),
    enabled: !!lotId,
  });

  useEffect(() => {
    if (!lotId && lots.length === 1) setLotId(lots[0].id);
  }, [lots, lotId]);

  const lot: ScanLot | undefined = useMemo(() => lots.find(l => l.id === lotId), [lots, lotId]);
  const remaining = lot ? Math.max(0, lot.expected_units - lot.processed_units) : 0;
  const avgSeconds = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

  const resetPiece = useCallback(() => {
    setBarcode('');
    setPhoto(null);
    setIdentified(null);
    setAiWarning(null);
    setForm(EMPTY_FORM);
    startedAt.current = Date.now();
    setTimeout(() => barcodeInput.current?.focus(), 50);
  }, []);

  async function handlePhoto(file: File) {
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPhoto(dataUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível usar a foto.');
    }
  }

  async function runIdentify() {
    if (!barcode.trim() && !photo) {
      toast.error('Bipe o código ou tire uma foto antes.');
      return;
    }
    setIdentifying(true);
    setAiWarning(null);
    try {
      const res = await scanService.identify({
        barcode: barcode.trim() || undefined,
        image_base64: photo || undefined,
      });
      setIdentified(res);

      if (res.source === 'catalog' && res.match) {
        setForm(f => ({
          ...f,
          title: res.match!.title ?? '',
          brand: res.match!.brand ?? '',
          category: res.match!.category ?? '',
          sku: res.match!.sku ?? '',
          suggested_price: res.match!.price != null ? String(res.match!.price) : '',
        }));
        toast.success('Produto encontrado no catálogo — mesmo SKU reaproveitado.');
      } else if (res.result) {
        const suggestedTitle = res.result.title?.toLowerCase().includes('não identific') ? '' : (res.result.title ?? '');
        setForm(f => ({
          ...f,
          title: suggestedTitle,
          brand: res.result!.brand ?? '',
          category: res.result!.category ?? '',
          description: res.result!.description ?? '',
          sku: res.result!.sku ?? f.sku,
          condition_code: (res.result!.condition_guess as string) || f.condition_code,
          suggested_price: res.result!.estimated_price_brl != null ? String(res.result!.estimated_price_brl) : res.result!.price != null ? String(res.result!.price) : '',
        }));
        if ((res.candidates?.length ?? 0) < 3) {
          const sourceDetail = res.warnings?.length ? ` ${res.warnings.join(' ')}` : '';
          const quotaBlocked = res.warnings?.some(warning => /limite da pesquisa|cota/i.test(warning));
          setAiWarning(quotaBlocked
            ? `A foto foi analisada, mas a pesquisa de anúncios atingiu o limite da conta Google. Libere a cota e toque em Identificar produto novamente.${sourceDetail}`
            : `Foram encontrados ${res.candidates?.length ?? 0} de 3 anúncios válidos. Tire uma foto mais próxima e bem iluminada ou informe o código de barras.${sourceDetail}`);
        } else if ((res.confidence ?? 0) < 0.75) {
          setAiWarning('As fontes não deram certeza suficiente. Ao gravar, a peça vai para Pendências.');
        } else if (res.warnings?.length) {
          setAiWarning(res.warnings.join(' '));
        }
      }
    } catch (e) {
      setAiWarning(e instanceof Error ? e.message : 'As fontes não responderam. Preencha manualmente.');
    } finally {
      setIdentifying(false);
    }
  }

  async function handleSave(forceReview = false) {
    if (saveInFlight.current) return;
    if (!lotId) return toast.error('Escolha o lote.');
    if (!forceReview && !form.title.trim()) return toast.error('Informe o que é o produto ou envie para análise manual.');
    saveInFlight.current = true;
    setSaving(true);
    try {
      const match = identified?.source === 'catalog' ? identified.match : null;
      const identificationNeedsReview = Boolean(identified?.needs_review);
      const res = await scanService.save({
        lot_id: lotId,
        barcode: barcode.trim() || null,
        quantity: Number(form.quantity) || 1,
        condition_code: form.condition_code,
        title: form.title.trim(),
        brand: form.brand.trim() || null,
        category: form.category.trim() || null,
        sku: form.sku.trim() || match?.sku || null,
        product_id: match?.product_id ?? null,
        variant_id: match?.variant_id ?? null,
        suggested_price: form.suggested_price ? Number(form.suggested_price) : null,
        notes: form.notes.trim() || null,
        description: form.description.trim() || null,
        ai_source: identified?.source ?? 'manual',
        ai_confidence: identified?.confidence ?? null,
        ai_data: identified?.result
          ? { ...identified.result, market_references: identified.candidates ?? [] }
          : identified?.match ?? null,
        photo_base64: photo,
        identification_result_ids: identified?.result_ids,
        force_review: forceReview || identificationNeedsReview,
        auto_publish: !forceReview && !identificationNeedsReview,
      });
      setTimes(t => [...t.slice(-19), Math.round((Date.now() - startedAt.current) / 1000)]);
      if (res.pending) {
        toast.warning('Peça gravada em Pendências para conferência.');
      } else if (res.publication) {
        toast.success('Produto publicado na loja, no painel e enviado para sincronização.');
      } else {
        toast.warning('Peça gravada, mas ainda falta informação para publicar.');
      }
      qc.invalidateQueries({ queryKey: ['inbound'] });
      resetPiece();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível gravar.');
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  const set = (k: keyof Form, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className={fullscreen ? 'space-y-4' : 'space-y-6'}>
      {/* Lote e contadores */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Lote</Label>
              <Select value={lotId} onValueChange={setLotId} disabled={loadingLots}>
                <SelectTrigger className="h-14 text-base">
                  <SelectValue placeholder={loadingLots ? 'Carregando...' : 'Escolha o lote aberto'} />
                </SelectTrigger>
                <SelectContent>
                  {lots.map(l => (
                    <SelectItem key={l.id} value={l.id} className="text-base py-3">
                      {l.code}{l.description ? ` — ${l.description}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!loadingLots && lots.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum lote aberto. Cadastre um recebimento primeiro.
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 self-end">
              <Stat label="Bipadas" value={stats?.scanned ?? 0} />
              <Stat label="Faltam" value={remaining} />
              <Stat label="Média" value={avgSeconds != null ? `${avgSeconds}s` : '—'} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leitura */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {cameraOpen ? (
            <BarcodeCamera
              onDetected={(code) => { setBarcode(code); setCameraOpen(false); toast.success(`Código lido: ${code}`); }}
              onClose={() => setCameraOpen(false)}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button size="lg" variant="outline" className="h-16 text-base" onClick={() => setCameraOpen(true)}>
                <ScanLine className="mr-2 h-5 w-5" /> Bipar código
              </Button>
              <Button size="lg" variant="outline" className="h-16 text-base" onClick={() => photoInput.current?.click()}>
                <Camera className="mr-2 h-5 w-5" /> Tirar foto
              </Button>
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ''; }}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Código de barras</Label>
            <Input
              ref={barcodeInput}
              className="h-14 text-base"
              inputMode="numeric"
              placeholder="Digite ou bipe"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runIdentify(); }}
            />
          </div>

          {photo && (
            <div className="flex items-center gap-3">
              <img src={photo} alt="Foto da peça" className="h-20 w-20 rounded object-cover border" />
              <Button variant="ghost" size="sm" onClick={() => setPhoto(null)}>Remover foto</Button>
            </div>
          )}

          <Button size="lg" className="h-16 w-full text-base" onClick={runIdentify} disabled={identifying}>
            {identifying
              ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Identificando...</>
              : <><Sparkles className="mr-2 h-5 w-5" /> Identificar produto</>}
          </Button>

          {identified?.source === 'catalog' && (
            <Badge variant="secondary" className="text-sm">Encontrado no catálogo · SKU {identified.match?.sku ?? '—'}</Badge>
          )}
          {identified && identified.source !== 'catalog' && (
            <Badge variant="secondary" className="text-sm">
              {identified.source === 'cosmos' ? 'Base GTIN' : identified.source === 'google_lens' ? 'Busca visual' : 'Fontes externas'} · {identified.confidence != null && identified.confidence > 0 ? `confiança ${Math.round(identified.confidence * 100)}%` : 'sem confirmação'}
            </Badge>
          )}
          {aiWarning && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {aiWarning}
            </p>
          )}
          {identified && identified.source !== 'catalog' && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Anúncios encontrados ({identified.candidates?.length ?? 0}/3)</p>
              {(identified.candidates?.length ?? 0) > 0 ? <div className="grid gap-3 md:grid-cols-3">
                {identified.candidates?.slice(0, 3).map((candidate, index) => (
                  <div key={candidate.id ?? `${candidate.product_url}-${index}`} className="overflow-hidden rounded-md border bg-card">
                    {candidate.image_url && <img src={candidate.image_url} alt={candidate.title ?? 'Produto encontrado'} className="aspect-square w-full object-cover" />}
                    <div className="space-y-1 p-3">
                      <p className="line-clamp-2 text-sm font-medium">{candidate.title ?? 'Anúncio sem título'}</p>
                      <p className="text-xs text-muted-foreground">{candidate.source ?? 'Fonte externa'}</p>
                      <p className="text-sm font-semibold">{candidate.price != null ? Number(candidate.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Preço não informado'}</p>
                      {candidate.product_url && <a className="inline-flex items-center gap-1 text-xs text-primary underline" href={candidate.product_url} target="_blank" rel="noreferrer">Abrir anúncio <ExternalLink className="h-3 w-3" /></a>}
                    </div>
                  </div>
                ))}
              </div> : <p className="text-sm text-muted-foreground">Nenhum anúncio com preço confirmado foi encontrado. O item ficará para revisão.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmação */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="O que é" className="sm:col-span-2">
              <Input className="h-14 text-base" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Nome do produto" />
            </Field>
            <Field label="Marca">
              <Input className="h-12" value={form.brand} onChange={e => set('brand', e.target.value)} />
            </Field>
            <Field label="Categoria">
              <Input className="h-12" value={form.category} onChange={e => set('category', e.target.value)} />
            </Field>
            <Field label="SKU">
              <Input className="h-12" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Reaproveitado do catálogo quando existir" />
            </Field>
            <Field label="Preço sugerido (R$)">
              <Input className="h-12" inputMode="decimal" value={form.suggested_price} onChange={e => set('suggested_price', e.target.value)} />
            </Field>
            <Field label="Condição">
              <Select value={form.condition_code} onValueChange={v => set('condition_code', v)}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITIONS).map(([code, c]) => (
                    <SelectItem key={code} value={code} className="py-3">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Quantidade">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-12 w-12 text-lg"
                  onClick={() => set('quantity', Math.max(1, Number(form.quantity) - 1))}>−</Button>
                <Input className="h-12 text-center text-base" inputMode="numeric" value={form.quantity}
                  onChange={e => set('quantity', Math.max(1, Number(e.target.value) || 1))} />
                <Button variant="outline" size="icon" className="h-12 w-12 text-lg"
                  onClick={() => set('quantity', Number(form.quantity) + 1)}>+</Button>
              </div>
            </Field>
            <Field label="Observação" className="sm:col-span-2">
              <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </Field>
            <Field label="Descrição automática" className="sm:col-span-2">
              <Textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Descrição criada com base nos anúncios reais" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Button size="lg" className="h-16 text-base" onClick={()=>handleSave(false)} disabled={saving || !lotId}>
              {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
              Gravar, publicar e ir para a próxima
            </Button>
            <Button size="lg" variant="outline" className="h-16" onClick={resetPiece}>
              <RotateCcw className="mr-2 h-5 w-5" /> Limpar
            </Button>
          </div>
          {!barcode.trim() && !photo && (
            <Button size="lg" variant="secondary" className="h-14 w-full" onClick={()=>handleSave(true)} disabled={saving || !lotId}>
              <AlertTriangle className="mr-2 h-5 w-5" /> Enviar para análise manual
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
