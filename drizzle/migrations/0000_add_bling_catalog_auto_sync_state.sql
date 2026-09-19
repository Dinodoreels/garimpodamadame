ALTER TABLE public.bling_config
  ADD COLUMN IF NOT EXISTS last_catalog_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_catalog_sync_summary jsonb,
  ADD COLUMN IF NOT EXISTS catalog_sync_locked_until timestamptz;

CREATE OR REPLACE FUNCTION public.claim_bling_catalog_sync()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed boolean;
BEGIN
  UPDATE public.bling_config
  SET catalog_sync_locked_until = now() + interval '10 minutes'
  WHERE id = (SELECT id FROM public.bling_config LIMIT 1)
    AND (catalog_sync_locked_until IS NULL OR catalog_sync_locked_until < now())
  RETURNING true INTO claimed;
  RETURN COALESCE(claimed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_bling_catalog_sync()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.bling_config SET catalog_sync_locked_until = NULL
  WHERE id = (SELECT id FROM public.bling_config LIMIT 1);
$$;

REVOKE ALL ON FUNCTION public.claim_bling_catalog_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_bling_catalog_sync() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bling_catalog_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public.release_bling_catalog_sync() TO service_role;