import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useSiteContent } from '@/hooks/useSiteContent';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Você deve aceitar os termos para continuar' })
  })
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword']
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReset = searchParams.get('reset') === 'true';
  
  const { signIn, signUp, resetPassword, loading, signInWithGoogle } = useAuth();
  const { data: authConfig } = useSiteContent<{
    hero_bg_image: string;
    hero_bg_color: string;
    store_name: string;
    slogan: string;
    text_color: string;
  }>('auth_page_config');

  const storeName = authConfig?.store_name || 'VANGUARD STORE';
  const slogan = authConfig?.slogan || 'Exclusividade que se veste';
  const bgColor = authConfig?.hero_bg_color || '#5a5a5a';
  const bgImage = authConfig?.hero_bg_image || '';
  const textColor = authConfig?.text_color || '#ffffff';
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetForm, setShowResetForm] = useState(isReset);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  const [resetEmail, setResetEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      loginSchema.parse(loginData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) newErrors[err.path[0].toString()] = err.message;
        });
        setErrors(newErrors);
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await signIn(loginData.email, loginData.password);
      setIsSubmitting(false);
      
      if (error) {
        const msg = error.message || '';
        if (msg.includes('Email not confirmed')) {
          toast.error('Email não confirmado', {
            description: 'Verifique sua caixa de entrada e clique no link de confirmação enviado.'
          });
        } else if (msg.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else if (msg.includes('Database') || msg.includes('schema') || msg.includes('fetch')) {
          toast.error('Serviço temporariamente indisponível', {
            description: 'Tente novamente em alguns instantes.'
          });
        } else {
          toast.error('Erro ao fazer login', { description: msg });
        }
        return;
      }
    } catch (err) {
      setIsSubmitting(false);
      toast.error('Serviço temporariamente indisponível', {
        description: 'Tente novamente em alguns instantes.'
      });
      return;
    }
    
    toast.success('Login realizado com sucesso!');
    navigate('/');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      signupSchema.parse(signupData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) newErrors[err.path[0].toString()] = err.message;
        });
        setErrors(newErrors);
        return;
      }
    }
    
    setIsSubmitting(true);
    const { error } = await signUp(signupData.email, signupData.password, {
      full_name: signupData.fullName,
      phone: signupData.phone
    });
    setIsSubmitting(false);
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao criar conta', { description: error.message });
      }
      return;
    }
    
    toast.success('Conta criada!', {
      description: 'Bem-vinda! Sua conta já está ativa.'
    });
    navigate('/');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      setErrors({ resetEmail: 'Digite seu email' });
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await resetPassword(resetEmail);
    setIsSubmitting(false);
    
    if (error) {
      toast.error('Erro ao enviar email', { description: error.message });
      return;
    }
    
    toast.success('Email enviado!', {
      description: 'Verifique sua caixa de entrada para redefinir sua senha.'
    });
    setShowResetForm(false);
  };

  // Hero Section Component
  const HeroSection = () => (
    <div
      className="hidden lg:flex lg:w-1/2 items-center justify-center p-12"
      style={{
        backgroundColor: bgColor,
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="text-center">
        <h1
          className="font-display text-4xl xl:text-5xl font-bold tracking-wider mb-4"
          style={{ color: textColor }}
        >
          {storeName}
        </h1>
        <p
          className="text-lg xl:text-xl font-light tracking-wide opacity-80"
          style={{ color: textColor }}
        >
          {slogan}
        </p>
      </div>
    </div>
  );

  // Reset Password Form
  if (showResetForm) {
    return (
      <div className="min-h-screen flex">
        <HeroSection />
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 lg:p-12">
          <div className="w-full max-w-md">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="text-center pb-2">
                <CardTitle className="font-display text-2xl text-gray-900">Recuperar Senha</CardTitle>
                <CardDescription className="text-gray-500">
                  Digite seu email para receber o link de recuperação
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="text-gray-700">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="resetEmail"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                      />
                    </div>
                    {errors.resetEmail && (
                      <p className="text-red-500 text-sm">{errors.resetEmail}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-black hover:bg-gray-800 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar Email
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-gray-600 hover:text-gray-900"
                    onClick={() => setShowResetForm(false)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar ao Login
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <p className="mt-6 text-center text-sm text-gray-500">
              <Link to="/" className="hover:text-gray-900 transition-colors">
                ← Voltar para a loja
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex">
      {/* Left Hero Section */}
      <HeroSection />

      {/* Right Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Brand - only visible on mobile */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-gray-900 tracking-wider">
              {storeName}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{slogan}</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger 
                value="login" 
                className="rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600"
              >
                Criar Conta
              </TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="login">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-xl text-gray-900">Acesse sua conta</CardTitle>
                  <CardDescription className="text-gray-500">
                    Entre com seu email e senha para continuar
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="loginEmail" className="text-gray-700">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="loginEmail"
                          type="email"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          placeholder="seu@email.com"
                          className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                        />
                      </div>
                      {errors.email && (
                        <p className="text-red-500 text-sm">{errors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="loginPassword" className="text-gray-700">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="loginPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
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
                      {errors.password && (
                        <p className="text-red-500 text-sm">{errors.password}</p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-black hover:bg-gray-800 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Entrar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>

                  <button
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-400">ou</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-gray-200 hover:bg-gray-50"
                    disabled={googleLoading}
                    onClick={async () => {
                      setGoogleLoading(true);
                      const { error } = await signInWithGoogle();
                      setGoogleLoading(false);
                      if (error) {
                        toast.error('Erro ao entrar com Google', { description: error.message });
                      }
                    }}
                  >
                    {googleLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    Entrar com Google
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Signup Tab */}
            <TabsContent value="signup">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-xl text-gray-900">Criar conta</CardTitle>
                  <CardDescription className="text-gray-500">
                    Preencha seus dados para começar
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-gray-700">Nome Completo</Label>
                      <Input
                        id="fullName"
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                        placeholder="Seu nome completo"
                        className="bg-gray-50 border-gray-200 focus:bg-white"
                      />
                      {errors.fullName && (
                        <p className="text-red-500 text-sm">{errors.fullName}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-700">Telefone (opcional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={signupData.phone}
                        onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                        placeholder="(11) 99999-9999"
                        className="bg-gray-50 border-gray-200 focus:bg-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signupEmail" className="text-gray-700">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="signupEmail"
                          type="email"
                          value={signupData.email}
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          placeholder="seu@email.com"
                          className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                        />
                      </div>
                      {errors.email && (
                        <p className="text-red-500 text-sm">{errors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signupPassword" className="text-gray-700">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="signupPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
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
                      {errors.password && (
                        <p className="text-red-500 text-sm">{errors.password}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700">Confirmar Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={signupData.confirmPassword}
                          onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                          placeholder="••••••••"
                          className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
                      )}
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="acceptTerms"
                        checked={signupData.acceptTerms}
                        onCheckedChange={(checked) => 
                          setSignupData({ ...signupData, acceptTerms: checked === true })
                        }
                        className="mt-0.5"
                      />
                      <label htmlFor="acceptTerms" className="text-sm text-gray-600 leading-tight cursor-pointer">
                        Li e aceito os{' '}
                        <Link 
                          to="/termos" 
                          target="_blank" 
                          className="text-gray-900 underline hover:text-gray-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Termos de Uso
                        </Link>{' '}
                        e a{' '}
                        <Link 
                          to="/privacidade" 
                          target="_blank" 
                          className="text-gray-900 underline hover:text-gray-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Política de Privacidade
                        </Link>
                      </label>
                    </div>
                    {errors.acceptTerms && (
                      <p className="text-red-500 text-sm">{errors.acceptTerms}</p>
                    )}
                    
                    <Button
                      type="submit" 
                      className="w-full bg-black hover:bg-gray-800 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar Conta
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-400">ou</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-gray-200 hover:bg-gray-50"
                    disabled={googleLoading}
                    onClick={async () => {
                      setGoogleLoading(true);
                      const { error } = await signInWithGoogle();
                      setGoogleLoading(false);
                      if (error) {
                        toast.error('Erro ao entrar com Google', { description: error.message });
                      }
                    }}
                  >
                    {googleLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    Entrar com Google
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <p className="mt-6 text-center text-sm text-gray-500">
            <Link to="/" className="hover:text-gray-900 transition-colors">
              ← Voltar para a loja
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
