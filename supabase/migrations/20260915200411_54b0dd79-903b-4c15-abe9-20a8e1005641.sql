ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_provider text,
  ADD COLUMN IF NOT EXISTS shipping_carrier text,
  ADD COLUMN IF NOT EXISTS shipping_service text,
  ADD COLUMN IF NOT EXISTS shipping_service_code text,
  ADD COLUMN IF NOT EXISTS shipping_estimated_days integer,
  ADD COLUMN IF NOT EXISTS shipping_original_cost numeric(12,2),
  ADD COLUMN IF NOT EXISTS shipping_quote_data jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.melhor_envio_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'website' CHECK (source = 'website'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','cart','purchased','label_generated','posted','in_transit','delivered','cancelled','error')),
  service_code text NOT NULL,
  carrier text,
  service text,
  external_cart_id text,
  external_order_id text,
  external_protocol text,
  tracking_code text,
  tracking_url text,
  label_url text,
  label_format text,
  price numeric(12,2),
  insurance_value numeric(12,2),
  package_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  sender_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipient_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  purchased_at timestamptz,
  label_generated_at timestamptz,
  posted_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
GRANT SELECT ON public.melhor_envio_shipments TO authenticated;
GRANT ALL ON public.melhor_envio_shipments TO service_role;
ALTER TABLE public.melhor_envio_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage Melhor Envio shipments"
  ON public.melhor_envio_shipments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Warehouse roles view Melhor Envio shipments"
  ON public.melhor_envio_shipments FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gestor_cd','estoque']));

CREATE TABLE public.melhor_envio_shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.melhor_envio_shipments(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text,
  message text,
  request_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_event_id text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.melhor_envio_shipment_events TO authenticated;
GRANT ALL ON public.melhor_envio_shipment_events TO service_role;
ALTER TABLE public.melhor_envio_shipment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage Melhor Envio shipment events"
  ON public.melhor_envio_shipment_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Warehouse roles view Melhor Envio shipment events"
  ON public.melhor_envio_shipment_events FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gestor_cd','estoque']));

CREATE INDEX melhor_envio_shipments_status_idx ON public.melhor_envio_shipments(status, updated_at DESC);
CREATE INDEX melhor_envio_shipment_events_shipment_idx ON public.melhor_envio_shipment_events(shipment_id, created_at DESC);
CREATE INDEX melhor_envio_shipment_events_order_idx ON public.melhor_envio_shipment_events(order_id, created_at DESC);
CREATE UNIQUE INDEX melhor_envio_shipment_events_provider_event_uidx
  ON public.melhor_envio_shipment_events(provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE TRIGGER update_melhor_envio_shipments_updated_at
  BEFORE UPDATE ON public.melhor_envio_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.melhor_envio_shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.melhor_envio_shipment_events;