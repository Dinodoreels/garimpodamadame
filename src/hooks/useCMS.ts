 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 
 // =============================================
 // TYPES
 // =============================================
 
 export interface CMSPage {
   id: string;
   title: string;
   slug: string;
   is_home: boolean;
   is_published: boolean;
   seo_title: string | null;
   seo_description: string | null;
   created_at: string;
   updated_at: string;
   sections?: CMSSection[];
 }
 
 import type { Json } from '@/integrations/supabase/types';
 
 export interface CMSSection {
   id: string;
   page_id: string;
   type: string;
   position: number;
   is_visible: boolean;
   content: Json;
   settings: Json;
   created_at: string;
   updated_at: string;
 }
 
 export interface CMSMedia {
   id: string;
   url: string;
   alt_text: string | null;
   type: string;
   file_name: string;
   file_size: number | null;
   created_at: string;
 }
 
  export interface CMSTheme {
    id: string;
    name: string;
    is_active: boolean;
   colors: {
     primary: string;
     secondary: string;
     accent: string;
     background?: string;
     foreground?: string;
   };
    fonts: {
      headings: string;
      body: string;
    };
    logo_url: string | null;
    logo_dark_url: string | null;
    favicon_url: string | null;
    social: Record<string, string>;
    seo: Record<string, string>;
    texts?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }
 
 export type BlockType = 
   | 'hero' 
   | 'text' 
   | 'image' 
   | 'gallery' 
   | 'cta' 
   | 'features' 
   | 'testimonials' 
   | 'products' 
   | 'benefits' 
   | 'form' 
   | 'video' 
   | 'spacer' 
   | 'divider';
 
 export interface BlockDefinition {
   type: BlockType;
   label: string;
   icon: string;
   defaultContent: Record<string, unknown>;
   defaultSettings: Record<string, unknown>;
 }
 
 // =============================================
 // BLOCK DEFINITIONS
 // =============================================
 
 export const BLOCK_DEFINITIONS: BlockDefinition[] = [
   {
     type: 'hero',
     label: 'Banner Hero',
     icon: 'Image',
     defaultContent: {
       title: 'Título Principal',
       subtitle: 'Subtítulo descritivo',
       button_text: 'Saiba Mais',
       button_link: '/catalog',
       image_url: '',
     },
     defaultSettings: {
       overlay_opacity: 50,
       text_align: 'center',
       height: 'full',
       text_color: '#ffffff',
     },
   },
   {
     type: 'text',
     label: 'Bloco de Texto',
     icon: 'Type',
     defaultContent: {
       title: 'Título da Seção',
       content: 'Adicione seu texto aqui...',
     },
     defaultSettings: {
       align: 'left',
       max_width: 'prose',
     },
   },
   {
     type: 'image',
     label: 'Imagem',
     icon: 'ImageIcon',
     defaultContent: {
       url: '',
       alt_text: '',
       caption: '',
     },
     defaultSettings: {
       width: 'full',
       rounded: true,
     },
   },
   {
     type: 'cta',
     label: 'Chamada para Ação',
     icon: 'MousePointerClick',
     defaultContent: {
       title: 'Pronto para começar?',
       description: 'Entre em contato conosco',
       button_text: 'Fale Conosco',
       button_link: '/contact',
     },
     defaultSettings: {
       bg_color: 'primary',
       text_color: 'white',
     },
   },
   {
     type: 'features',
     label: 'Grid de Recursos',
     icon: 'LayoutGrid',
     defaultContent: {
       items: [
         { icon: 'Star', title: 'Recurso 1', description: 'Descrição do recurso' },
         { icon: 'Heart', title: 'Recurso 2', description: 'Descrição do recurso' },
         { icon: 'Zap', title: 'Recurso 3', description: 'Descrição do recurso' },
       ],
     },
     defaultSettings: {
       columns: 3,
     },
   },
   {
     type: 'products',
     label: 'Carrossel de Produtos',
     icon: 'ShoppingBag',
     defaultContent: {
       title: 'Nossos Produtos',
       subtitle: 'Confira as novidades',
       filter: 'all',
       limit: 8,
     },
     defaultSettings: {},
   },
   {
     type: 'testimonials',
     label: 'Depoimentos',
     icon: 'Quote',
     defaultContent: {
       items: [
         { name: 'Cliente 1', text: 'Ótima experiência!', photo: '' },
       ],
     },
     defaultSettings: {
       columns: 2,
     },
   },
   {
     type: 'gallery',
     label: 'Galeria de Imagens',
     icon: 'Images',
     defaultContent: {
       images: [],
     },
     defaultSettings: {
       columns: 3,
       gap: 4,
     },
   },
   {
     type: 'video',
     label: 'Vídeo',
     icon: 'Play',
     defaultContent: {
       url: '',
     },
     defaultSettings: {
       autoplay: false,
       muted: true,
     },
   },
   {
     type: 'spacer',
     label: 'Espaçamento',
     icon: 'MoveVertical',
     defaultContent: {},
     defaultSettings: {
       height: 64,
     },
   },
   {
     type: 'divider',
     label: 'Divisor',
     icon: 'Minus',
     defaultContent: {},
     defaultSettings: {
       style: 'solid',
       color: 'border',
     },
   },
 	{
     type: 'form',
     label: 'Formulário',
     icon: 'MessageSquare',
     defaultContent: {
       title: 'Fale Conosco',
       description: 'Preencha o formulário abaixo',
       fields: [
         { name: 'name', label: 'Nome', type: 'text', required: true },
         { name: 'email', label: 'E-mail', type: 'email', required: true },
         { name: 'phone', label: 'Telefone', type: 'tel', required: false },
         { name: 'message', label: 'Mensagem', type: 'textarea', required: true },
       ],
       button_text: 'Enviar',
       success_message: 'Mensagem enviada com sucesso!',
       whatsapp_number: '',
     },
     defaultSettings: {
       action: 'whatsapp',
       show_border: true,
     },
   },
 ];
 
 // =============================================
 // PAGES HOOKS
 // =============================================
 
 export function useCMSPages() {
   return useQuery({
     queryKey: ['cms-pages'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('cms_pages')
         .select('*')
         .order('created_at', { ascending: false });
       if (error) throw error;
       return data as CMSPage[];
     },
   });
 }
 
 export function useCMSPage(pageId: string | null) {
   return useQuery({
     queryKey: ['cms-page', pageId],
     queryFn: async () => {
       if (!pageId) return null;
       const { data, error } = await supabase
         .from('cms_pages')
         .select(`
           *,
           sections:cms_sections(*)
         `)
         .eq('id', pageId)
         .single();
       if (error) throw error;
       // Sort sections by position
       if (data?.sections) {
         data.sections = (data.sections as CMSSection[]).sort((a, b) => a.position - b.position);
       }
       return data as CMSPage;
     },
     enabled: !!pageId,
   });
 }
 
 export function useCMSPageBySlug(slug: string) {
   return useQuery({
     queryKey: ['cms-page-slug', slug],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('cms_pages')
         .select(`
           *,
           sections:cms_sections(*)
         `)
         .eq('slug', slug)
         .eq('is_published', true)
         .single();
       if (error) throw error;
       if (data?.sections) {
         data.sections = (data.sections as CMSSection[]).sort((a, b) => a.position - b.position);
       }
       return data as CMSPage;
     },
     enabled: !!slug,
   });
 }
 
 export function useCreateCMSPage() {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
     mutationFn: async (page: { title: string; slug: string; is_home?: boolean; is_published?: boolean; seo_title?: string; seo_description?: string }) => {
       const { data, error } = await supabase
         .from('cms_pages')
         .insert(page)
         .select()
         .single();
       if (error) throw error;
       return data as CMSPage;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['cms-pages'] });
       toast({ title: 'Página criada com sucesso!' });
     },
     onError: (error) => {
       toast({ variant: 'destructive', title: 'Erro ao criar página', description: error.message });
     },
   });
 }
 
 export function useUpdateCMSPage() {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
      mutationFn: async ({ id, sections: _sections, ...updates }: Partial<CMSPage> & { id: string }) => {
       const { data, error } = await supabase
         .from('cms_pages')
         .update(updates)
         .eq('id', id)
         .select()
         .single();
       if (error) throw error;
       return data as CMSPage;
     },
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['cms-pages'] });
       queryClient.invalidateQueries({ queryKey: ['cms-page', data.id] });
       toast({ title: 'Página atualizada!' });
     },
     onError: (error) => {
       toast({ variant: 'destructive', title: 'Erro ao atualizar página', description: error.message });
     },
   });
 }
 
 export function useDeleteCMSPage() {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase
         .from('cms_pages')
         .delete()
         .eq('id', id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['cms-pages'] });
       toast({ title: 'Página excluída!' });
     },
     onError: (error) => {
       toast({ variant: 'destructive', title: 'Erro ao excluir página', description: error.message });
     },
   });
 }
 
 // =============================================
 // SECTIONS HOOKS
 // =============================================
 
 export function useCreateCMSSection() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (section: { page_id: string; type: string; position?: number; is_visible?: boolean; content?: Json; settings?: Json }) => {
       const { data, error } = await supabase
         .from('cms_sections')
         .insert(section)
         .select()
         .single();
       if (error) throw error;
       return data as CMSSection;
     },
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['cms-page', data.page_id] });
     },
   });
 }
 
 export function useUpdateCMSSection() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ id, ...updates }: { id: string; position?: number; is_visible?: boolean; content?: Json; settings?: Json }) => {
       const { data, error } = await supabase
         .from('cms_sections')
         .update(updates)
         .eq('id', id)
         .select()
         .single();
       if (error) throw error;
       return data as CMSSection;
     },
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['cms-page', data.page_id] });
     },
   });
 }
 
 export function useDeleteCMSSection() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ id, pageId }: { id: string; pageId: string }) => {
       const { error } = await supabase
         .from('cms_sections')
         .delete()
         .eq('id', id);
       if (error) throw error;
       return pageId;
     },
     onSuccess: (pageId) => {
       queryClient.invalidateQueries({ queryKey: ['cms-page', pageId] });
     },
   });
 }
 
 export function useReorderCMSSections() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ sections, pageId }: { sections: { id: string; position: number }[]; pageId: string }) => {
       const updates = sections.map(({ id, position }) =>
         supabase.from('cms_sections').update({ position }).eq('id', id)
       );
       await Promise.all(updates);
       return pageId;
     },
     onSuccess: (pageId) => {
       queryClient.invalidateQueries({ queryKey: ['cms-page', pageId] });
     },
   });
 }
 
 // =============================================
 // THEME HOOKS
 // =============================================
 
 export function useCMSTheme() {
   return useQuery({
     queryKey: ['cms-theme'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('cms_theme')
         .select('*')
         .eq('is_active', true)
         .single();
       if (error && error.code !== 'PGRST116') throw error;
       return data as CMSTheme | null;
     },
   });
 }
 
export function useCreateCMSTheme() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('cms_theme')
        .insert({
          name: 'Minha Loja',
          is_active: true,
          colors: { primary: '0 0% 12%', secondary: '0 0% 97%', accent: '0 0% 45%' },
          fonts: { headings: 'Inter', body: 'Inter' },
          social: {},
          seo: {},
          texts: {},
        })
        .select()
        .single();
      if (error) throw error;
      return data as CMSTheme;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-theme'] });
      toast({ title: 'Aparência inicializada com sucesso!' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Erro ao inicializar aparência', description: error.message });
    },
  });
}

export function useUpdateCMSTheme() {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
      mutationFn: async ({ id, texts, ...updates }: Partial<CMSTheme> & { id: string }) => {
        const payload = { ...updates, ...(texts !== undefined ? { texts: texts as unknown as Json } : {}) };
        const { data, error } = await supabase
          .from('cms_theme')
          .update(payload)
         .eq('id', id)
         .select()
         .single();
       if (error) throw error;
       return data as CMSTheme;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['cms-theme'] });
       toast({ title: 'Tema atualizado!' });
     },
     onError: (error) => {
       toast({ variant: 'destructive', title: 'Erro ao atualizar tema', description: error.message });
     },
   });
 }
 
 // =============================================
 // MEDIA HOOKS
 // =============================================
 
 export function useCMSMedia() {
   return useQuery({
     queryKey: ['cms-media'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('cms_media')
         .select('*')
         .order('created_at', { ascending: false });
       if (error) throw error;
       return data as CMSMedia[];
     },
   });
 }
 
 export function useUploadCMSMedia() {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
     mutationFn: async (file: File) => {
       const fileExt = file.name.split('.').pop();
       const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
       
       // Upload to storage
       const { error: uploadError } = await supabase.storage
         .from('cms-media')
         .upload(fileName, file);
       if (uploadError) throw uploadError;
 
       // Get public URL
       const { data: urlData } = supabase.storage
         .from('cms-media')
         .getPublicUrl(fileName);
 
       // Save to cms_media table
       const { data, error } = await supabase
         .from('cms_media')
         .insert({
           url: urlData.publicUrl,
           file_name: file.name,
           file_size: file.size,
            type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'document',
         })
         .select()
         .single();
       if (error) throw error;
       return data as CMSMedia;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['cms-media'] });
       toast({ title: 'Arquivo enviado!' });
     },
     onError: (error) => {
       toast({ variant: 'destructive', title: 'Erro ao enviar arquivo', description: error.message });
     },
   });
 }
 
 export function useDeleteCMSMedia() {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
     mutationFn: async (media: CMSMedia) => {
       // Extract file name from URL
       const fileName = media.url.split('/').pop();
       if (fileName) {
         await supabase.storage.from('cms-media').remove([fileName]);
       }
       const { error } = await supabase.from('cms_media').delete().eq('id', media.id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['cms-media'] });
       toast({ title: 'Arquivo excluído!' });
     },
     onError: (error) => {
       toast({ variant: 'destructive', title: 'Erro ao excluir arquivo', description: error.message });
     },
   });
 }
 
 // =============================================
 // HOME PAGE HOOK
 // =============================================
 
 export function useCMSHomePage() {
   return useQuery({
     queryKey: ['cms-home-page'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('cms_pages')
         .select(`
           *,
           sections:cms_sections(*)
         `)
         .eq('is_home', true)
         .eq('is_published', true)
         .single();
       
       // PGRST116 means no rows returned, which is fine
       if (error && error.code !== 'PGRST116') throw error;
       
       if (data?.sections) {
         data.sections = (data.sections as CMSSection[]).sort((a, b) => a.position - b.position);
       }
       return data as CMSPage | null;
     },
   });
 }
 
 // =============================================
 // SET PAGE AS HOME
 // =============================================
 
 export function useSetPageAsHome() {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
     mutationFn: async (pageId: string) => {
       // First, unset all other home pages
       await supabase
         .from('cms_pages')
         .update({ is_home: false })
         .neq('id', pageId);
       
       // Then set this page as home
       const { data, error } = await supabase
         .from('cms_pages')
         .update({ is_home: true })
         .eq('id', pageId)
         .select()
         .single();
       
       if (error) throw error;
       return data as CMSPage;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['cms-pages'] });
       queryClient.invalidateQueries({ queryKey: ['cms-home-page'] });
       toast({ title: 'Página definida como home!' });
     },
     onError: (error) => {
      toast({ variant: 'destructive', title: 'Erro ao definir home', description: error.message });
    },
  });
}

// =============================================
// SYSTEM PAGES
// =============================================

export interface SystemPageDef {
  slug: string;
  title: string;
  route: string;
  isHome?: boolean;
}

export const SYSTEM_PAGES: SystemPageDef[] = [
  { slug: 'home', title: 'Início', route: '/', isHome: true },
  { slug: 'catalog', title: 'Catálogo', route: '/catalog' },
  { slug: 'releases', title: 'Lançamentos', route: '/releases' },
  { slug: 'about', title: 'Sobre', route: '/about' },
  { slug: 'contact', title: 'Contato', route: '/contact' },
];

export function useSystemPages() {
  const { data: pages, isLoading } = useCMSPages();
  
  const systemPages = SYSTEM_PAGES.map(sys => {
    const page = pages?.find(p => 
      sys.isHome ? p.is_home : p.slug === sys.slug
    );
    return {
      ...sys,
      exists: !!page,
      page,
    };
  });

  return { systemPages, isLoading };
}

export function useCreateSystemPage() {
  const createPage = useCreateCMSPage();
  
  return {
    ...createPage,
    createSystemPage: async (sysDef: SystemPageDef) => {
      return createPage.mutateAsync({
        title: sysDef.title,
        slug: sysDef.slug,
        is_home: sysDef.isHome || false,
        is_published: false,
      });
    },
  };
}

export function useCMSPageBySlugOrHome(slug: string, isHome?: boolean) {
  return useQuery({
    queryKey: ['cms-system-page', slug, isHome],
    queryFn: async () => {
      let query = supabase
        .from('cms_pages')
        .select(`
          *,
          sections:cms_sections(*)
        `)
        .eq('is_published', true);
      
      if (isHome) {
        query = query.eq('is_home', true);
      } else {
        query = query.eq('slug', slug);
      }
      
      const { data, error } = await query.single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      
      if (data.sections) {
        data.sections = (data.sections as CMSSection[]).sort((a, b) => a.position - b.position);
      }
      return data as CMSPage;
    },
    enabled: !!slug || isHome,
  });
}