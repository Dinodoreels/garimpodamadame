import { useState } from 'react';
import { Package, ExternalLink, Save, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const CARRIERS = [
  { id: 'correios', name: 'Correios', baseUrl: 'https://www.linkcorreios.com.br/?id=' },
  { id: 'jadlog', name: 'Jadlog', baseUrl: 'https://www.jadlog.com.br/tracking?cte=' },
  { id: 'loggi', name: 'Loggi', baseUrl: 'https://www.loggi.com/rastreio/' },
  { id: 'azul', name: 'Azul Cargo', baseUrl: 'https://www.azulcargoexpress.com.br/rastrear/' },
  { id: 'custom', name: 'Outro (URL personalizada)', baseUrl: '' },
];

interface TrackingFormProps {
  orderId: string;
  currentTrackingCode?: string | null;
  currentTrackingUrl?: string | null;
  currentNotes?: string | null;
  onSave: (data: {
    tracking_code: string;
    tracking_url: string;
    admin_notes?: string;
    status?: string;
  }) => Promise<void>;
  onNotifyCustomer?: () => Promise<void>;
  canPost?: boolean;
}

export function TrackingForm({
  orderId,
  currentTrackingCode,
  currentTrackingUrl,
  currentNotes,
  onSave,
  onNotifyCustomer,
  canPost = false,
}: TrackingFormProps) {
  const [carrier, setCarrier] = useState('correios');
  const [trackingCode, setTrackingCode] = useState(currentTrackingCode || '');
  const [customUrl, setCustomUrl] = useState(currentTrackingUrl || '');
  const [notes, setNotes] = useState(currentNotes || '');
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const selectedCarrier = CARRIERS.find(c => c.id === carrier);
  const trackingUrl = carrier === 'custom' 
    ? customUrl 
    : trackingCode 
      ? `${selectedCarrier?.baseUrl}${trackingCode}`
      : '';

  const handleSave = async () => {
    if (!canPost) {
      toast.error('Conclua a separação e a conferência antes de postar.');
      return;
    }
    if (!trackingCode.trim()) {
      toast.error('Digite o código de rastreio');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        tracking_code: trackingCode,
        tracking_url: trackingUrl,
        admin_notes: notes || undefined,
        status: 'shipped',
      });
      toast.success('Rastreio salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar rastreio');
    } finally {
      setSaving(false);
    }
  };

  const handleNotify = async () => {
    if (!onNotifyCustomer) return;
    
    setNotifying(true);
    try {
      await onNotifyCustomer();
      toast.success('Cliente notificado!');
    } catch (error) {
      toast.error('Erro ao notificar cliente');
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Package className="h-4 w-4" />
        Informações de Rastreio
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Transportadora</Label>
          <Select value={carrier} onValueChange={setCarrier}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARRIERS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Código de Rastreio</Label>
          <Input
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
            placeholder="Ex: AA123456789BR"
          />
        </div>

        {carrier === 'custom' && (
          <div className="grid gap-2">
            <Label>URL de Rastreamento</Label>
            <Input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}

        {trackingUrl && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Link de rastreamento:</p>
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              {trackingUrl.slice(0, 50)}...
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        <div className="grid gap-2">
          <Label>Notas Internas (opcional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações internas sobre o envio..."
            rows={2}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !canPost} className="flex-1">
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {canPost ? 'Confirmar postagem' : 'Conclua a separação primeiro'}
          </Button>
          
          {onNotifyCustomer && currentTrackingCode && (
            <Button 
              variant="outline" 
              onClick={handleNotify}
              disabled={notifying}
            >
              {notifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
