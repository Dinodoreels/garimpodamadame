ALTER TABLE public.marketplace_shipping_labels
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS upload_source text,
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "Admins upload shipping labels"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'shipping-labels'
  AND public.has_role(auth.uid(), 'admin')
  AND (storage.foldername(name))[1] = 'tiktok'
);

CREATE POLICY "Admins read shipping labels"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'shipping-labels'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins replace shipping labels"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'shipping-labels'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'shipping-labels'
  AND public.has_role(auth.uid(), 'admin')
  AND (storage.foldername(name))[1] = 'tiktok'
);

CREATE POLICY "Admins remove shipping labels"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'shipping-labels'
  AND public.has_role(auth.uid(), 'admin')
);