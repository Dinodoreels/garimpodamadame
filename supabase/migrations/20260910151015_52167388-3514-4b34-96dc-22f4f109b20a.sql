CREATE OR REPLACE FUNCTION public.bling_enqueue_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_active boolean;
  v_push boolean;
BEGIN
  SELECT is_active, push_orders INTO v_active, v_push FROM public.bling_config LIMIT 1;
  IF v_active IS NOT TRUE OR v_push IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.source LIKE 'bling:%' THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT' AND NEW.paid_at IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND OLD.paid_at IS NULL AND NEW.paid_at IS NOT NULL) THEN
    IF NOT EXISTS (SELECT 1 FROM public.bling_order_links WHERE order_id = NEW.id) THEN
      INSERT INTO public.bling_sync_queue (order_id, action) VALUES (NEW.id, 'order');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bling_enqueue_order() FROM anon, authenticated;

CREATE TRIGGER trg_bling_enqueue_order
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.bling_enqueue_order();