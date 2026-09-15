CREATE TABLE public.marketplace_shipping_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  bling_order_id text NOT NULL,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'unavailable', 'error')),
  format text NOT NULL DEFAULT 'PDF' CHECK (format IN ('PDF', 'ZPL')),
  label_url text,
  provider_note text,
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  last_checked_at timestamptz,
  printed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_shipping_labels TO authenticated;
GRANT ALL ON public.marketplace_shipping_labels TO service_role;
ALTER TABLE public.marketplace_shipping_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketplace shipping labels"
ON public.marketplace_shipping_labels
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX marketplace_shipping_labels_status_checked_idx
ON public.marketplace_shipping_labels(status, last_checked_at);
CREATE TRIGGER marketplace_shipping_labels_updated_at
BEFORE UPDATE ON public.marketplace_shipping_labels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_shipping_labels;