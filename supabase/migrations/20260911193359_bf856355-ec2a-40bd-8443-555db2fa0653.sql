ALTER TABLE public.inbound_items
  ADD COLUMN IF NOT EXISTS approved_price numeric,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS qc_by uuid,
  ADD COLUMN IF NOT EXISTS qc_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_id uuid,
  ADD COLUMN IF NOT EXISTS stocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_by uuid;

CREATE TABLE public.inbound_item_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inbound_items(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'product' CHECK (kind IN ('product','evidence','qc','label')),
  file_path text NOT NULL,
  caption text,
  mime_type text,
  size_bytes bigint,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inbound_item_photos TO authenticated;
GRANT ALL ON public.inbound_item_photos TO service_role;
ALTER TABLE public.inbound_item_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe CD vê fotos dos itens" ON public.inbound_item_photos FOR SELECT TO authenticated USING (public.can_view_inbound(auth.uid()));
CREATE INDEX idx_inbound_item_photos_item ON public.inbound_item_photos(item_id, created_at DESC);

CREATE TABLE public.inbound_identification_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.inbound_items(id) ON DELETE CASCADE,
  cache_key text,
  source text NOT NULL,
  query_type text NOT NULL,
  query_value text,
  title text,
  brand text,
  category text,
  gtin text,
  image_url text,
  product_url text,
  confidence numeric,
  is_selected boolean NOT NULL DEFAULT false,
  raw_data jsonb,
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inbound_identification_results TO authenticated;
GRANT ALL ON public.inbound_identification_results TO service_role;
ALTER TABLE public.inbound_identification_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe CD vê resultados de identificação" ON public.inbound_identification_results FOR SELECT TO authenticated USING (public.can_view_inbound(auth.uid()));
CREATE INDEX idx_inbound_identification_item ON public.inbound_identification_results(item_id, created_at DESC);
CREATE INDEX idx_inbound_identification_cache ON public.inbound_identification_results(cache_key, created_at DESC);

CREATE TABLE public.inbound_market_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inbound_items(id) ON DELETE CASCADE,
  source text NOT NULL,
  title text,
  url text,
  image_url text,
  price numeric,
  currency text NOT NULL DEFAULT 'BRL',
  condition text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT ON public.inbound_market_references TO authenticated;
GRANT ALL ON public.inbound_market_references TO service_role;
ALTER TABLE public.inbound_market_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe CD vê referências de mercado" ON public.inbound_market_references FOR SELECT TO authenticated USING (public.can_view_inbound(auth.uid()));
CREATE INDEX idx_inbound_market_item ON public.inbound_market_references(item_id, captured_at DESC);

CREATE TABLE public.inbound_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inbound_items(id) ON DELETE CASCADE,
  price_type text NOT NULL CHECK (price_type IN ('cost','suggested','approved')),
  old_value numeric,
  new_value numeric NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inbound_price_history TO authenticated;
GRANT ALL ON public.inbound_price_history TO service_role;
ALTER TABLE public.inbound_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe CD vê histórico de preços" ON public.inbound_price_history FOR SELECT TO authenticated USING (public.can_view_inbound(auth.uid()));
CREATE INDEX idx_inbound_price_item ON public.inbound_price_history(item_id, created_at DESC);

CREATE TABLE public.inbound_qc_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inbound_items(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved','quarantine','rejected')),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inbound_qc_checks TO authenticated;
GRANT ALL ON public.inbound_qc_checks TO service_role;
ALTER TABLE public.inbound_qc_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe CD vê inspeções de qualidade" ON public.inbound_qc_checks FOR SELECT TO authenticated USING (public.can_view_inbound(auth.uid()));
CREATE INDEX idx_inbound_qc_item ON public.inbound_qc_checks(item_id, created_at DESC);

CREATE TABLE public.warehouse_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  zone text,
  aisle text,
  rack text,
  shelf text,
  bin text,
  description text,
  capacity integer,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.warehouse_locations TO authenticated;
GRANT ALL ON public.warehouse_locations TO service_role;
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe CD vê endereços" ON public.warehouse_locations FOR SELECT TO authenticated USING (public.can_view_inbound(auth.uid()));
CREATE TRIGGER update_warehouse_locations_updated_at BEFORE UPDATE ON public.warehouse_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_warehouse_locations_active ON public.warehouse_locations(is_active, code);

ALTER TABLE public.inbound_items
  ADD CONSTRAINT inbound_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.warehouse_locations(id) ON DELETE SET NULL;

CREATE TABLE public.inbound_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inbound_items(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('received','qc_approved','addressed','stocked','released','adjustment','quarantine','rejected')),
  quantity integer NOT NULL,
  from_state text,
  to_state text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inbound_stock_movements TO authenticated;
GRANT ALL ON public.inbound_stock_movements TO service_role;
ALTER TABLE public.inbound_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe CD vê movimentações" ON public.inbound_stock_movements FOR SELECT TO authenticated USING (public.can_view_inbound(auth.uid()));
CREATE INDEX idx_inbound_stock_item ON public.inbound_stock_movements(item_id, created_at DESC);
CREATE INDEX idx_inbound_stock_variant ON public.inbound_stock_movements(variant_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS bling_order_links_order_id_key ON public.bling_order_links(order_id) WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.release_inbound_item(
  p_item_id uuid,
  p_actor_id uuid,
  p_title text,
  p_sku text,
  p_price numeric,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.inbound_items%ROWTYPE;
  v_product_id uuid;
  v_variant_id uuid;
  v_handle text;
  v_before jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_item_id::text, 0));
  SELECT * INTO v_item FROM public.inbound_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
  IF v_item.released_at IS NOT NULL THEN
    RETURN jsonb_build_object('item_id', v_item.id, 'product_id', v_item.product_id, 'variant_id', v_item.variant_id, 'already_released', true);
  END IF;
  IF v_item.state NOT IN ('STOCKED','AVAILABLE') THEN RAISE EXCEPTION 'ITEM_NOT_STOCKED'; END IF;
  IF COALESCE(trim(p_sku), '') = '' OR COALESCE(trim(p_title), '') = '' OR p_price IS NULL OR p_price <= 0 THEN RAISE EXCEPTION 'MISSING_RELEASE_DATA'; END IF;
  v_before := to_jsonb(v_item);

  SELECT id, product_id INTO v_variant_id, v_product_id
  FROM public.product_variants
  WHERE upper(regexp_replace(COALESCE(sku,''), '[^A-Za-z0-9]', '', 'g')) = upper(regexp_replace(p_sku, '[^A-Za-z0-9]', '', 'g'))
  ORDER BY created_at LIMIT 1 FOR UPDATE;

  IF v_variant_id IS NULL THEN
    v_handle := trim(both '-' from regexp_replace(lower(unaccent(p_title)), '[^a-z0-9]+', '-', 'g')) || '-' || substr(replace(p_item_id::text, '-', ''), 1, 8);
    INSERT INTO public.products(title, description, handle, product_type, vendor, price, status, is_available)
    VALUES (p_title, p_notes, v_handle, v_item.category, v_item.brand, p_price, 'active', true)
    RETURNING id INTO v_product_id;
    INSERT INTO public.product_variants(product_id, title, sku, price, cost, inventory_quantity, is_available, inventory_policy)
    VALUES (v_product_id, COALESCE(v_item.condition_code, 'Única'), upper(trim(p_sku)), p_price, v_item.cost, v_item.quantity, true, 'deny')
    RETURNING id INTO v_variant_id;
  ELSE
    UPDATE public.product_variants
    SET inventory_quantity = inventory_quantity + v_item.quantity,
        price = p_price,
        cost = COALESCE(v_item.cost, cost),
        is_available = true
    WHERE id = v_variant_id;
    UPDATE public.products SET price = p_price, is_available = true, status = 'active' WHERE id = v_product_id;
  END IF;

  UPDATE public.inbound_items
  SET product_id = v_product_id, variant_id = v_variant_id, sku = upper(trim(p_sku)), title = p_title,
      approved_price = p_price, approved_by = COALESCE(approved_by, p_actor_id), approved_at = COALESCE(approved_at, now()),
      state = 'AVAILABLE', released_at = now(), released_by = p_actor_id, updated_at = now()
  WHERE id = p_item_id;

  INSERT INTO public.inbound_stock_movements(item_id, variant_id, location_id, movement_type, quantity, from_state, to_state, notes, created_by)
  VALUES (p_item_id, v_variant_id, v_item.location_id, 'released', v_item.quantity, v_item.state, 'AVAILABLE', p_notes, p_actor_id);
  INSERT INTO public.inbound_events(entity_type, entity_id, action, before_data, after_data, actor_id, source)
  VALUES ('inbound_item', p_item_id, 'released_to_catalog', v_before,
          jsonb_build_object('product_id', v_product_id, 'variant_id', v_variant_id, 'sku', upper(trim(p_sku)), 'quantity', v_item.quantity, 'price', p_price),
          p_actor_id, 'workflow');
  INSERT INTO public.bling_sync_queue(product_id, variant_id, action, payload)
  VALUES (v_product_id, v_variant_id, 'product', jsonb_build_object('source','inbound_release','item_id',p_item_id));
  INSERT INTO public.bling_sync_queue(product_id, variant_id, action, payload)
  VALUES (v_product_id, v_variant_id, 'stock', jsonb_build_object('source','inbound_release','item_id',p_item_id));

  RETURN jsonb_build_object('item_id', p_item_id, 'product_id', v_product_id, 'variant_id', v_variant_id, 'already_released', false);
END;
$$;
REVOKE ALL ON FUNCTION public.release_inbound_item(uuid,uuid,text,text,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_inbound_item(uuid,uuid,text,text,numeric,text) TO service_role;

CREATE TRIGGER trg_bling_enqueue_variant_product
  AFTER INSERT ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.bling_enqueue_product();

REVOKE INSERT, UPDATE, DELETE ON public.inbound_item_photos, public.inbound_identification_results,
  public.inbound_market_references, public.inbound_price_history, public.inbound_qc_checks,
  public.warehouse_locations, public.inbound_stock_movements FROM authenticated;
REVOKE UPDATE ON public.inbound_items FROM authenticated;