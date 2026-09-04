import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, ShoppingBag, User } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getTotalItems } = useCartStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const totalItems = getTotalItems();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const navItems = [
    { icon: Home, label: 'Início', href: '/' },
    { icon: Search, label: 'Buscar', href: '#search', onClick: () => setSearchOpen(true) },
    { icon: Heart, label: 'Favoritos', href: '/favorites' },
    { icon: ShoppingBag, label: 'Carrinho', href: '#cart' },
    { icon: User, label: 'Conta', href: user ? '/account' : '/auth' },
  ];

  const isActive = (href: string) => {
    if (href.startsWith('#')) return false;
    return location.pathname === href;
  };

  return (
    <>
      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm md:hidden animate-fade-in">
          <div className="container pt-safe-top">
            <form onSubmit={handleSearch} className="pt-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="O que você está procurando?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 text-base border-0 border-b-2 border-foreground/20 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-foreground"
                  autoFocus
                />
              </div>
            </form>
            <button
              onClick={() => setSearchOpen(false)}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/50 md:hidden safe-area-bottom">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            // Special handling for cart - it should open the cart drawer
            if (item.href === '#cart') {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    // Find and click the cart trigger in the header
                    const cartButton = document.querySelector('[data-cart-trigger]') as HTMLButtonElement;
                    cartButton?.click();
                  }}
                  className="flex flex-col items-center justify-center gap-1 relative touch-manipulation min-h-[44px]"
                >
                  <div className="relative">
                    <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    {totalItems > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px] bg-chrome text-white">
                        {totalItems > 9 ? '9+' : totalItems}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </button>
              );
            }
            
            if (item.onClick) {
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex flex-col items-center justify-center gap-1 touch-manipulation min-h-[44px]"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </button>
              );
            }
            
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 touch-manipulation min-h-[44px] transition-colors",
                  active && "text-foreground"
                )}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-colors",
                    active ? "text-foreground" : "text-muted-foreground"
                  )} 
                  strokeWidth={active ? 2 : 1.5} 
                />
                <span className={cn(
                  "text-[10px] transition-colors",
                  active ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
