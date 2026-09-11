import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, KeyRound, Trash2, UserPlus } from 'lucide-react';
import { operatorService } from '@/services/inbound/scanService';
import { workflowService } from '@/services/inbound/workflowService';
import { useAdmin } from '@/hooks/useAdmin';

const ROLES: Record<string, string> = {
  inbound: 'Recebimento e Scan',
  qc: 'Qualidade (QC)',
  estoque: 'Estoque e endereçamento',
  commerce: 'Comercial',
  gestor_cd: 'Gestor do CD',
};

const PERMISSIONS = [
  { role: 'Recebimento (Inbound)', can: 'Cadastra carreta, lote e bipa peças no Garimpo Scan.' },
  { role: 'Qualidade (QC)', can: 'Aprova ou reprova a condição das peças e resolve pendências.' },
  { role: 'Estoque', can: 'Endereça, movimenta e imprime etiquetas.' },
  { role: 'Comercial', can: 'Define preço e libera a peça para os canais de venda.' },
  { role: 'Gestor do CD / Administrador', can: 'Faz tudo acima e gerencia a equipe do galpão.' },
];

export default function InboundTeam() {
  const qc = useQueryClient();
  const { isAdmin } = useAdmin();
  const [form, setForm] = useState({ code: '', name: '', pin: '', role: 'inbound' });
  const [pinEdit, setPinEdit] = useState<Record<string, string>>({});

  const { data: operators = [], isLoading } = useQuery({
    queryKey: ['inbound', 'operators'],
    queryFn: operatorService.list,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['inbound', 'real-users'], queryFn: workflowService.users, enabled: isAdmin,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['inbound', 'operators'] });

  const create = useMutation({
    mutationFn: () => operatorService.create(form),
    onSuccess: () => { refresh(); setForm({ code: '', name: '', pin: '', role: 'inbound' }); toast.success('Operador criado'); },
    onError: (e: Error) => toast.error('Não foi possível criar', { description: e.message }),
  });

  const update = useMutation({
    mutationFn: (input: Parameters<typeof operatorService.update>[0]) => operatorService.update(input),
    onSuccess: () => { refresh(); toast.success('Operador atualizado'); },
    onError: (e: Error) => toast.error('Não foi possível salvar', { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => operatorService.remove(id),
    onSuccess: () => { refresh(); toast.success('Operador removido'); },
    onError: (e: Error) => toast.error('Não foi possível remover', { description: e.message }),
  });
  const assignRole = useMutation({
    mutationFn: ({ user_id, role }: { user_id: string; role: string }) => workflowService.assignRole(user_id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inbound', 'real-users'] }); toast.success('Perfil atualizado'); },
    onError: (e: Error) => toast.error('Não foi possível atribuir', { description: e.message }),
  });

  const galpaoUrl = `${window.location.origin}/galpao`;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Equipe do galpão" subtitle="Quem entra pelo tablet e o que cada perfil pode fazer" />

      <Card>
        <CardHeader><CardTitle className="text-base">Quem pode o quê</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {PERMISSIONS.map(p => (
            <div key={p.role} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <span className="font-medium min-w-[16rem]">{p.role}</span>
              <span className="text-sm text-muted-foreground">{p.can}</span>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">Endereço do tablet:</span>
            <code className="rounded bg-muted px-2 py-1 text-sm">{galpaoUrl}</code>
            <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(galpaoUrl); toast.success('Endereço copiado'); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {isAdmin && <Card>
        <CardHeader><CardTitle className="text-base">Usuários reais do painel</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Atribua cada conta existente à função real da operação. Uma conta exerce uma função operacional por vez.</p>
          {users.map(user => <div key={user.id} className="grid gap-2 border-b py-3 last:border-0 sm:grid-cols-[1fr_15rem] sm:items-center">
            <div><p className="font-medium">{user.full_name || user.email || 'Usuário'}</p>{user.full_name && <p className="text-xs text-muted-foreground">{user.email}</p>}</div>
            <Select value={user.role} onValueChange={role => assignRole.mutate({ user_id: user.id, role })} disabled={user.role === 'admin' || assignRole.isPending}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="user">Cliente</SelectItem><SelectItem value="inbound">Inbound — cadastra</SelectItem><SelectItem value="qc">QC — aprova</SelectItem><SelectItem value="estoque">Estoque — endereça</SelectItem><SelectItem value="commerce">Comercial — libera</SelectItem><SelectItem value="gestor_cd">Gestor do CD</SelectItem></SelectContent>
            </Select>
          </div>)}
        </CardContent>
      </Card>}

      <Card>
        <CardHeader><CardTitle className="text-base">Novo operador</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div className="space-y-2">
            <Label>Código</Label>
            <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="OP01" />
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>PIN (4 a 6 números)</Label>
            <Input inputMode="numeric" maxLength={6} value={form.pin}
              onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))} />
          </div>
          <div className="space-y-2">
            <Label>Função</Label>
            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={create.isPending || !form.code || !form.name || form.pin.length < 4}
            onClick={() => create.mutate()}
          >
            <UserPlus className="mr-2 h-4 w-4" /> Criar
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{[0, 1].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : operators.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum operador cadastrado ainda.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {operators.map(op => (
            <Card key={op.id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{op.name}</p>
                    <p className="text-sm text-muted-foreground">{op.code} · {ROLES[op.role] ?? op.role}</p>
                  </div>
                  <Badge variant={op.is_active ? 'secondary' : 'outline'}>{op.is_active ? 'Ativo' : 'Inativo'}</Badge>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor={`a-${op.id}`} className="text-sm font-normal">Pode entrar no tablet</Label>
                  <Switch
                    id={`a-${op.id}`}
                    checked={op.is_active}
                    onCheckedChange={(v) => update.mutate({ id: op.id, is_active: v })}
                  />
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-2 flex-1 min-w-[8rem]">
                    <Label>Novo PIN</Label>
                    <Input inputMode="numeric" maxLength={6} value={pinEdit[op.id] ?? ''}
                      onChange={e => setPinEdit(p => ({ ...p, [op.id]: e.target.value.replace(/\D/g, '') }))} />
                  </div>
                  <Button
                    variant="outline"
                    disabled={(pinEdit[op.id] ?? '').length < 4 || update.isPending}
                    onClick={() => {
                      update.mutate({ id: op.id, pin: pinEdit[op.id] });
                      setPinEdit(p => ({ ...p, [op.id]: '' }));
                    }}
                  >
                    <KeyRound className="mr-2 h-4 w-4" /> Trocar
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive"
                    onClick={() => remove.mutate(op.id)} disabled={remove.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
