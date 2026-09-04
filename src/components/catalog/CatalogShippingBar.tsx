import { useState, useEffect } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCatalogShippingCep } from '@/hooks/useCatalogShippingCep';
import { getAddressFromZip, formatZipCode } from '@/lib/shipping';

export function CatalogShippingBar() {
  const { cep, setCep, clearCep, isValid, cleanCep } = useCatalogShippingCep();
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Resolve city/state for display whenever CEP changes
  useEffect(() => {
    let cancelled = false;
    if (!isValid) {
      setCity('');
      setState('');
      return;
    }
    setLoading(true);
    getAddressFromZip(cleanCep).then((res) => {
      if (cancelled) return;
      if (res) {
        setCity(res.city);
        setState(res.state);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [cleanCep, isValid]);

  const handleSave = () => {
    setCep(input);
    setEditing(false);
    setInput('');
  };

  // Display mode: CEP saved & not editing
  if (isValid && !editing) {
    return (
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            Frete para <span className="font-medium text-foreground">{cep}</span>
            {city && state && (
              <span className="text-muted-foreground"> · {city}, {state}</span>
            )}
            {loading && <Loader2 className="inline h-3 w-3 animate-spin ml-2" />}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setInput(cep); setEditing(true); }}
          className="h-7 px-2 text-xs"
        >
          Trocar CEP
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearCep}
          className="h-7 px-2 text-xs text-muted-foreground"
        >
          <X className="h-3 w-3 mr-1" /> Limpar
        </Button>
      </div>
    );
  }

  // Edit / empty mode
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span>Calcular frete por CEP</span>
      </div>
      <Input
        type="text"
        inputMode="numeric"
        placeholder="00000-000"
        value={input}
        onChange={(e) => setInput(formatZipCode(e.target.value))}
        className="h-9 w-[140px]"
        maxLength={9}
      />
      <Button
        onClick={handleSave}
        disabled={input.replace(/\D/g, '').length !== 8}
        size="sm"
        className="h-9"
      >
        OK
      </Button>
      {editing && (
        <Button
          onClick={() => { setEditing(false); setInput(''); }}
          variant="ghost"
          size="sm"
          className="h-9 text-xs"
        >
          Cancelar
        </Button>
      )}
    </div>
  );
}