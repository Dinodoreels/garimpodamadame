import { Link } from 'react-router-dom';
import { Plus, Package, Tag, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  href: string;
  color?: string;
}

const actions: QuickAction[] = [
  { 
    icon: Plus, 
    label: 'Novo Produto', 
    href: '/admin/products?new=true',
    color: 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
  },
  { 
    icon: Package, 
    label: 'Ver Pedidos', 
    href: '/admin/orders',
    color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
  },
  { 
    icon: Tag, 
    label: 'Criar Cupom', 
    href: '/admin/discounts',
    color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20'
  },
  { 
    icon: Users, 
    label: 'Clientes', 
    href: '/admin/customers',
    color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20'
  },
];

export function QuickActions() {
  return (
    <div className="bg-card border rounded-lg p-3 md:p-4">
      <h3 className="text-[10px] md:text-xs tracking-[0.1em] uppercase text-muted-foreground font-light mb-3">
        Ações Rápidas
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            asChild
            className={cn(
              "h-auto py-3 px-2 flex flex-col items-center gap-1.5 justify-center transition-all",
              action.color
            )}
          >
            <Link to={action.href}>
              <action.icon className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-[10px] md:text-xs font-medium">{action.label}</span>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
