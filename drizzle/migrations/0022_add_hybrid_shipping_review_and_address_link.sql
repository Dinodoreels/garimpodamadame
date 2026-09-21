ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_address_id uuid REFERENCES public.addresses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_shipping_address_id_idx ON public.orders(shipping_address_id);

ALTER TABLE public.melhor_envio_shipments
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS automation_mode text NOT NULL DEFAULT 'hybrid';

ALTER TABLE public.melhor_envio_shipments
  ADD CONSTRAINT melhor_envio_shipments_validation_status_check
  CHECK (validation_status IN ('awaiting_data','awaiting_invoice','ready','processing','purchased','label_ready','error'));

CREATE INDEX IF NOT EXISTS melhor_envio_shipments_validation_idx
  ON public.melhor_envio_shipments(validation_status, updated_at DESC);

CREATE OR REPLACE FUNCTION public.claim_melhor_envio_shipment(p_order_id uuid)
RETURNS public.melhor_envio_shipments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed public.melhor_envio_shipments;
BEGIN
  UPDATE public.melhor_envio_shipments
  SET validation_status = 'processing',
      processing_started_at = now(),
      updated_at = now()
  WHERE order_id = p_order_id
    AND purchased_at IS NULL
    AND validation_status = 'ready'
    AND (processing_started_at IS NULL OR processing_started_at < now() - interval '10 minutes')
  RETURNING * INTO claimed;
  RETURN claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_melhor_envio_shipment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_melhor_envio_shipment(uuid) TO service_role;