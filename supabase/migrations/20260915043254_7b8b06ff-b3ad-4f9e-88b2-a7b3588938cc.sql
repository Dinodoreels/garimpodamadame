CREATE TABLE public.bling_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_key text NOT NULL,
  company_name text,
  status text NOT NULL DEFAULT 'fetching' CHECK (status IN ('fetching','review','applying','completed','failed')),
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  orders_result jsonb,
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bling_import_runs TO authenticated;
GRANT ALL ON public.bling_import_runs TO service_role;
ALTER TABLE public.bling_import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bling import runs" ON public.bling_import_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER update_bling_import_runs_updated_at BEFORE UPDATE ON public.bling_import_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bling_import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.bling_import_runs(id) ON DELETE CASCADE,
  account_key text NOT NULL,
  bling_product_id text NOT NULL,
  bling_sku text,
  classification text NOT NULL CHECK (classification IN ('new','linked','different','conflict')),
  selected boolean NOT NULL DEFAULT false,
  local_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  local_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  bling_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  differences jsonb NOT NULL DEFAULT '{}'::jsonb,
  apply_status text NOT NULL DEFAULT 'pending' CHECK (apply_status IN ('pending','created','linked','updated','ignored','error')),
  error_message text,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, bling_product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bling_import_items TO authenticated;
GRANT ALL ON public.bling_import_items TO service_role;
ALTER TABLE public.bling_import_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bling import items" ON public.bling_import_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER update_bling_import_items_updated_at BEFORE UPDATE ON public.bling_import_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX bling_import_runs_created_at_idx ON public.bling_import_runs(created_at DESC);
CREATE INDEX bling_import_items_run_classification_idx ON public.bling_import_items(run_id, classification);
CREATE INDEX bling_import_items_sku_idx ON public.bling_import_items(upper(bling_sku));