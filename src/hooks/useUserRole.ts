import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'vendedor' | 'consignador' | 'user';

const ROLE_PRIORITY: Record<string, number> = { admin: 4, vendedor: 3, consignador: 2, user: 1 };

function resolveRole(roles: { role: string }[]): UserRole {
  if (!roles.length) return 'user';
  const sorted = roles.sort((a, b) => (ROLE_PRIORITY[b.role] || 0) - (ROLE_PRIORITY[a.role] || 0));
  return (sorted[0].role as UserRole) || 'user';
}

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole('user');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.warn('Non-blocking: Error fetching user role:', error.message);
          setRole('user');
        } else {
          setRole(resolveRole(data || []));
        }
      } catch (err) {
        console.warn('Non-blocking: Error fetching user role');
        setRole('user');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchRole();
    }
  }, [user, authLoading]);

  return {
    role,
    isAdmin: role === 'admin',
    isVendedor: role === 'vendedor' || role === 'admin',
    isConsignador: role === 'consignador',
    loading: loading || authLoading
  };
}
