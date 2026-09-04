import { useState, useEffect } from 'react';
import { Search, User, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  email?: string;
}

interface CustomerSelectProps {
  customerType: 'registered' | 'guest';
  onCustomerTypeChange: (type: 'registered' | 'guest') => void;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onSearch: (query: string) => Promise<Customer[]>;
  searching: boolean;
}

export function CustomerSelect({
  customerType,
  onCustomerTypeChange,
  selectedCustomer,
  onSelectCustomer,
  onSearch,
  searching,
}: CustomerSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (searchQuery.length >= 2) {
        const customers = await onSearch(searchQuery);
        setResults(customers);
        setShowResults(true);
      } else {
        setResults([]);
        setShowResults(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, onSearch]);

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setSearchQuery(customer.full_name || customer.phone || '');
    setShowResults(false);
  };

  return (
    <div className="space-y-4">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        Tipo de Cliente
      </Label>
      
      <RadioGroup
        value={customerType}
        onValueChange={(value) => onCustomerTypeChange(value as 'registered' | 'guest')}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="registered" id="registered" />
          <Label htmlFor="registered" className="font-normal cursor-pointer">
            Cliente Cadastrado
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="guest" id="guest" />
          <Label htmlFor="guest" className="font-normal cursor-pointer">
            Cliente WhatsApp
          </Label>
        </div>
      </RadioGroup>

      {customerType === 'registered' && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (selectedCustomer) onSelectCustomer(null);
              }}
              className="pl-10"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Results dropdown */}
          {showResults && results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
              {results.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-muted flex items-center gap-3 transition-colors",
                    selectedCustomer?.id === customer.id && "bg-muted"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {customer.full_name || 'Sem nome'}
                    </p>
                    {customer.phone && (
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && results.length === 0 && searchQuery.length >= 2 && !searching && (
            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg p-4 text-center text-muted-foreground">
              Nenhum cliente encontrado
            </div>
          )}

          {/* Selected customer display */}
          {selectedCustomer && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{selectedCustomer.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
