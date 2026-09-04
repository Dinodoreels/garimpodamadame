import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCreateCustomer } from '@/hooks/useCreateCustomer';
import { toast } from 'sonner';

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const schema = z.object({
  full_name: z.string().trim().min(2, 'Nome obrigatório').max(100),
  email: z.string().trim().email('Email inválido').max(255),
  phone: z.string().trim().min(8, 'Telefone obrigatório').max(20),
  cpf: z.string().trim().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
  birth_date: z.string().optional().or(z.literal('')),
  zip_code: z.string().trim().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos'),
  street: z.string().trim().min(2, 'Rua obrigatória'),
  number: z.string().trim().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().trim().min(2, 'Bairro obrigatório'),
  city: z.string().trim().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'UF obrigatório'),
});

interface NewCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const initialState = {
  full_name: '',
  email: '',
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
};

export function NewCustomerDialog({ open, onOpenChange, onCreated }: NewCustomerDialogProps) {
  const { createCustomer, loading } = useCreateCustomer();
  const [form, setForm] = useState(initialState);
  const [fetchingCep, setFetchingCep] = useState(false);

  const update = (k: keyof typeof initialState, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleCepBlur = async () => {
    const cep = form.zip_code.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch (err) {
      console.warn('CEP lookup failed', err);
    } finally {
      setFetchingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleaned = {
      ...form,
      cpf: form.cpf.replace(/\D/g, ''),
      phone: form.phone.replace(/\s/g, ''),
      zip_code: form.zip_code.replace(/\D/g, ''),
      state: form.state.toUpperCase(),
    };

    const parsed = schema.safeParse(cleaned);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast.error(first.message);
      return;
    }

    const result = await createCustomer({
      profile: {
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        cpf: parsed.data.cpf,
        birth_date: parsed.data.birth_date || null,
      },
      address: {
        zip_code: parsed.data.zip_code,
        street: parsed.data.street,
        number: parsed.data.number,
        complement: parsed.data.complement,
        neighborhood: parsed.data.neighborhood,
        city: parsed.data.city,
        state: parsed.data.state,
      },
    });

    if (result.success) {
      setForm(initialState);
      onOpenChange(false);
      onCreated?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>
            Cadastre um novo cliente. Um email será enviado para que ele defina a própria senha.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal data */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-light">
              Dados Pessoais
            </h3>

            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email * (será o login)</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={form.cpf}
                  onChange={(e) => update('cpf', e.target.value)}
                  placeholder="Apenas números"
                  maxLength={14}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => update('birth_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-light">
              Endereço Principal
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP *</Label>
                <div className="relative">
                  <Input
                    id="zip_code"
                    value={form.zip_code}
                    onChange={(e) => update('zip_code', e.target.value)}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    maxLength={9}
                    required
                  />
                  {fetchingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="street">Rua *</Label>
                <Input
                  id="street"
                  value={form.street}
                  onChange={(e) => update('street', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number">Número *</Label>
                <Input
                  id="number"
                  value={form.number}
                  onChange={(e) => update('number', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={form.complement}
                  onChange={(e) => update('complement', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro *</Label>
              <Input
                id="neighborhood"
                value={form.neighborhood}
                onChange={(e) => update('neighborhood', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">UF *</Label>
                <select
                  id="state"
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">--</option>
                  {BR_STATES.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar e enviar convite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}