
CREATE POLICY "Inbound pode enviar arquivos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inbound-docs' AND public.can_manage_inbound(auth.uid()));

CREATE POLICY "Inbound pode atualizar arquivos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'inbound-docs' AND public.can_manage_inbound(auth.uid()))
  WITH CHECK (bucket_id = 'inbound-docs' AND public.can_manage_inbound(auth.uid()));

CREATE POLICY "Inbound pode apagar arquivos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'inbound-docs' AND public.can_manage_inbound(auth.uid()));

CREATE POLICY "Equipe pode ver arquivos inbound" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'inbound-docs' AND public.can_view_inbound(auth.uid()));
