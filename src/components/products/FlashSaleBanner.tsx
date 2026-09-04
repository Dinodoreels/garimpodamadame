import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

interface FlashSaleBannerProps {
  endsAt: string;
  title?: string;
}

export function FlashSaleBanner({ endsAt, title }: FlashSaleBannerProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const end = new Date(endsAt).getTime();
      const diff = end - now;
      if (diff <= 0) { setTimeLeft('Encerrada'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (timeLeft === 'Encerrada') return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-3 py-1.5 flex items-center gap-2 text-xs tracking-wider">
      <Zap className="h-3.5 w-3.5" />
      <span className="font-medium">{title || 'FLASH SALE'}</span>
      <span className="font-mono ml-auto">{timeLeft}</span>
    </div>
  );
}
