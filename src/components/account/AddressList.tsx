import { useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Address, useAddresses } from '@/hooks/useAddresses';
import { AddressDialog } from './AddressDialog';

export function AddressList() {
  const { addresses, loading, deleteAddress, setDefaultAddress } = useAddresses();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    const { error } = await deleteAddress(deletingId);
    if (error) {
      toast.error('Erro ao excluir endereço');
    } else {
      toast.success('Endereço excluído');
    }
    setDeletingId(null);
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefault(id);
    const { error } = await setDefaultAddress(id);
    if (error) {
      toast.error('Erro ao definir endereço padrão');
    } else {
      toast.success('Endereço padrão atualizado');
    }
    setSettingDefault(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Endereços de Entrega</h3>
          <Button 
            size="sm"
            onClick={() => {
              setEditingAddress(null);
              setDialogOpen(true);
            }}
            className="bg-gold hover:bg-gold-dark text-gold-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Endereço
          </Button>
        </div>

        {addresses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Você ainda não tem endereços cadastrados
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {addresses.map((address) => (
              <Card key={address.id} className={address.is_default ? 'border-gold' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{address.label}</span>
                        {address.is_default && (
                          <Badge variant="secondary" className="bg-gold/10 text-gold">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Padrão
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {address.recipient_name}
                      </p>
                      <p className="text-sm">
                        {address.street}, {address.number}
                        {address.complement && ` - ${address.complement}`}
                      </p>
                      <p className="text-sm">
                        {address.neighborhood} - {address.city}/{address.state}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        CEP: {address.zip_code}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {!address.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetDefault(address.id)}
                          disabled={settingDefault === address.id}
                          title="Definir como padrão"
                        >
                          {settingDefault === address.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(address)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingId(address.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        address={editingAddress}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir endereço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O endereço será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
