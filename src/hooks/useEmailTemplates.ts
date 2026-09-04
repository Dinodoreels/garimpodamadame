import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EmailBlock, EmailSettings } from '@/lib/emailTemplate';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  preheader: string;
  blocks: EmailBlock[];
  settings: EmailSettings;
  thumbnail_url: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as unknown as EmailTemplate[];
    },
  });
}

export function useEmailTemplate(id: string | null) {
  return useQuery({
    queryKey: ['email-template', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as EmailTemplate;
    },
  });
}

export function useSaveEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tpl: Partial<EmailTemplate> & { id?: string }) => {
      const payload: any = {
        name: tpl.name,
        subject: tpl.subject ?? '',
        preheader: tpl.preheader ?? '',
        blocks: tpl.blocks ?? [],
        settings: tpl.settings ?? {},
      };
      if (tpl.id) {
        const { data, error } = await (supabase.from("email_templates") as any).update(payload).eq('id', tpl.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        payload.created_by = user?.id;
        const { data, error } = await (supabase.from("email_templates") as any).insert(payload).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template salvo');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template excluído');
    },
  });
}

export function useDuplicateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tpl: EmailTemplate) => {
      const { data, error } = await (supabase.from("email_templates") as any).insert({
        name: tpl.name + ' (cópia)',
        subject: tpl.subject,
        preheader: tpl.preheader,
        blocks: tpl.blocks,
        settings: tpl.settings,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template duplicado');
    },
  });
}

export function useSendTestMarketing() {
  return useMutation({
    mutationFn: async ({ html, subject, toEmail }: { html: string; subject: string; toEmail: string }) => {
      const { data, error } = await supabase.functions.invoke('send-marketing-test', {
        body: { html, subject, toEmail },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Falha no envio');
      return data;
    },
    onSuccess: () => toast.success('Email de teste enviado'),
    onError: (e: any) => toast.error(e.message || 'Erro ao enviar'),
  });
}
