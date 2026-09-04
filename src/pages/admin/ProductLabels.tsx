import { useState, useEffect } from 'react';
import { Printer, Search, Plus, Minus, Tag, CheckCircle, Loader2, QrCode, Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { useAdminProducts } from '@/hooks/useProductAdmin';
import { Product } from '@/hooks/useProducts';
import { useSavePrintedLabels } from '@/hooks/useProductLabels';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

interface LabelItem {
  product: Product;
  variantIndex: number;
  quantity: number;
}

async function generateCodeDataUrl(value: string, type: 'barcode' | 'qrcode'): Promise<string> {
  if (type === 'qrcode') {
    try {
      return await QRCode.toDataURL(value, { width: 140, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } });
    } catch {
      return '';
    }
  }
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 1.8,
      height: 50,
      displayValue: true,
      fontSize: 12,
      margin: 4,
      background: '#FFFFFF',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch {
    try {
      return await QRCode.toDataURL(value, { width: 140, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } });
    } catch {
      return '';
    }
  }
}

function CodeDisplay({ value, type }: { value: string; type: 'barcode' | 'qrcode' }) {
  const [src, setSrc] = useState<string>('');
  useEffect(() => {
    let active = true;
    generateCodeDataUrl(value, type).then(url => { if (active) setSrc(url); });
    return () => { active = false; };
  }, [value, type]);
  if (!src) {
    return <div className="text-[10px] font-mono bg-white text-black px-2 py-1 mt-1 inline-block">{value}</div>;
  }
  return (
    <img
      src={src}
      alt={value}
      className="bg-white p-1 mx-auto"
      style={type === 'qrcode' ? { width: 90, height: 90 } : { width: 220, height: 56 }}
    />
  );
}

const formatPrice = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function buildBarcodeValue(_sku: string | null | undefined, _productId: string, labelNumber: number): string {
  // Padronizado: sempre usar identificador da etiqueta (ASCII puro, único, escaneável)
  return `ETQ-${String(labelNumber).padStart(6, '0')}`;
}

export default function ProductLabels() {
  const { data: products = [] } = useAdminProducts();
  const [search, setSearch] = useState('');
  const [labelItems, setLabelItems] = useState<LabelItem[]>([]);
  const [startNumber, setStartNumber] = useState(1);
  const [labelsSaved, setLabelsSaved] = useState(false);
  const savePrintedLabels = useSavePrintedLabels();
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode'>('barcode');

  const filtered = products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  const addLabel = (product: Product, variantIndex: number) => {
    setLabelItems(prev => {
      setLabelsSaved(false);
      const existing = prev.find(l => l.product.id === product.id && l.variantIndex === variantIndex);
      if (existing) {
        return prev.map(l => l === existing ? { ...l, quantity: l.quantity + 1 } : l);
      }
      return [...prev, { product, variantIndex, quantity: 1 }];
    });
  };

  const updateQty = (idx: number, delta: number) => {
    setLabelItems(prev => prev.map((l, i) => i === idx ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l).filter(l => l.quantity > 0));
  };

  const buildCodeDataUrl = (value: string) => generateCodeDataUrl(value, codeType);

  const handlePrint = async () => {
    // Save labels to database first
    if (!labelsSaved) {
      const labelsToSave: Array<{
        label_number: number;
        product_id: string;
        variant_id?: string | null;
        barcode_value: string;
        sku?: string | null;
        product_title: string;
        variant_title?: string | null;
        price?: number;
      }> = [];
      let counter = startNumber;
      for (const item of labelItems) {
        const v = item.product.variants?.[item.variantIndex];
        for (let i = 0; i < item.quantity; i++) {
          const labelNum = counter;
          const barcodeValue = buildBarcodeValue(v?.sku, item.product.id, labelNum);
          labelsToSave.push({
            label_number: counter++,
            product_id: item.product.id,
            variant_id: v?.id || null,
            barcode_value: barcodeValue,
            sku: v?.sku || null,
            product_title: item.product.title,
            variant_title: v?.title || null,
            price: v?.price || item.product.price,
          });
        }
      }
      try {
        await savePrintedLabels.mutateAsync(labelsToSave);
        setLabelsSaved(true);
      } catch {
        return; // error toast already shown by hook
      }
    }

    // Build label HTML with embedded image data URLs (canvas innerHTML doesn't serialize)
    let counter = startNumber;
    const labelHtmls: string[] = [];
    for (const item of labelItems) {
      const v = item.product.variants?.[item.variantIndex];
      const price = formatPrice(v?.price || item.product.price);
      const variantLine = v && v.title !== 'Default' ? `<div class="label-variant">${v.title}</div>` : '';
      const skuLine = v?.sku ? `<div class="label-sku">SKU: ${v.sku}</div>` : '';
      for (let i = 0; i < item.quantity; i++) {
        const numStr = String(counter++).padStart(3, '0');
        const barcodeValue = buildBarcodeValue(v?.sku, item.product.id, counter - 1);
        const dataUrl = await buildCodeDataUrl(barcodeValue);
        labelHtmls.push(`
          <div class="label">
            <div class="label-number">Nº ${numStr}</div>
            <div class="label-title">${item.product.title}</div>
            ${variantLine}
            <div class="label-price">${price}</div>
            ${skuLine}
            ${dataUrl
              ? `<img src="${dataUrl}" class="code-img" alt="${barcodeValue}" />`
              : `<div class="code-fallback">${barcodeValue}</div>`}
          </div>
        `);
      }
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Etiquetas</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; }
        .labels { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; }
        .label { border: 1px dashed #ccc; padding: 8px; width: 280px; text-align: center; page-break-inside: avoid; }
        .label-number { font-size: 9px; color: #666; margin-bottom: 2px; font-weight: bold; }
        .label-title { font-size: 11px; font-weight: bold; margin-bottom: 4px; }
        .label-variant { font-size: 9px; color: #666; margin-bottom: 2px; }
        .label-price { font-size: 14px; font-weight: bold; margin: 4px 0; }
        .label-sku { font-size: 8px; color: #999; }
        .code-img { display: block; margin: 6px auto 0; max-width: 100%; height: auto; }
        .code-fallback { font-family: monospace; font-size: 11px; margin-top: 6px; padding: 4px; border: 1px solid #ccc; }
        @media print { .labels { gap: 2px; padding: 4px; } .label { border: 1px solid #ddd; } }
      </style></head><body>
      <div class="labels">${labelHtmls.join('')}</div>
      <script>
        window.onload=function(){
          var imgs=document.querySelectorAll('img');
          var pending=imgs.length;
          function done(){window.print();setTimeout(function(){window.close();},300);}
          if(pending===0){done();return;}
          imgs.forEach(function(img){
            if(img.complete){if(--pending===0)done();}
            else{img.addEventListener('load',function(){if(--pending===0)done();});
                 img.addEventListener('error',function(){if(--pending===0)done();});}
          });
          setTimeout(done,2000);
        };
      </script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const totalLabels = labelItems.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Etiquetas de Produto" subtitle="Gere etiquetas com código de barras ou QR code para impressão" />

      {/* Code type toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Tipo de código:</span>
        <ToggleGroup type="single" value={codeType} onValueChange={v => v && setCodeType(v as 'barcode' | 'qrcode')}>
          <ToggleGroupItem value="barcode" className="gap-1 text-xs">
            <Barcode className="h-3.5 w-3.5" /> Código de Barras
          </ToggleGroupItem>
          <ToggleGroupItem value="qrcode" className="gap-1 text-xs">
            <QrCode className="h-3.5 w-3.5" /> QR Code
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Product selector */}
        <Card>
          <CardHeader><CardTitle className="font-light text-base">Selecionar Produtos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filtered.slice(0, 30).map(p => (
                <div key={p.id} className="border border-border p-3 space-y-2">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <div className="flex flex-wrap gap-1">
                    {(p.variants || []).map((v, vi) => (
                      <Button key={v.id} size="sm" variant="outline" className="text-xs h-7" onClick={() => addLabel(p, vi)}>
                        <Plus className="h-3 w-3 mr-1" />
                        {v.title !== 'Default' ? v.title : 'Padrão'} — {v.sku || 'sem SKU'}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected labels */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-light text-base flex items-center gap-2">
                <Tag className="h-4 w-4" /> Etiquetas Selecionadas
                {totalLabels > 0 && <Badge variant="secondary">{totalLabels}</Badge>}
              </CardTitle>
              <div className="flex items-center gap-2">
                {totalLabels > 0 && (
                  <div className="flex items-center gap-1">
                    <Label className="text-xs whitespace-nowrap">Nº inicial:</Label>
                    <Input type="number" min={1} value={startNumber} onChange={e => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 h-8 text-xs" />
                  </div>
                )}
                {totalLabels > 0 && (
                  <Button size="sm" onClick={handlePrint} disabled={savePrintedLabels.isPending}>
                    {savePrintedLabels.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Registrando...</>
                    ) : labelsSaved ? (
                      <><CheckCircle className="h-4 w-4 mr-1" /> Reimprimir</>
                    ) : (
                      <><Printer className="h-4 w-4 mr-1" /> Registrar e Imprimir</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {labelItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Selecione produtos para gerar etiquetas</p>
            ) : (
              <div className="space-y-2">
                {labelItems.map((item, idx) => {
                  const v = item.product.variants?.[item.variantIndex];
                  return (
                    <div key={idx} className="flex items-center gap-3 border border-border p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.title}</p>
                        <p className="text-xs text-muted-foreground">{v?.title} — SKU: {v?.sku || '-'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQty(idx, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQty(idx, 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visible preview */}
      {totalLabels > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-light text-base">Prévia das Etiquetas</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(() => {
                let counter = startNumber;
                return labelItems.slice(0, 6).map((item, idx) => {
                  const v = item.product.variants?.[item.variantIndex];
                  const num = counter;
                  const barcodeValue = buildBarcodeValue(v?.sku, item.product.id, num);
                  counter += item.quantity;
                  return (
                    <div key={idx} className="border border-dashed border-border p-4 w-[280px] text-center space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground">Nº {String(num).padStart(3, '0')}{item.quantity > 1 ? ` — ${String(num + item.quantity - 1).padStart(3, '0')}` : ''}</p>
                      <p className="text-xs font-bold truncate">{item.product.title}</p>
                      {v && v.title !== 'Default' && <p className="text-[10px] text-muted-foreground">{v.title}</p>}
                      <p className="text-base font-bold">{formatPrice(v?.price || item.product.price)}</p>
                      {v?.sku && <p className="text-[9px] text-muted-foreground">SKU: {v.sku}</p>}
                      <CodeDisplay value={barcodeValue} type={codeType} />
                      {item.quantity > 1 && <Badge variant="outline" className="text-[10px]">×{item.quantity}</Badge>}
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
