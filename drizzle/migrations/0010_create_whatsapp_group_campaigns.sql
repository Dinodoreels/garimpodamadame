CREATE TABLE public.whatsapp_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  group_identifier text NOT NULL UNIQUE CHECK (char_length(btrim(group_identifier)) BETWEEN 5 AND 200),
  provider text NOT NULL CHECK (provider IN ('evolution','wppconnect','uazapi')),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_groups TO authenticated;
GRANT ALL ON public.whatsapp_groups TO service_role;
ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage WhatsApp groups" ON public.whatsapp_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER whatsapp_groups_updated_at BEFORE UPDATE ON public.whatsapp_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.whatsapp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  message_body text NOT NULL CHECK (char_length(btrim(message_body)) BETWEEN 1 AND 4000),
  link_url text,
  media_url text,
  media_type text CHECK (media_type IS NULL OR media_type IN ('image','video')),
  discount_code_id uuid REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','processing','sent','partial','failed','cancelled')),
  scheduled_for timestamptz,
  processing_started_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status <> 'scheduled') OR scheduled_for IS NOT NULL),
  CHECK ((media_url IS NULL AND media_type IS NULL) OR (media_url IS NOT NULL AND media_type IS NOT NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_campaigns TO authenticated;
GRANT ALL ON public.whatsapp_campaigns TO service_role;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage WhatsApp campaigns" ON public.whatsapp_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX whatsapp_campaigns_due_idx ON public.whatsapp_campaigns(status, scheduled_for);
CREATE TRIGGER whatsapp_campaigns_updated_at BEFORE UPDATE ON public.whatsapp_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.whatsapp_campaign_products (
  campaign_id uuid NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  PRIMARY KEY (campaign_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.whatsapp_campaign_products TO authenticated;
GRANT ALL ON public.whatsapp_campaign_products TO service_role;
ALTER TABLE public.whatsapp_campaign_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage WhatsApp campaign products" ON public.whatsapp_campaign_products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.whatsapp_campaign_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.whatsapp_groups(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  rendered_message text,
  provider_message_id text,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, group_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_campaign_targets TO authenticated;
GRANT ALL ON public.whatsapp_campaign_targets TO service_role;
ALTER TABLE public.whatsapp_campaign_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage WhatsApp campaign targets" ON public.whatsapp_campaign_targets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX whatsapp_campaign_targets_status_idx ON public.whatsapp_campaign_targets(campaign_id, status);
CREATE TRIGGER whatsapp_campaign_targets_updated_at BEFORE UPDATE ON public.whatsapp_campaign_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.whatsapp_campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  target_id uuid REFERENCES public.whatsapp_campaign_targets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_campaign_events TO authenticated;
GRANT ALL ON public.whatsapp_campaign_events TO service_role;
ALTER TABLE public.whatsapp_campaign_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view WhatsApp campaign events" ON public.whatsapp_campaign_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX whatsapp_campaign_events_campaign_created_idx ON public.whatsapp_campaign_events(campaign_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.claim_whatsapp_campaign(p_campaign_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_id uuid;
BEGIN
  SELECT c.id INTO claimed_id
  FROM public.whatsapp_campaigns c
  WHERE (p_campaign_id IS NULL OR c.id = p_campaign_id)
    AND (
      (c.status = 'scheduled' AND c.scheduled_for <= now())
      OR (c.status = 'processing' AND c.processing_started_at < now() - interval '10 minutes')
    )
  ORDER BY c.scheduled_for NULLS FIRST, c.created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF claimed_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.whatsapp_campaigns
  SET status = 'processing', processing_started_at = now(), last_error = NULL, updated_at = now()
  WHERE id = claimed_id;

  UPDATE public.whatsapp_campaign_targets
  SET status = 'pending', updated_at = now()
  WHERE campaign_id = claimed_id AND status = 'processing';

  RETURN claimed_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_whatsapp_campaign(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_campaign(uuid) TO service_role;