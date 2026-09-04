import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, ShoppingBag, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export function MobileActionsFAB() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <Plus className={cn("h-6 w-6 transition-transform duration-200", open && "rotate-45")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 mb-2">
        <DropdownMenuItem asChild>
          <Link to="/admin/products?new=true" className="flex items-center">
            <Package className="h-4 w-4 mr-2" /> Novo Produto
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/admin/orders/new" className="flex items-center">
            <ShoppingBag className="h-4 w-4 mr-2" /> Novo Pedido
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/admin/promotions" className="flex items-center">
            <Ticket className="h-4 w-4 mr-2" /> Novo Cupom
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}