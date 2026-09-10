-- ============ CONFIG ============
CREATE TABLE public.bling_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text,
  client_secret text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  oauth_state text,
  company_name text,
  is_active boolean NOT NULL DEFAULT false,
  sync_products boolean NOT NULL DEFAULT true,
  sync_stock boolean NOT NULL DEFAULT true,
  sync_prices boolean NOT NULL DEFAULT true,
  push_orders boolean NOT NULL DEFAULT true,
  pull_marketplace_orders boolean NOT NULL DEFAULT true,
  stock_authority text NOT NULL DEFAULT 'bling',
  price_authority text NOT NULL DEFAULT 'store',
  order_pull_interval_minutes integer NOT NULL DEFAULT 15,
  deposito_id text,
  deposito_name text,
  loja_id text,
  loja_name text,
  last_sync_at timestamptz,
  last_order_pull_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bling_stock_authority_chk CHECK (stock_authority IN ('bling','store','notify')),
  CONSTRAINT bling_price_authority_chk CHECK (price_authority IN ('bling','store','notify'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bling_config TO authenticated;
GRANT ALL ON public.bling_config TO service_role;
ALTER TABLE public.bling_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bling config" ON public.bling_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_bling_config_updated_at BEFORE UPDATE ON public.bling_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRODUCT LINKS ============
CREATE TABLE public.bling_product_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  bling_product_id text,
  bling_sku text,
  status text NOT NULL DEFAULT 'pending',
  last_pushed_at timestamptz,
  last_pulled_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bling_product_links_product_variant_key
  ON public.bling_product_links (product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX bling_product_links_bling_id_idx ON public.bling_product_links (bling_product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bling_product_links TO authenticated;
GRANT ALL ON public.bling_product_links TO service_role;
ALTER TABLE public.bling_product_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bling product links" ON public.bling_product_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_bling_product_links_updated_at BEFORE UPDATE ON public.bling_product_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ORDER LINKS ============
CREATE TABLE public.bling_order_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  bling_order_id text NOT NULL,
  bling_order_number text,
  channel text,
  direction text NOT NULL DEFAULT 'pull',
  bling_status text,
  raw_payload jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz
);
CREATE UNIQUE INDEX bling_order_links_bling_order_id_key ON public.bling_order_links (bling_order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bling_order_links TO authenticated;
GRANT ALL ON public.bling_order_links TO service_role;
ALTER TABLE public.bling_order_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bling order links" ON public.bling_order_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============ SYNC QUEUE ============
CREATE TABLE public.bling_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  action text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bling_sync_queue_pending_idx ON public.bling_sync_queue (status, scheduled_for);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bling_sync_queue TO authenticated;
GRANT ALL ON public.bling_sync_queue TO service_role;
ALTER TABLE public.bling_sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bling sync queue" ON public.bling_sync_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_bling_sync_queue_updated_at BEFORE UPDATE ON public.bling_sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SYNC LOG ============
CREATE TABLE public.bling_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text,
  action text NOT NULL,
  status text NOT NULL,
  payload jsonb,
  response jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bling_sync_log_created_idx ON public.bling_sync_log (created_at DESC);
GRANT SELECT ON public.bling_sync_log TO authenticated;
GRANT ALL ON public.bling_sync_log TO service_role;
ALTER TABLE public.bling_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read bling sync log" ON public.bling_sync_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.bling_enqueue_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  INSERT INTO public.bling_sync_queue (product_id, action)
  VALUES (v_pid, 'product');

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.bling_enqueue_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  INSERT INTO public.bling_sync_queue (product_id, variant_id, action)
  VALUES (NEW.product_id, NEW.id, 'stock');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bling_enqueue_product
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.bling_enqueue_product();

CREATE TRIGGER trg_bling_enqueue_stock
  AFTER INSERT OR UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.bling_enqueue_stock();