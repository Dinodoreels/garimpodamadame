import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, User, Heart, Settings, Store, X, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useUserRole } from '@/hooks/useUserRole';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import { useCMSThemeContext } from '@/providers/CMSThemeProvider';
import { useTheme } from 'next-themes';

const defaultNavigation = [
  { name: 'INÍCIO', href: '/' },
  { name: 'LANÇAMENTOS', href: '/releases' },
  { name: 'CATÁLOGO', href: '/catalog' },
  { name: 'LOTES', href: '/lote' },
  { name: 'SOBRE', href: '/about' },
  { name: 'CONTATO', href: '/contact' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { role, isVendedor } = useUserRole();
    const cmsTheme = useCMSThemeContext();
    const { theme: colorMode, setTheme: setColorMode } = useTheme();
    const toggleColorMode = () => setColorMode(colorMode === 'dark' ? 'light' : 'dark');
 
     // Dynamic navigation from theme texts
     const themeTexts = (cmsTheme as unknown as Record<string, unknown>)?.texts as Record<string, unknown> | undefined;
    const navigation = (themeTexts?.nav_items as Array<{ name: string; href: string }>) || defaultNavigation;
    const logoUrl = cmsTheme?.logo_url || logo;

  // Handle scroll for blur effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <header className={cn(
      "sticky top-0 z-50 border-b border-border/50 transition-all duration-300",
      scrolled ? "bg-background/80 backdrop-blur-md" : "bg-background"
    )}>
      <nav className="container flex items-center justify-between h-16 lg:h-20">
        {/* Mobile menu button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              aria-label="Abrir menu"
              className="hover:bg-transparent min-w-[44px] min-h-[44px]"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] border-r-0">
            <div className="flex flex-col gap-8 mt-12">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "text-sm tracking-luxury font-light transition-all relative",
                    isActive(item.href) 
                      ? "text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                  {isActive(item.href) && (
                    <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-foreground" />
                  )}
                </Link>
              ))}
              <div className="border-t border-border pt-8 mt-4">
                <button
                  onClick={toggleColorMode}
                  aria-label="Alternar modo de cores"
                  className="flex items-center gap-3 py-4 text-sm tracking-wide hover:opacity-60 min-h-[44px] w-full text-left"
                >
                  {colorMode === 'dark' ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}
                  {colorMode === 'dark' ? 'MODO CLARO' : 'MODO ESCURO'}
                </button>
                {user ? (
                  <>
                    <Link 
                      to="/favorites" 
                      className="flex items-center gap-3 py-4 text-sm tracking-wide hover:opacity-60 min-h-[44px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Heart className="h-4 w-4" strokeWidth={1.5} /> FAVORITOS
                    </Link>
                    <Link 
                      to="/account" 
                      className="flex items-center gap-3 py-4 text-sm tracking-wide hover:opacity-60 min-h-[44px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" strokeWidth={1.5} /> MINHA CONTA
                    </Link>
                    {isAdmin ? (
                      <Link 
                        to="/admin" 
                        className="flex items-center gap-3 py-4 text-sm tracking-wide hover:opacity-60 min-h-[44px]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" strokeWidth={1.5} /> PAINEL ADMIN
                      </Link>
                    ) : isVendedor && role === 'vendedor' ? (
                      <Link 
                        to="/seller" 
                        className="flex items-center gap-3 py-4 text-sm tracking-wide hover:opacity-60 min-h-[44px]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Store className="h-4 w-4" strokeWidth={1.5} /> PAINEL VENDEDOR
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <Link 
                    to="/auth" 
                    className="flex items-center gap-3 py-4 text-sm tracking-wide hover:opacity-60 min-h-[44px]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" strokeWidth={1.5} /> ENTRAR
                  </Link>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Brand */}
        <Link to="/" className="flex items-center group">
          <span className="font-display text-lg sm:text-xl font-medium group-hover:opacity-70 transition-opacity whitespace-nowrap lg:hidden">
            Garimpo da Madame
          </span>
          <img
            src={logoUrl}
            alt="Garimpo da Madame"
            className="hidden lg:block h-14 w-auto object-contain group-hover:opacity-70 transition-opacity"
          />
        </Link>

        {/* Desktop navigation */}
        <div className="hidden lg:flex items-center gap-10">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "text-xs tracking-luxury font-light transition-all relative py-2",
                isActive(item.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.name}
              <span className={cn(
                "absolute -bottom-0.5 left-0 h-0.5 bg-foreground transition-all duration-300",
                isActive(item.href) ? "w-full" : "w-0"
              )} />
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Search - hidden on mobile */}
          <div className="hidden sm:flex items-center">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <Input
                  type="search"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-32 sm:w-48 h-9 text-xs border-0 border-b border-foreground/20 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-foreground px-0"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Fechar busca"
                  className="min-w-[44px] min-h-[44px] hover:bg-transparent"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </form>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Abrir busca"
                className="min-w-[44px] min-h-[44px] hover:bg-transparent hover:scale-105 transition-transform"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
          </div>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alternar tema claro/escuro"
            className="min-w-[44px] min-h-[44px] hover:bg-transparent hover:scale-105 transition-transform"
            onClick={toggleColorMode}
          >
            {colorMode === 'dark' ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}
          </Button>

          {/* User actions */}
          <div className="hidden sm:flex items-center">
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  asChild 
                  className="min-w-[44px] min-h-[44px] hover:bg-transparent hover:scale-105 transition-transform"
                >
                  <Link to="/favorites" aria-label="Favoritos">
                    <Heart className="h-4 w-4" strokeWidth={1.5} />
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  asChild 
                  className="min-w-[44px] min-h-[44px] hover:bg-transparent hover:scale-105 transition-transform"
                >
                  <Link to="/account" aria-label="Minha conta">
                    <User className="h-4 w-4" strokeWidth={1.5} />
                  </Link>
                </Button>
                {isAdmin ? (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    asChild 
                    className="min-w-[44px] min-h-[44px] hover:bg-transparent hover:scale-105 transition-transform"
                  >
                    <Link to="/admin" aria-label="Painel admin">
                      <Settings className="h-4 w-4" strokeWidth={1.5} />
                    </Link>
                  </Button>
                ) : isVendedor && role === 'vendedor' ? (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    asChild 
                    className="min-w-[44px] min-h-[44px] hover:bg-transparent hover:scale-105 transition-transform"
                  >
                    <Link to="/seller" aria-label="Painel vendedor">
                      <Store className="h-4 w-4" strokeWidth={1.5} />
                    </Link>
                  </Button>
                ) : null}
              </>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                asChild 
                className="min-w-[44px] min-h-[44px] hover:bg-transparent hover:scale-105 transition-transform"
              >
                <Link to="/auth" aria-label="Entrar">
                  <User className="h-4 w-4" strokeWidth={1.5} />
                </Link>
              </Button>
            )}
          </div>

          {/* Cart */}
          <CartDrawer />
        </div>
      </nav>
    </header>
  );
}
