import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Banner {
  id: string;
  image_url: string;
  title: string;
  subtitle: string | null;
  button_text: string;
  button_link: string;
  overlay_opacity: number;
  is_active: boolean;
  show_button: boolean;
  show_title: boolean;
  show_subtitle: boolean;
  show_overlay: boolean;
  click_url: string | null;
  position: number;
  media_type: string;
  video_url: string | null;
  mobile_image_url: string | null;
  desktop_object_position: string;
  mobile_object_position: string;
  created_at: string;
  updated_at: string;
}

export type BannerInsert = Omit<Banner, 'id' | 'created_at' | 'updated_at'>;
export type BannerUpdate = Partial<BannerInsert>;

// Hook para listar todos os banners (admin)
export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as Banner[];
    },
  });
}

// Hook para listar banners ativos (público)
export function useActiveBanners() {
  return useQuery({
    queryKey: ['banners', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as Banner[];
    },
  });
}

// Hook para criar banner
export function useCreateBanner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (banner: BannerInsert) => {
      const { data, error } = await supabase
        .from('banners')
        .insert(banner)
        .select()
        .single();
      
      if (error) throw error;
      return data as Banner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar banner:', error);
      toast.error('Erro ao criar banner');
    },
  });
}

// Hook para atualizar banner
export function useUpdateBanner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & BannerUpdate) => {
      const { data, error } = await supabase
        .from('banners')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Banner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner atualizado!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar banner:', error);
      toast.error('Erro ao atualizar banner');
    },
  });
}

// Hook para deletar banner
export function useDeleteBanner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner excluído!');
    },
    onError: (error) => {
      console.error('Erro ao excluir banner:', error);
      toast.error('Erro ao excluir banner');
    },
  });
}

// Hook para reordenar banners
export function useReorderBanners() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('banners')
          .update({ position: index })
          .eq('id', id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (error) => {
      console.error('Erro ao reordenar banners:', error);
      toast.error('Erro ao reordenar banners');
    },
  });
}

// Hook para upload de imagem
export function useUploadBannerImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);
      
      return publicUrl;
    },
    onError: (error) => {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    },
  });
}

// Hook para upload de vídeo
export function useUploadBannerVideo() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `videos/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);
      
      return publicUrl;
    },
    onError: (error) => {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload do vídeo');
    },
  });
}
