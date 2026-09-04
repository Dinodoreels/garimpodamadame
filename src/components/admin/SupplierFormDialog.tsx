import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Supplier, useCreateSupplier, useUpdateSupplier } from '@/hooks/useSuppliers';

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
}

function useProfilesSearch(query: string) {
  return useQuery({
    queryKey: ['profiles-search', query],
    queryFn: async () => {
      let q = supabase
        .from('profiles')
        .select('id, full_name, phone')
        .order('full_name', { ascending: true })
        .limit(50);
      if (query.trim()) {
        q = q.ilike('full_name', `%${query.trim()}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Profile[];
    },
    staleTime: 30_000,
  });
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplier?: Supplier | null;
  onSaved?: (id: string) => void;
}

export default function SupplierFormDialog({ open, onOpenChange, supplier, onSaved }: Props) {
  const isEdit = !!supplier;
  const create = useCreateSupplier();
  const update = useUpdateSupplier();

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'own' | 'consignment'>('own');
  const [notes, setNotes] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const { data: profiles = [], isLoading: loadingProfiles } = useProfilesSearch(userSearch);

  // Load selected profile name for display when editing
  const { data: selectedProfile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('id', userId)
        .maybeSingle();
      return data as Profile | null;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (open) {
      setName(supplier?.name ?? '');
      setContactName(supplier?.contact_name ?? '');
      setPhone(supplier?.phone ?? '');
      setEmail(supplier?.email ?? '');
      setType((supplier?.type as 'own' | 'consignment') ?? 'own');
      setNotes(supplier?.notes ?? '');
      setUserId(supplier?.user_id ?? null);
      setUserSearch('');
    }
  }, [open, supplier]);

  const selectedLabel = useMemo(() => {
    if (!userId) return '';
    const fromList = profiles.find(p => p.id === userId);
    const p = fromList || selectedProfile;
    return p?.full_name || p?.id.slice(0, 8) || '';
  }, [userId, profiles, selectedProfile]);

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      contact_name: contactName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      type,
      notes: notes.trim() || null,
      user_id: userId,
    };
    try {
      if (isEdit && supplier) {
        await update.mutateAsync({ id: supplier.id, ...payload });
        onSaved?.(supplier.id);
      } else {
        const created = await create.mutateAsync(payload);
        onSaved?.((created as any)?.id);
      }
      onOpenChange(false);
    } catch (e) {
      // toast handled in hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-light">
            {isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-light">Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do fornecedor" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-light">Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'own' | 'consignment')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Próprio</SelectItem>
                  <SelectItem value="consignment">Consignado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-light">Contato</Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nome de contato" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-light">Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-light">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-light">Usuário vinculado</Label>
            <p className="text-xs text-muted-foreground font-light">
              Vincule um cliente já cadastrado. Ele receberá automaticamente acesso à área de Consignador.
            </p>
            <div className="flex gap-2">
              <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      'flex-1 justify-between font-light',
                      !userId && 'text-muted-foreground'
                    )}
                  >
                    {userId ? selectedLabel || 'Usuário selecionado' : 'Selecionar usuário...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar por nome..."
                      value={userSearch}
                      onValueChange={setUserSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {loadingProfiles ? 'Buscando...' : 'Nenhum cliente encontrado.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {profiles.map(p => (
                          <CommandItem
                            key={p.id}
                            value={p.id}
                            onSelect={() => {
                              setUserId(p.id);
                              setUserPickerOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', userId === p.id ? 'opacity-100' : 'opacity-0')} />
                            <div className="flex flex-col">
                              <span className="font-light">{p.full_name || '(sem nome)'}</span>
                              {p.phone && <span className="text-xs text-muted-foreground">{p.phone}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {userId && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setUserId(null)}
                  title="Desvincular"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-light">Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-light">Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || create.isPending || update.isPending}
            className="bg-gold text-gold-foreground hover:bg-gold/90 font-light"
          >
            {create.isPending || update.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}