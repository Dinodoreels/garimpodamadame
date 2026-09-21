import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Address, useAddresses } from '@/hooks/useAddresses';
import { useProfile } from '@/hooks/useProfile';
import { customerAddressSchema } from '@/lib/customerValidation';
import { Link } from 'react-router-dom';

interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: Address | null;
  onSuccess?: () => void;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function AddressDialog({ open, onOpenChange, address, onSuccess }: AddressDialogProps) {
  const { addAddress, updateAddress } = useAddresses();
  const { profile, updateProfile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [noNumber, setNoNumber] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    label: '',
    recipient_name: '',
    phone: '',
    cpf: '',
    birth_date: '',
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    is_default: false
  });

  useEffect(() => {
    if (address) {
      setFormData({
        label: address.label,
        recipient_name: address.recipient_name,
        phone: profile?.phone || '',
        cpf: profile?.cpf || '',
        birth_date: profile?.birth_date || '',
        zip_code: address.zip_code,
        street: address.street,
        number: address.number,
        complement: address.complement || '',
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        is_default: address.is_default
      });
      setNoNumber(address.number === 'S/N');
    } else {
      setFormData({
        label: '',
        recipient_name: profile?.full_name || '',
        phone: profile?.phone || '',
        cpf: profile?.cpf || '',
        birth_date: profile?.birth_date || '',
        zip_code: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        is_default: false
      });
      setNoNumber(false);
    }
    setErrors({});
  }, [address, open, profile]);

  const fetchCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state
        }));
      } else {
        toast.error('CEP não encontrado');
      }
    } catch (error) {
      console.error('Error fetching CEP:', error);
    } finally {
      setFetchingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    const formatted = value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
    setFormData(prev => ({ ...prev, zip_code: formatted }));
    
    if (value.replace(/\D/g, '').length === 8) {
      fetchCep(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = customerAddressSchema.safeParse({ ...formData, number: noNumber ? 'S/N' : formData.number });
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] = issue.message;
      setErrors(nextErrors);
      toast.error('Confira os campos destacados');
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const { phone, cpf, birth_date, ...addressData } = parsed.data;
      const { error: profileError } = await updateProfile({
        full_name: parsed.data.recipient_name,
        phone,
        cpf: cpf.replace(/\D/g, ''),
        birth_date,
      });
      if (profileError) throw profileError;
      if (address) {
        const { error } = await updateAddress(address.id, addressData);
        if (error) throw error;
        toast.success('Endereço atualizado com sucesso');
      } else {
        const { error } = await addAddress(addressData);
        if (error) throw error;
        toast.success('Endereço adicionado com sucesso');
      }
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Erro ao salvar endereço', { description: error instanceof Error ? error.message : undefined });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{address ? 'Editar Endereço' : 'Novo Endereço'}</DialogTitle>
          <DialogDescription>
            {address ? 'Atualize e confira as informações de entrega' : 'Preencha os dados que serão usados na entrega'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-3 border border-primary/20 bg-primary/5 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p>Use o nome, CPF e data de nascimento do cadastro. Essas informações são necessárias para a entrega.</p>
          </div>

          <div className="space-y-2">
            <Label>País/Região</Label>
            <Input value="Brasil" disabled />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="label">Nome do endereço</Label>
              <Input
                id="label"
                placeholder="Casa, Trabalho..."
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="recipient_name">Nome completo</Label>
              <Input
                id="recipient_name"
                placeholder="Nome completo"
                value={formData.recipient_name}
                onChange={(e) => setFormData(prev => ({ ...prev, recipient_name: e.target.value }))}
                aria-invalid={!!errors.recipient_name}
              />
              {errors.recipient_name && <p className="text-xs text-destructive">{errors.recipient_name}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Número de telefone</Label>
            <div className="flex">
              <div className="flex h-10 items-center border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">BR +55</div>
              <Input id="phone" className="rounded-l-none" inputMode="tel" maxLength={15} placeholder="(11) 99999-9999" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} aria-invalid={!!errors.phone} />
            </div>
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP</Label>
              <div className="relative">
                <Input
                  id="zip_code"
                  placeholder="00000-000"
                  value={formData.zip_code}
                  onChange={(e) => handleCepChange(e.target.value)}
                  inputMode="numeric"
                  aria-invalid={!!errors.zip_code}
                />
                {fetchingCep && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {errors.zip_code && <p className="text-xs text-destructive">{errors.zip_code}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <select
                id="state"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                aria-invalid={!!errors.state}
              >
                <option value="">Selecione</option>
                {BRAZILIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">Rua</Label>
            <Input
              id="street"
              placeholder="Nome da rua"
              value={formData.street}
              onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
              aria-invalid={!!errors.street}
            />
            {errors.street && <p className="text-xs text-destructive">{errors.street}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <div className="flex items-center justify-between gap-2"><Label htmlFor="number">Número</Label><label className="flex items-center gap-2 text-xs"><Checkbox checked={noNumber} onCheckedChange={(checked) => { setNoNumber(checked === true); if (checked) setFormData(prev => ({ ...prev, number: '' })); }} />Sem número</label></div>
              <Input
                id="number"
                placeholder="123"
                value={formData.number}
                onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                disabled={noNumber}
                aria-invalid={!!errors.number}
              />
              {errors.number && <p className="text-xs text-destructive">{errors.number}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="complement">Informações adicionais</Label>
              <Input
                id="complement"
                placeholder="Apartamento, bloco, ponto de referência..."
                value={formData.complement}
                onChange={(e) => setFormData(prev => ({ ...prev, complement: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                placeholder="Nome do bairro"
                value={formData.neighborhood}
                onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
              aria-invalid={!!errors.neighborhood}
              />
            {errors.neighborhood && <p className="text-xs text-destructive">{errors.neighborhood}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                placeholder="Nome da cidade"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              aria-invalid={!!errors.city}
              />
            {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
            </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" inputMode="numeric" maxLength={14} placeholder="000.000.000-00" value={formData.cpf} onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))} disabled={Boolean(profile?.cpf)} aria-invalid={!!errors.cpf} />
              {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de nascimento</Label>
              <Input id="birth_date" type="date" value={formData.birth_date} onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))} disabled={Boolean(profile?.birth_date)} aria-invalid={!!errors.birth_date} />
              {errors.birth_date && <p className="text-xs text-destructive">{errors.birth_date}</p>}
            </div>
          </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked === true }))}
            />
            <Label htmlFor="is_default" className="text-sm font-normal">
              Tornar padrão
            </Label>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span>Confira CEP, número e complemento antes de salvar.</span>
            <Link to="/privacidade" target="_blank" className="underline underline-offset-4">Política de Privacidade e Cookies</Link>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-gold hover:bg-gold-dark text-gold-foreground">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {address ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
