import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GuestInfo {
  name: string;
  phone: string;
  email?: string;
}

interface GuestCustomerFormProps {
  guestInfo: GuestInfo;
  onChange: (info: GuestInfo) => void;
}

export function GuestCustomerForm({ guestInfo, onChange }: GuestCustomerFormProps) {
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <h4 className="font-medium text-sm">Dados do Cliente (WhatsApp)</h4>
      
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="guest-name">Nome *</Label>
          <Input
            id="guest-name"
            placeholder="Nome do cliente"
            value={guestInfo.name}
            onChange={(e) => onChange({ ...guestInfo, name: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="guest-phone">Telefone *</Label>
          <Input
            id="guest-phone"
            placeholder="(11) 99999-9999"
            value={guestInfo.phone}
            onChange={(e) => onChange({ ...guestInfo, phone: formatPhone(e.target.value) })}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="guest-email">Email (opcional)</Label>
        <Input
          id="guest-email"
          type="email"
          placeholder="email@exemplo.com"
          value={guestInfo.email || ''}
          onChange={(e) => onChange({ ...guestInfo, email: e.target.value })}
        />
      </div>
    </div>
  );
}
