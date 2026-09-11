import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [canAccessInbound, setCanAccessInbound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setIsAdmin(false);
        setCanAccessInbound(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'gestor_cd', 'inbound', 'qc', 'estoque', 'commerce', 'viewer']);

        if (error) {
          console.warn('Non-blocking: Error checking admin role:', error.message);
          setIsAdmin(false);
          setCanAccessInbound(false);
        } else {
          const roles = (data ?? []).map(({ role }) => String(role));
          setIsAdmin(roles.includes('admin'));
          setCanAccessInbound(roles.length > 0);
        }
      } catch (error) {
        console.warn('Non-blocking: Error checking admin role');
        setIsAdmin(false);
        setCanAccessInbound(false);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  return { isAdmin, canAccessInbound, loading: loading || authLoading };
}
