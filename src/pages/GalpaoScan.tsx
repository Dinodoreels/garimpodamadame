import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, ScanLine } from 'lucide-react';
import { ScanScreen } from '@/components/admin/inbound/ScanScreen';
import { operatorService, OPERATOR_TOKEN_KEY } from '@/services/inbound/scanService';

/** Tela do tablet: só recebimento e Garimpo Scan, sem o painel administrativo. */
export default function GalpaoScan() {
  const navigate = useNavigate();
  const [operator, setOperator] = useState<{ name: string; code: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem(OPERATOR_TOKEN_KEY)) {
      navigate('/galpao', { replace: true });
      return;
    }
    operatorService.me()
      .then(res => setOperator({ name: res.operator.name, code: res.operator.code }))
      .catch(() => {
        localStorage.removeItem(OPERATOR_TOKEN_KEY);
        navigate('/galpao', { replace: true });
      })
      .finally(() => setChecking(false));
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <ScanLine className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">Garimpo Scan</p>
            <p className="text-xs text-muted-foreground truncate">{operator?.name} · {operator?.code}</p>
          </div>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={async () => { await operatorService.logout(); navigate('/galpao', { replace: true }); }}
        >
          <LogOut className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </header>
      <div className="mx-auto max-w-3xl p-4">
        <ScanScreen fullscreen />
      </div>
    </div>
  );
}
