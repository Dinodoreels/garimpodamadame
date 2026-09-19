CREATE UNIQUE INDEX IF NOT EXISTS bling_product_links_product_variant_unique
ON public.bling_product_links (product_id, variant_id) NULLS NOT DISTINCT;

CREATE OR REPLACE FUNCTION public.bling_enqueue_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_active boolean;
  v_stock boolean;
  v_price boolean;
  v_authority text;
  v_price_authority text;
  v_stock_changed boolean;
  v_price_changed boolean;
BEGIN
  SELECT is_active, sync_stock, sync_prices, stock_authority, price_authority
    INTO v_active, v_stock, v_price, v_authority, v_price_authority
  FROM public.bling_config LIMIT 1;

  IF v_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  v_stock_changed := TG_OP = 'INSERT' OR NEW.inventory_quantity IS DISTINCT FROM OLD.inventory_quantity;
  v_price_changed := TG_OP = 'INSERT' OR NEW.price IS DISTINCT FROM OLD.price;

  IF NOT ((v_stock AND v_stock_changed AND v_authority = 'store')
       OR (v_price AND v_price_changed AND v_price_authority = 'store')) THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bling_product_links l
    WHERE l.variant_id = NEW.id AND l.bling_product_id IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bling_sync_queue q
    WHERE q.variant_id = NEW.id
      AND q.action = 'stock'
      AND q.status IN ('pending', 'processing')
  ) THEN
    INSERT INTO public.bling_sync_queue (product_id, variant_id, action)
    VALUES (NEW.product_id, NEW.id, 'stock');
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.bling_enqueue_stock() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bling_enqueue_stock() FROM anon;
REVOKE ALL ON FUNCTION public.bling_enqueue_stock() FROM authenticated;