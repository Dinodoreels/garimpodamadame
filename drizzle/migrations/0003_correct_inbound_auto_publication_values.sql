CREATE OR REPLACE FUNCTION public.publish_complete_inbound_scan_item(
  p_item_id uuid,
  p_actor_id uuid,
  p_description text,
  p_sku text
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
  v_sku text;
  v_price numeric;
  v_was_new boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_item_id::text, 0));
  SELECT * INTO v_item FROM public.inbound_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
  IF v_item.released_at IS NOT NULL THEN
    RETURN jsonb_build_object('item_id', v_item.id, 'product_id', v_item.product_id, 'variant_id', v_item.variant_id, 'already_published', true);
  END IF;

  v_sku := upper(trim(COALESCE(NULLIF(p_sku, ''), NULLIF(v_item.sku, ''), CASE WHEN v_item.barcode IS NOT NULL THEN 'GDM-' || regexp_replace(v_item.barcode, '[^A-Za-z0-9]', '', 'g') ELSE 'GDM-INB-' || substr(replace(v_item.id::text, '-', ''), 1, 10) END)));
  v_price := v_item.suggested_price;
  IF COALESCE(trim(v_item.title), '') = '' OR COALESCE(trim(p_description), '') = '' OR v_price IS NULL OR v_price <= 0 OR v_item.quantity <= 0 THEN
    RAISE EXCEPTION 'MISSING_PUBLICATION_DATA';
  END IF;

  v_product_id := v_item.product_id;
  v_variant_id := v_item.variant_id;
  IF v_variant_id IS NULL AND v_item.barcode IS NOT NULL THEN
    SELECT id, product_id INTO v_variant_id, v_product_id FROM public.product_variants
    WHERE barcode = v_item.barcode OR gtin = v_item.barcode ORDER BY created_at LIMIT 1 FOR UPDATE;
  END IF;
  IF v_variant_id IS NULL THEN
    SELECT id, product_id INTO v_variant_id, v_product_id FROM public.product_variants
    WHERE upper(regexp_replace(COALESCE(sku,''), '[^A-Za-z0-9]', '', 'g')) = upper(regexp_replace(v_sku, '[^A-Za-z0-9]', '', 'g'))
    ORDER BY created_at LIMIT 1 FOR UPDATE;
  END IF;

  IF v_variant_id IS NULL THEN
    v_handle := trim(both '-' from regexp_replace(lower(unaccent(v_item.title)), '[^a-z0-9]+', '-', 'g')) || '-inbound-' || substr(replace(v_item.id::text, '-', ''), 1, 8);
    INSERT INTO public.products(title, description, handle, product_type, vendor, price, status, is_available, condition, suggestions_confirmed_at, suggestion_data)
    VALUES (v_item.title, p_description, v_handle, v_item.category, v_item.brand, v_price, 'active', true, 'pre_owned', now(), COALESCE(v_item.ai_data, '{}'::jsonb))
    RETURNING id INTO v_product_id;
    INSERT INTO public.product_variants(product_id, title, sku, barcode, gtin, price, cost, inventory_quantity, is_available, inventory_policy)
    VALUES (v_product_id, COALESCE(v_item.condition_code, 'Única'), v_sku, v_item.barcode, v_item.barcode, v_price, v_item.cost, v_item.quantity, true, 'deny')
    RETURNING id INTO v_variant_id;
    v_was_new := true;
  ELSE
    UPDATE public.product_variants SET inventory_quantity = inventory_quantity + v_item.quantity, price = v_price,
      cost = COALESCE(v_item.cost, cost), barcode = COALESCE(barcode, v_item.barcode), gtin = COALESCE(gtin, v_item.barcode),
      is_available = true, updated_at = now() WHERE id = v_variant_id;
    UPDATE public.products SET title = COALESCE(NULLIF(title, ''), v_item.title), description = COALESCE(NULLIF(description, ''), p_description),
      product_type = COALESCE(product_type, v_item.category), vendor = COALESCE(vendor, v_item.brand), price = v_price,
      is_available = true, status = 'active', updated_at = now() WHERE id = v_product_id;
  END IF;

  UPDATE public.inbound_items SET product_id = v_product_id, variant_id = v_variant_id, sku = v_sku,
    approved_price = v_price, approved_by = p_actor_id, approved_at = now(), state = 'AVAILABLE', released_at = now(), released_by = p_actor_id, updated_at = now()
  WHERE id = p_item_id;
  INSERT INTO public.inbound_stock_movements(item_id, variant_id, location_id, movement_type, quantity, from_state, to_state, notes, created_by)
  VALUES (p_item_id, v_variant_id, v_item.location_id, 'released', v_item.quantity, v_item.state, 'AVAILABLE', 'Cadastro automático pelo Garimpo Scan', p_actor_id);
  INSERT INTO public.inbound_events(entity_type, entity_id, action, before_data, after_data, actor_id, source)
  VALUES ('inbound_item', p_item_id, 'auto_published_to_catalog', to_jsonb(v_item), jsonb_build_object('product_id', v_product_id, 'variant_id', v_variant_id, 'sku', v_sku, 'quantity', v_item.quantity, 'price', v_price, 'new_product', v_was_new), p_actor_id, 'garimpo_scan');
  INSERT INTO public.bling_sync_queue(product_id, variant_id, action, payload) VALUES (v_product_id, v_variant_id, 'product', jsonb_build_object('source','inbound_auto_publish','item_id',p_item_id));
  INSERT INTO public.bling_sync_queue(product_id, variant_id, action, payload) VALUES (v_product_id, v_variant_id, 'stock', jsonb_build_object('source','inbound_auto_publish','item_id',p_item_id));
  RETURN jsonb_build_object('item_id', p_item_id, 'product_id', v_product_id, 'variant_id', v_variant_id, 'sku', v_sku, 'new_product', v_was_new, 'already_published', false);
END;
$$;
REVOKE ALL ON FUNCTION public.publish_complete_inbound_scan_item(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_complete_inbound_scan_item(uuid,uuid,text,text) TO service_role;