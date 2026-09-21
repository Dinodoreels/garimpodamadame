ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS provider_refund_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS confirmed_amount numeric,
  ADD COLUMN IF NOT EXISTS refund_type text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS workflow_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_error text;

CREATE UNIQUE INDEX IF NOT EXISTS refunds_provider_refund_id_unique
  ON public.refunds(provider_refund_id)
  WHERE provider_refund_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS refunds_idempotency_key_unique
  ON public.refunds(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS refunds_order_status_idx
  ON public.refunds(order_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.claim_refund_processing(
  p_refund_id uuid,
  p_actor_id uuid
) RETURNS public.refunds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund public.refunds%ROWTYPE;
BEGIN
  IF NOT public.has_role(p_actor_id, 'admin') THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  SELECT * INTO v_refund
  FROM public.refunds
  WHERE id = p_refund_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REFUND_NOT_FOUND';
  END IF;

  IF v_refund.status NOT IN ('pending', 'failed') THEN
    RETURN v_refund;
  END IF;

  UPDATE public.refunds
  SET status = 'processing',
      processed_by = p_actor_id,
      processed_at = now(),
      updated_at = now(),
      last_error = NULL,
      idempotency_key = COALESCE(idempotency_key, 'refund-' || id::text)
  WHERE id = p_refund_id
  RETURNING * INTO v_refund;

  RETURN v_refund;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_refund_processing(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_refund_processing(uuid, uuid) TO service_role;