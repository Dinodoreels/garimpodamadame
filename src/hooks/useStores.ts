import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface Store {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  zip_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface StoreEmployee {
  id: string;
  store_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
  profile?: { full_name: string | null; email?: string };
}

export interface StoreInventoryItem {
  id: string;
  store_id: string;
  product_id: string;
  quantity: number;
  updated_at: string | null;
  product?: { title: string; price: number };
}

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Store[];
    },
  });
}

export function useCreateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (store: Omit<Store, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('stores').insert(store).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stores'] }); toast.success('Loja criada com sucesso'); },
    onError: () => toast.error('Erro ao criar loja'),
  });
}

export function useUpdateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...store }: Partial<Store> & { id: string }) => {
      const { error } = await supabase.from('stores').update(store).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stores'] }); toast.success('Loja atualizada'); },
    onError: () => toast.error('Erro ao atualizar loja'),
  });
}

export function useDeleteStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stores'] }); toast.success('Loja removida'); },
    onError: () => toast.error('Erro ao remover loja'),
  });
}

export function useStoreEmployees(storeId: string | null) {
  return useQuery({
    queryKey: ['store-employees', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_employees')
        .select('*, profiles:user_id(full_name)')
        .eq('store_id', storeId!);
      if (error) throw error;
      return (data || []).map((e: any) => ({
        ...e,
        profile: e.profiles,
      })) as StoreEmployee[];
    },
  });
}

export function useAddEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (emp: { store_id: string; user_id: string; role: string }) => {
      const { error } = await supabase.from('store_employees').insert(emp);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-employees'] }); toast.success('Funcionário adicionado'); },
    onError: (e: any) => toast.error(e.message?.includes('duplicate') ? 'Funcionário já vinculado a esta loja' : 'Erro ao adicionar funcionário'),
  });
}

export function useRemoveEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('store_employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-employees'] }); toast.success('Funcionário removido'); },
    onError: () => toast.error('Erro ao remover funcionário'),
  });
}

export function useStoreInventory(storeId: string | null) {
  return useQuery({
    queryKey: ['store-inventory', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_inventory')
        .select('*, products:product_id(title, price)')
        .eq('store_id', storeId!);
      if (error) throw error;
      return (data || []).map((i: any) => ({
        ...i,
        product: i.products,
      })) as StoreInventoryItem[];
    },
  });
}

export function useUpsertInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { store_id: string; product_id: string; quantity: number }) => {
      const { error } = await supabase
        .from('store_inventory')
        .upsert(item, { onConflict: 'store_id,product_id' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-inventory'] }); },
    onError: () => toast.error('Erro ao atualizar estoque'),
  });
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name').order('full_name');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ['all-products-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('id, title, price').order('title');
      if (error) throw error;
      return data || [];
    },
  });
}

export type StoreRole = 'gerente' | 'vendedor' | 'vendedor_externo' | null;

export interface MyStoreInfo {
  storeId: string;
  storeName: string;
  role: StoreRole;
}

export function useMyStoreRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-store-role', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_employees')
        .select('store_id, role, stores:store_id(id, name)')
        .eq('user_id', user!.id)
        .eq('is_active', true);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      // Pick highest priority role if multiple
      const rolePriority: Record<string, number> = { gerente: 3, vendedor: 2, vendedor_externo: 1 };
      const sorted = [...data].sort((a, b) => (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0));
      const best = sorted[0] as any;
      return {
        storeId: best.store_id,
        storeName: best.stores?.name || '',
        role: best.role as StoreRole,
      } as MyStoreInfo;
    },
  });
}

export function useMyStores() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-stores', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_employees')
        .select('store_id, stores:store_id(id, name, street, number, neighborhood, city, state, zip_code)')
        .eq('user_id', user!.id)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []).map((e: any) => e.stores).filter(Boolean) as Store[];
    },
  });
}

export function useActiveStores() {
  return useQuery({
    queryKey: ['active-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, street, number, neighborhood, city, state, zip_code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as Store[];
    },
  });
}

export function useStoreStats() {
  return useQuery({
    queryKey: ['store-stats'],
    queryFn: async () => {
      const { data: employees } = await supabase.from('store_employees').select('store_id').eq('is_active', true);
      const { data: inventory } = await supabase.from('store_inventory').select('store_id');
      
      const empCount: Record<string, number> = {};
      const invCount: Record<string, number> = {};
      
      (employees || []).forEach((e: any) => { empCount[e.store_id] = (empCount[e.store_id] || 0) + 1; });
      (inventory || []).forEach((i: any) => { invCount[i.store_id] = (invCount[i.store_id] || 0) + 1; });
      
      return { empCount, invCount };
    },
  });
}
