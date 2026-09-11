CREATE OR REPLACE FUNCTION public.increment_lot_processed_units(target_lot_id uuid, units_to_add integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.lots
  SET processed_units = processed_units + GREATEST(units_to_add, 1),
      status = 'processing'
  WHERE id = target_lot_id
    AND status IN ('open', 'processing');
$$;

REVOKE ALL ON FUNCTION public.increment_lot_processed_units(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_lot_processed_units(uuid, integer) TO service_role;