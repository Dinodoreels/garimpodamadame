import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      }
    });

    // Also check if already in a recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem');
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      toast.error('Erro ao atualizar senha', { description: updateError.message });
      return;
    }

    setSuccess(true);
    toast.success('Senha atualizada com sucesso!');
    
    // Sign out so user logs in with new password
    await supabase.auth.signOut();
    setTimeout(() => navigate('/auth'), 2000);
  };

  const HeroSection = () => (
    <div className="hidden lg:flex lg:w-1/2 bg-[#5a5a5a] items-center justify-center p-12">
      <div className="text-center">
        <h1 className="font-display text-4xl xl:text-5xl font-bold text-white tracking-wider mb-4">
          PRÍNCIPE IMPORTS
        </h1>
        <p className="text-gray-300 text-lg xl:text-xl font-light tracking-wide">
          Exclusividade que se veste
        </p>
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen flex">
        <HeroSection />
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 lg:p-12">
          <div className="w-full max-w-md">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <CardTitle className="font-display text-2xl text-gray-900">Senha atualizada!</CardTitle>
                <CardDescription className="text-gray-500 mt-2">
                  Sua senha foi alterada com sucesso. Redirecionando para o login...
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex">
        <HeroSection />
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 lg:p-12">
          <div className="w-full max-w-md">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="text-center pb-2">
                <CardTitle className="font-display text-2xl text-gray-900">Recuperar Senha</CardTitle>
                <CardDescription className="text-gray-500 mt-2">
                  Verificando link de recuperação...
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </CardContent>
            </Card>
            <p className="mt-6 text-center text-sm text-gray-500">
              <Link to="/auth" className="hover:text-gray-900 transition-colors">
                ← Voltar ao login
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <HeroSection />
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-gray-900 tracking-wider">
              PRÍNCIPE IMPORTS
            </h1>
            <p className="text-gray-500 text-sm mt-1">Exclusividade que se veste</p>
          </div>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="font-display text-2xl text-gray-900">Nova Senha</CardTitle>
              <CardDescription className="text-gray-500">
                Digite sua nova senha abaixo
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-gray-50 border-gray-200 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-gray-50 border-gray-200 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-gray-800 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Atualizar Senha
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link to="/auth" className="hover:text-gray-900 transition-colors">
              ← Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
