import { useState } from 'react';
import { Barcode, X, Package, CheckCircle, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLabelsByOrder, useFindLabelByBarcode, useLinkLabelToOrder, useUnlinkLabel } from '@/hooks/useProductLabels';
import { toast } from 'sonner';

interface LinkedLabelsSectionProps {
  orderId: string;
  totalOrderItems?: number;
  onStatusChange?: (orderId: string, status: string) => void;
}

const formatPrice = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function LinkedLabelsSection({ orderId, totalOrderItems = 0, onStatusChange }: LinkedLabelsSectionProps) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const { data: labels = [], isLoading } = useLabelsByOrder(orderId);
  const findLabel = useFindLabelByBarcode();
  const linkLabel = useLinkLabelToOrder();
  const unlinkLabel = useUnlinkLabel();

  const linkedCount = labels.length;
  const allLinked = totalOrderItems > 0 && linkedCount >= totalOrderItems;
  const progress = totalOrderItems > 0 ? Math.min(100, (linkedCount / totalOrderItems) * 100) : 0;

  const handleScan = async () => {
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    try {
      const label = await findLabel.mutateAsync(barcode);
      if (!label) {
        toast.error('Etiqueta não encontrada ou já vinculada', {
          description: 'Verifique o código de barras ou se a peça já foi vendida.',
        });
        return;
      }
      await linkLabel.mutateAsync({ labelId: label.id, orderId });
      setBarcodeInput('');
    } catch {
      toast.error('Erro ao buscar etiqueta');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan();
    }
  };

  const handleConfirmShipment = () => {
    if (onStatusChange) {
      onStatusChange(orderId, 'shipped');
    }
  };

  return (
    <div>
      <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3 font-light flex items-center gap-2">
        <Package className="h-3.5 w-3.5" />
        Peças Vinculadas
      </h3>

      {/* Progress indicator */}
      {totalOrderItems > 0 && (
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {linkedCount} de {totalOrderItems} {totalOrderItems === 1 ? 'peça escaneada' : 'peças escaneadas'}
            </span>
            {allLinked && (
              <Badge variant="default" className="text-[10px] gap-1 bg-green-600">
                <CheckCircle className="h-3 w-3" />
                Completo
              </Badge>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Escanear ou digitar código de barras..."
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
            autoFocus={false}
          />
        </div>
        <Button
          size="sm"
          onClick={handleScan}
          disabled={!barcodeInput.trim() || findLabel.isPending || linkLabel.isPending}
        >
          Vincular
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
      ) : labels.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma peça vinculada. Escaneie o código de barras da etiqueta para vincular.
        </p>
      ) : (
        <div className="space-y-2">
          {labels.map(label => (
            <div key={label.id} className="flex items-center gap-3 p-2 border border-border rounded">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Nº {String(label.label_number).padStart(3, '0')}
                  </Badge>
                  <span className="text-sm font-medium truncate">{label.product_title}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {label.variant_title && label.variant_title !== 'Default' && (
                    <span className="text-xs text-muted-foreground">{label.variant_title}</span>
                  )}
                  {label.sku && (
                    <span className="text-xs text-muted-foreground">SKU: {label.sku}</span>
                  )}
                  <span className="text-xs font-medium">{formatPrice(label.price)}</span>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => unlinkLabel.mutate({ labelId: label.id, orderId })}
                title="Desvincular peça"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center pt-1">
            {labels.length} {labels.length === 1 ? 'peça vinculada' : 'peças vinculadas'}
          </p>
        </div>
      )}

      {/* Confirm Shipment button */}
      {allLinked && onStatusChange && (
        <Button
          className="w-full mt-3 gap-2"
          onClick={handleConfirmShipment}
        >
          <Truck className="h-4 w-4" />
          Confirmar Envio — Todas as peças escaneadas
        </Button>
      )}
    </div>
  );
}
