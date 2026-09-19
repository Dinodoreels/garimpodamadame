CREATE OR REPLACE FUNCTION public.bling_enqueue_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pid uuid;
  v_active boolean;
  v_sync boolean;
BEGIN
  SELECT is_active, sync_products INTO v_active, v_sync FROM public.bling_config LIMIT 1;
  IF v_active IS NOT TRUE OR v_sync IS NOT TRUE THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'products' THEN
    v_pid := COALESCE(NEW.id, OLD.id);
  ELSE
    v_pid := COALESCE(NEW.product_id, OLD.product_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bling_sync_queue q
    WHERE q.product_id = v_pid
      AND q.action = 'product'
      AND q.status IN ('pending', 'processing')
  ) THEN
    INSERT INTO public.bling_sync_queue (product_id, action)
    VALUES (v_pid, 'product');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;