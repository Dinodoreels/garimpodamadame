import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import { CameraOff } from 'lucide-react';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

/** Leitura do código de barras pela câmera. Sempre há a opção de digitar. */
export function BarcodeCamera({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoRef.current!,
        (result) => {
          if (result && !cancelled) {
            cancelled = true;
            controls?.stop();
            onDetected(result.getText());
          }
        },
      )
      .then((c) => {
        controls = c;
        if (cancelled) c.stop();
      })
      .catch(() => setError('Não foi possível abrir a câmera. Digite o código.'));

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [onDetected]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg bg-muted aspect-video">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-primary/70" />
      </div>
      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <CameraOff className="h-4 w-4" /> {error}
        </p>
      )}
      <Button variant="outline" size="lg" className="w-full" onClick={onClose}>
        Fechar câmera
      </Button>
    </div>
  );
}
