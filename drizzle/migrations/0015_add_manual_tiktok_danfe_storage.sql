ALTER TABLE public.fiscal_documents
  ADD COLUMN IF NOT EXISTS danfe_storage_path text,
  ADD COLUMN IF NOT EXISTS upload_source text,
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "Admins upload fiscal documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'shipping-labels'
  AND public.has_role(auth.uid(), 'admin')
  AND (storage.foldername(name))[1] = 'tiktok-danfe'
);

CREATE POLICY "Admins replace fiscal documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'shipping-labels'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'shipping-labels'
  AND public.has_role(auth.uid(), 'admin')
  AND (storage.foldername(name))[1] = 'tiktok-danfe'
);