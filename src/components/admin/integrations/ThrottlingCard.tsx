import { Shield, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { ThrottlingConfig } from '@/hooks/useIntegrations';

interface Props {
  value: ThrottlingConfig;
  onChange: (v: ThrottlingConfig) => void;
}

export function ThrottlingCard({ value, onChange }: Props) {
  const set = (patch: Partial<ThrottlingConfig>) => onChange({ ...value, ...patch });
  const setCh = (ch: 'whatsapp' | 'email' | 'push', patch: any) =>
    onChange({ ...value, [ch]: { ...value[ch], ...patch } });

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 mt-0.5 text-amber-600" />
            <div>
              <CardTitle className="text-sm">Cadência de Envio (Anti-Bloqueio)</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Distribui envios ao longo do tempo para o Gmail, WhatsApp e Push não marcarem como spam ou bloquearem o canal.
              </CardDescription>
            </div>
          </div>
          <Switch checked={value.enabled} onCheckedChange={(c) => set({ enabled: c })} />
        </div>
      </CardHeader>
      {value.enabled && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Limite global / minuto</Label>
              <Input
                type="number"
                min={1}
                value={value.global_max_per_minute}
                onChange={(e) => set({ global_max_per_minute: Math.max(1, parseInt(e.target.value) || 1) })}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Janela de distribuição (min)</Label>
              <Input
                type="number"
                min={1}
                value={value.spread_window_minutes}
                onChange={(e) => set({ spread_window_minutes: Math.max(1, parseInt(e.target.value) || 1) })}
                className="h-8"
              />
            </div>
          </div>

          {(['whatsapp', 'email', 'push'] as const).map((ch) => (
            <div key={ch} className="rounded-md border p-3 space-y-2 bg-background/40">
              <p className="text-xs font-semibold uppercase tracking-wide">{ch}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Máx/min</Label>
                  <Input type="number" min={1} value={value[ch].max_per_minute}
                    onChange={(e) => setCh(ch, { max_per_minute: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Delay mín (s)</Label>
                  <Input type="number" min={0} value={value[ch].min_delay_seconds}
                    onChange={(e) => setCh(ch, { min_delay_seconds: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Variação (s)</Label>
                  <Input type="number" min={0} value={value[ch].jitter_seconds}
                    onChange={(e) => setCh(ch, { jitter_seconds: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="h-8" />
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-md border p-3 space-y-2 bg-background/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs">Horário silencioso (não envia mensagens promocionais)</Label>
              </div>
              <Switch checked={value.quiet_hours.enabled}
                onCheckedChange={(c) => set({ quiet_hours: { ...value.quiet_hours, enabled: c } })} />
            </div>
            {value.quiet_hours.enabled && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Início</Label>
                  <Input type="time" value={value.quiet_hours.start}
                    onChange={(e) => set({ quiet_hours: { ...value.quiet_hours, start: e.target.value } })}
                    className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Fim</Label>
                  <Input type="time" value={value.quiet_hours.end}
                    onChange={(e) => set({ quiet_hours: { ...value.quiet_hours, end: e.target.value } })}
                    className="h-8" />
                </div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Pedidos confirmados/enviados/entregues ignoram o horário silencioso (são transacionais).
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}