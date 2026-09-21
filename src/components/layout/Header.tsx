import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Cookie, FileText, Heart, Menu, Moon, Search, Settings, ShieldCheck, Store, Sun, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useUserRole } from '@/hooks/useUserRole';
import { useSiteContent } from '@/hooks/useSiteContent';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import { useCMSThemeContext } from '@/providers/CMSThemeProvider';
import { useTheme } from 'next-themes';
import { getStorefrontFallback, mergeStorefrontNavigation, type StorefrontNavigationSettings } from '@/lib/storefrontNavigation';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { role, isVendedor } = useUserRole();
  const cmsTheme = useCMSThemeContext();
  const { theme: colorMode, setTheme: setColorMode } = useTheme();
  const { data: navigationData } = useSiteContent<StorefrontNavigationSettings>('storefront_navigation');
  const settings = mergeStorefrontNavigation(navigationData);
  const navigation = settings.items.filter((item) => item.enabled);
  const homeHref = settings.items.find((item) => item.href === '/')?.enabled ? '/' : getStorefrontFallback(settings);
  const logoUrl = cmsTheme?.logo_url || logo;

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);
  const toggleColorMode = () => setColorMode(colorMode === 'dark' ? 'light' : 'dark');

  return (
    <header className="sticky top-0 z-50 border-b border-storefront-header-border bg-storefront-header text-storefront-header-foreground shadow-lg">
      <nav className="mx-auto grid min-h-20 w-full max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3 px-4 py-3 lg:gap-8 lg:px-8">
        <div className="flex items-center gap-2 lg:gap-5">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu" className="min-h-11 min-w-11 text-storefront-header-foreground hover:bg-storefront-header-foreground/10 hover:text-storefront-header-foreground">
                <Menu className="h-6 w-6" strokeWidth={1.5} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-[88vw] max-w-sm flex-col border-r border-border p-0">
              <div className="border-b border-border px-7 py-6">
                <p className="font-display text-2xl font-medium">Menu</p>
                <p className="mt-1 text-xs text-muted-foreground">O Garimpo Digital</p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-5">
                <form onSubmit={handleSearch} className="relative mb-5 lg:hidden">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="O que você está procurando?" className="h-11 rounded-sm pl-11" />
                </form>
                <div className="space-y-1">
                  {navigation.map((item) => (
                    <Link key={item.href} to={item.href} onClick={closeMenu} className={cn('flex min-h-11 items-center rounded-sm px-4 py-3 text-sm transition-colors', location.pathname === item.href ? 'bg-accent/10 font-medium text-accent' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="my-5 border-t border-border" />
                <div className="space-y-1">
                  <button onClick={toggleColorMode} className="flex min-h-11 w-full items-center gap-3 rounded-sm px-4 py-3 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                    {colorMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {colorMode === 'dark' ? 'Modo claro' : 'Modo escuro'}
                  </button>
                  {user ? (
                    <>
                      <Link to="/favorites" onClick={closeMenu} className="flex min-h-11 items-center gap-3 rounded-sm px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Heart className="h-4 w-4" /> Favoritos</Link>
                      <Link to="/account" onClick={closeMenu} className="flex min-h-11 items-center gap-3 rounded-sm px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><User className="h-4 w-4" /> Minha conta</Link>
                      {isAdmin ? <Link to="/admin" onClick={closeMenu} className="flex min-h-11 items-center gap-3 rounded-sm px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Settings className="h-4 w-4" /> Administração</Link> : isVendedor && role === 'vendedor' ? <Link to="/seller" onClick={closeMenu} className="flex min-h-11 items-center gap-3 rounded-sm px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Store className="h-4 w-4" /> Painel vendedor</Link> : null}
                    </>
                  ) : <Link to="/auth" onClick={closeMenu} className="flex min-h-11 items-center gap-3 rounded-sm px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><User className="h-4 w-4" /> Entrar ou cadastrar</Link>}
                  <Link to="/termos" onClick={closeMenu} className="flex min-h-11 items-center gap-3 rounded-sm px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><FileText className="h-4 w-4" /> Termos de Uso</Link>
                  <Link to="/privacidade" onClick={closeMenu} className="flex min-h-11 items-center gap-3 rounded-sm px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><ShieldCheck className="h-4 w-4" /> Privacidade</Link>
                  <Link to="/cookies" onClick={closeMenu} className="flex min-h-11 items-center gap-3 rounded-sm px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Cookie className="h-4 w-4" /> Cookies</Link>
                </div>
              </div>
              <div className="border-t border-border bg-muted/50 px-8 py-5 text-xs text-muted-foreground">Compra segura e atendimento nacional</div>
            </SheetContent>
          </Sheet>
          <Link to={homeHref} className="flex items-center">
            <img src={logoUrl} alt="O Garimpo Digital" className="h-11 w-auto max-w-[145px] object-contain brightness-0 invert transition-opacity hover:opacity-75 lg:h-14 lg:max-w-[190px]" />
          </Link>
        </div>

        <form onSubmit={handleSearch} className="relative col-span-3 row-start-2 w-full lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:max-w-3xl lg:justify-self-center">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-storefront-search-muted" strokeWidth={1.5} />
          <Input type="search" aria-label="Pesquisar produtos" placeholder="O que você está procurando?" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-12 w-full rounded-full border-storefront-header-border bg-storefront-search pl-12 pr-5 text-sm text-storefront-search-foreground placeholder:text-storefront-search-muted focus-visible:ring-accent" />
        </form>

        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label="Alternar tema" onClick={toggleColorMode} className="hidden min-h-11 min-w-11 text-storefront-header-foreground hover:bg-storefront-header-foreground/10 hover:text-storefront-header-foreground sm:inline-flex">
            {colorMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" asChild className="min-h-11 min-w-11 text-storefront-header-foreground hover:bg-storefront-header-foreground/10 hover:text-storefront-header-foreground">
            <Link to={user ? '/account' : '/auth'} aria-label={user ? 'Minha conta' : 'Entrar'}><User className="h-5 w-5" strokeWidth={1.5} /></Link>
          </Button>
          <CartDrawer />
        </div>
      </nav>
    </header>
  );
}