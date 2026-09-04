import { useState } from 'react';
import { Loader2, Eye, EyeOff, Mail, KeyRound, AlertTriangle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AdminResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string | null;
  targetUserName?: string | null;
  targetUserEmail?: string | null;
}

export function AdminResetPasswordDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
  targetUserEmail,
}: AdminResetPasswordDialogProps) {
  const [mode, setMode] = useState<'send_link' | 'set_password'>('send_link');
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    setTempPassword(null);
    setCopied(false);
    setMode('send_link');
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSendLink = async () => {
    if (!targetUserId) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('admin-reset-user-password', {
        body: { targetUserId, mode: 'send_link' },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      toast.success('Link de redefinição enviado', {
        description: data?.message || `Email enviado para ${targetUserEmail}`,
      });
      handleClose(false);
    } catch (err: any) {
      const msg = err?.message || 'Erro ao enviar link';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!targetUserId) return;
    setError('');

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('admin-reset-user-password', {
        body: { targetUserId, mode: 'set_password', newPassword },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      // Show the temp password for the admin to deliver
      setTempPassword(newPassword);
      toast.success('Senha redefinida com sucesso');
    } catch (err: any) {
      const msg = err?.message || 'Erro ao redefinir senha';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = async () => {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    toast.success('Senha copiada');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Resetar senha</DialogTitle>
          <DialogDescription>
            {targetUserName || targetUserEmail || 'Usuário selecionado'}
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Senha temporária definida. Entregue ao cliente com segurança e oriente-o a alterá-la
                após o login.
              </AlertDescription>
            </Alert>
            <div className="rounded-md border bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground mb-1">Nova senha</p>
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-base font-semibold tracking-wider">
                  {tempPassword}
                </code>
                <Button size="sm" variant="outline" onClick={copyPassword}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Concluir</Button>
            </DialogFooter>
          </div>
        ) : (
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="send_link">
                <Mail className="h-4 w-4 mr-2" />
                Enviar link
              </TabsTrigger>
              <TabsTrigger value="set_password">
                <KeyRound className="h-4 w-4 mr-2" />
                Definir senha
              </TabsTrigger>
            </TabsList>

            <TabsContent value="send_link" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Um email será enviado para{' '}
                <strong className="text-foreground">{targetUserEmail || 'o usuário'}</strong> com um
                link seguro para redefinir a senha. O link expira em 1 hora.
              </p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button onClick={handleSendLink} disabled={loading || !targetUserEmail}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar link
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="set_password" className="space-y-4 mt-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Use apenas em casos urgentes. Entregue a senha ao cliente com segurança.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use uma senha forte com letras, números e símbolos. Senhas comuns ou vazadas são rejeitadas pelo sistema.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <DialogFooter>
                <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button onClick={handleSetPassword} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Redefinir senha
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
