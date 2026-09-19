CREATE TABLE public.vip_sales_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  provider text,
  group_id text,
  default_discount_percent numeric(5,2) NOT NULL DEFAULT 10 CHECK (default_discount_percent > 0 AND default_discount_percent <= 90),
  coupon_prefix text NOT NULL DEFAULT 'VIP',
  coupon_expires_days integer NOT NULL DEFAULT 7 CHECK (coupon_expires_days BETWEEN 1 AND 365),
  message_template text NOT NULL DEFAULT '✨ OFERTA VIP ✨\n\n{{produto}}\nDe {{preco_original}} por {{preco_vip}}\nEstoque: {{estoque}} unidade(s)\nCupom: {{cupom}}\n\nCompre aqui: {{link}}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_sales_config TO authenticated;
GRANT ALL ON public.vip_sales_config TO service_role;
ALTER TABLE public.vip_sales_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage VIP sales config" ON public.vip_sales_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.vip_product_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  discount_code_id uuid REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  discount_percent numeric(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 90),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','sent','sold_out','failed','paused')),
  last_known_stock integer NOT NULL DEFAULT 0,
  message_preview text,
  sent_at timestamptz,
  last_error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_product_campaigns TO authenticated;
GRANT ALL ON public.vip_product_campaigns TO service_role;
ALTER TABLE public.vip_product_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage VIP product campaigns" ON public.vip_product_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX vip_product_campaigns_variant_status_idx ON public.vip_product_campaigns(variant_id, status);

CREATE TABLE public.vip_campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.vip_product_campaigns(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  stock_quantity integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vip_campaign_events TO authenticated;
GRANT ALL ON public.vip_campaign_events TO service_role;
ALTER TABLE public.vip_campaign_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view VIP campaign events" ON public.vip_campaign_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX vip_campaign_events_campaign_created_idx ON public.vip_campaign_events(campaign_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.sync_vip_campaign_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vip_product_campaigns
  SET last_known_stock = GREATEST(NEW.inventory_quantity, 0),
      status = CASE
        WHEN NEW.inventory_quantity <= 0 AND status IN ('ready','sent') THEN 'sold_out'
        WHEN NEW.inventory_quantity > 0 AND status = 'sold_out' THEN 'ready'
        ELSE status
      END,
      updated_at = now()
  WHERE variant_id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_vip_campaign_stock() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_vip_campaign_stock() TO service_role;
CREATE TRIGGER trg_sync_vip_campaign_stock
AFTER UPDATE OF inventory_quantity ON public.product_variants
FOR EACH ROW
WHEN (OLD.inventory_quantity IS DISTINCT FROM NEW.inventory_quantity)
EXECUTE FUNCTION public.sync_vip_campaign_stock();

CREATE TRIGGER vip_sales_config_updated_at BEFORE UPDATE ON public.vip_sales_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER vip_product_campaigns_updated_at BEFORE UPDATE ON public.vip_product_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();