ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS ncm text,
  ADD COLUMN IF NOT EXISTS cest text,
  ADD COLUMN IF NOT EXISTS fiscal_origin integer,
  ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS warranty_months integer,
  ADD COLUMN IF NOT EXISTS marketplace_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS suggestion_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS suggestions_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS catalog_completeness integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalog_pending_fields text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS gtin text,
  ADD COLUMN IF NOT EXISTS marketplace_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS product_variants_gtin_idx ON public.product_variants (gtin) WHERE gtin IS NOT NULL;

CREATE TABLE public.marketplace_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_store_id text NOT NULL,
  name text NOT NULL,
  logo_key text,
  is_connected boolean NOT NULL DEFAULT true,
  auto_publish boolean NOT NULL DEFAULT true,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_store_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_channels TO authenticated;
GRANT ALL ON public.marketplace_channels TO service_role;
ALTER TABLE public.marketplace_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketplace channels" ON public.marketplace_channels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.marketplace_category_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.marketplace_channels(id) ON DELETE CASCADE,
  local_category_id uuid REFERENCES public.product_categories(id) ON DELETE CASCADE,
  local_category_value text NOT NULL,
  bling_category_id text,
  marketplace_category_id text NOT NULL,
  marketplace_category_name text,
  required_attributes jsonb NOT NULL DEFAULT '[]'::jsonb,
  attribute_mappings jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, local_category_value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_category_mappings TO authenticated;
GRANT ALL ON public.marketplace_category_mappings TO service_role;
ALTER TABLE public.marketplace_category_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketplace category mappings" ON public.marketplace_category_mappings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.marketplace_product_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.marketplace_channels(id) ON DELETE CASCADE,
  external_listing_id text,
  status text NOT NULL DEFAULT 'pending',
  readiness_percent integer NOT NULL DEFAULT 0,
  pending_fields text[] NOT NULL DEFAULT '{}'::text[],
  last_error text,
  last_payload jsonb,
  last_response jsonb,
  last_attempt_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX marketplace_product_publications_unique ON public.marketplace_product_publications (product_id, channel_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_product_publications TO authenticated;
GRANT ALL ON public.marketplace_product_publications TO service_role;
ALTER TABLE public.marketplace_product_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketplace publications" ON public.marketplace_product_publications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.marketplace_product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.marketplace_channels(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  status text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.marketplace_product_events TO authenticated;
GRANT ALL ON public.marketplace_product_events TO service_role;
ALTER TABLE public.marketplace_product_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read marketplace product events" ON public.marketplace_product_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins create marketplace product events" ON public.marketplace_product_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER marketplace_channels_updated_at BEFORE UPDATE ON public.marketplace_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER marketplace_category_mappings_updated_at BEFORE UPDATE ON public.marketplace_category_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER marketplace_product_publications_updated_at BEFORE UPDATE ON public.marketplace_product_publications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.calculate_product_catalog_readiness(target_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.products%ROWTYPE;
  missing text[] := '{}'::text[];
  total integer := 12;
  completed integer := 0;
  has_image boolean := false;
  has_valid_variant boolean := false;
BEGIN
  SELECT * INTO p FROM public.products WHERE id = target_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.product_images WHERE product_id = target_product_id) INTO has_image;
  SELECT EXISTS (
    SELECT 1 FROM public.product_variants
    WHERE product_id = target_product_id
      AND NULLIF(trim(sku), '') IS NOT NULL
      AND price > 0
  ) INTO has_valid_variant;

  IF NULLIF(trim(p.title), '') IS NULL THEN missing := array_append(missing, 'title'); ELSE completed := completed + 1; END IF;
  IF NULLIF(trim(p.description), '') IS NULL THEN missing := array_append(missing, 'description'); ELSE completed := completed + 1; END IF;
  IF NULLIF(trim(p.product_type), '') IS NULL THEN missing := array_append(missing, 'category'); ELSE completed := completed + 1; END IF;
  IF NULLIF(trim(p.vendor), '') IS NULL THEN missing := array_append(missing, 'brand'); ELSE completed := completed + 1; END IF;
  IF p.price IS NULL OR p.price <= 0 THEN missing := array_append(missing, 'price'); ELSE completed := completed + 1; END IF;
  IF NOT has_valid_variant THEN missing := array_append(missing, 'sku'); ELSE completed := completed + 1; END IF;
  IF NOT has_image THEN missing := array_append(missing, 'images'); ELSE completed := completed + 1; END IF;
  IF p.weight_grams IS NULL OR p.weight_grams <= 0 THEN missing := array_append(missing, 'weight'); ELSE completed := completed + 1; END IF;
  IF p.length_cm IS NULL OR p.length_cm <= 0 OR p.width_cm IS NULL OR p.width_cm <= 0 OR p.height_cm IS NULL OR p.height_cm <= 0 THEN missing := array_append(missing, 'dimensions'); ELSE completed := completed + 1; END IF;
  IF NULLIF(trim(p.ncm), '') IS NULL THEN missing := array_append(missing, 'ncm'); ELSE completed := completed + 1; END IF;
  IF p.fiscal_origin IS NULL THEN missing := array_append(missing, 'fiscal_origin'); ELSE completed := completed + 1; END IF;
  IF p.suggestions_confirmed_at IS NULL THEN missing := array_append(missing, 'confirmation'); ELSE completed := completed + 1; END IF;

  UPDATE public.products
  SET catalog_completeness = round(completed::numeric * 100 / total), catalog_pending_fields = missing
  WHERE id = target_product_id;

  RETURN jsonb_build_object('readiness_percent', round(completed::numeric * 100 / total), 'pending_fields', missing, 'ready', cardinality(missing) = 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.calculate_product_catalog_readiness(uuid) TO authenticated, service_role;