ALTER TABLE public.warehouse_locations
  ADD CONSTRAINT warehouse_locations_capacity_positive
  CHECK (capacity IS NULL OR capacity > 0) NOT VALID;

ALTER TABLE public.warehouse_locations
  VALIDATE CONSTRAINT warehouse_locations_capacity_positive;

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
BEGIN
  RAISE EXCEPTION 'MISSING_PACKAGE_DATA';
END;
$$;

CREATE OR REPLACE FUNCTION public.release_inbound_item_with_package(
  p_item_id uuid,
  p_actor_id uuid,
  p_title text,
  p_sku text,
  p_price numeric,
  p_weight_grams integer,
  p_length_cm integer,
  p_width_cm integer,
  p_height_cm integer,
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
  IF v_item.state NOT IN ('STOCKED','AVAILABLE') OR v_item.location_id IS NULL THEN RAISE EXCEPTION 'ITEM_NOT_STOCKED'; END IF;
  IF COALESCE(trim(p_sku), '') = '' OR COALESCE(trim(p_title), '') = '' OR p_price IS NULL OR p_price <= 0 THEN RAISE EXCEPTION 'MISSING_RELEASE_DATA'; END IF;
  IF p_weight_grams <= 0 OR p_length_cm <= 0 OR p_width_cm <= 0 OR p_height_cm <= 0 THEN RAISE EXCEPTION 'MISSING_PACKAGE_DATA'; END IF;
  v_before := to_jsonb(v_item);

  SELECT id, product_id INTO v_variant_id, v_product_id
  FROM public.product_variants
  WHERE upper(regexp_replace(COALESCE(sku,''), '[^A-Za-z0-9]', '', 'g')) = upper(regexp_replace(p_sku, '[^A-Za-z0-9]', '', 'g'))
  ORDER BY created_at LIMIT 1 FOR UPDATE;

  IF v_variant_id IS NULL THEN
    v_handle := trim(both '-' from regexp_replace(lower(unaccent(p_title)), '[^a-z0-9]+', '-', 'g')) || '-' || substr(replace(p_item_id::text, '-', ''), 1, 8);
    INSERT INTO public.products(title, description, handle, product_type, vendor, price, status, is_available, weight_grams, length_cm, width_cm, height_cm)
    VALUES (p_title, p_notes, v_handle, v_item.category, v_item.brand, p_price, 'active', true, p_weight_grams, p_length_cm, p_width_cm, p_height_cm)
    RETURNING id INTO v_product_id;
    INSERT INTO public.product_variants(product_id, title, sku, price, cost, inventory_quantity, is_available, inventory_policy)
    VALUES (v_product_id, COALESCE(v_item.condition_code, 'Única'), upper(trim(p_sku)), p_price, v_item.cost, v_item.quantity, true, 'deny')
    RETURNING id INTO v_variant_id;
  ELSE
    UPDATE public.product_variants SET inventory_quantity = inventory_quantity + v_item.quantity, price = p_price, cost = COALESCE(v_item.cost, cost), is_available = true WHERE id = v_variant_id;
    UPDATE public.products SET price = p_price, is_available = true, status = 'active', weight_grams = p_weight_grams, length_cm = p_length_cm, width_cm = p_width_cm, height_cm = p_height_cm WHERE id = v_product_id;
  END IF;

  UPDATE public.inbound_items SET product_id = v_product_id, variant_id = v_variant_id, sku = upper(trim(p_sku)), title = p_title,
    approved_price = p_price, approved_by = COALESCE(approved_by, p_actor_id), approved_at = COALESCE(approved_at, now()),
    state = 'AVAILABLE', released_at = now(), released_by = p_actor_id, updated_at = now()
  WHERE id = p_item_id;

  INSERT INTO public.inbound_stock_movements(item_id, variant_id, location_id, movement_type, quantity, from_state, to_state, notes, created_by)
  VALUES (p_item_id, v_variant_id, v_item.location_id, 'released', v_item.quantity, v_item.state, 'AVAILABLE', p_notes, p_actor_id);
  INSERT INTO public.inbound_events(entity_type, entity_id, action, before_data, after_data, actor_id, source)
  VALUES ('inbound_item', p_item_id, 'released_to_catalog', v_before,
    jsonb_build_object('product_id', v_product_id, 'variant_id', v_variant_id, 'sku', upper(trim(p_sku)), 'quantity', v_item.quantity, 'price', p_price, 'package_complete', true),
    p_actor_id, 'workflow');
  INSERT INTO public.bling_sync_queue(product_id, variant_id, action, payload) VALUES (v_product_id, v_variant_id, 'product', jsonb_build_object('source','inbound_release','item_id',p_item_id));
  INSERT INTO public.bling_sync_queue(product_id, variant_id, action, payload) VALUES (v_product_id, v_variant_id, 'stock', jsonb_build_object('source','inbound_release','item_id',p_item_id));
  RETURN jsonb_build_object('item_id', p_item_id, 'product_id', v_product_id, 'variant_id', v_variant_id, 'already_released', false);
END;
$$;

REVOKE ALL ON FUNCTION public.release_inbound_item_with_package(uuid,uuid,text,text,numeric,integer,integer,integer,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_inbound_item_with_package(uuid,uuid,text,text,numeric,integer,integer,integer,integer,text) TO service_role;