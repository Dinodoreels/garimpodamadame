import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserRole = 'admin' | 'vendedor' | 'user';
export type StoreRole = 'gerente' | 'vendedor' | 'vendedor_externo' | 'atendente';

export function useManageUserRole() {
  const [loading, setLoading] = useState(false);

  const updateRole = async (
    customerId: string,
    role: UserRole,
    storeId?: string,
    storeRole?: StoreRole
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user-role', {
        body: { customerId, role, storeId, storeRole },
      });

      if (error) {
        console.error('Error updating role:', error);
        toast.error('Erro ao atualizar nível de acesso');
        return { success: false, error };
      }

      if (data?.error) {
        console.error('Function error:', data.error);
        toast.error(data.error);
        return { success: false, error: data.error };
      }

      const roleLabels: Record<UserRole, string> = {
        admin: 'Administrador',
        vendedor: 'Vendedor',
        user: 'Cliente',
      };

      toast.success(`Nível alterado para ${roleLabels[role]}`);
      return { success: true, data };
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Erro inesperado ao atualizar nível de acesso');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return { updateRole, loading };
}
