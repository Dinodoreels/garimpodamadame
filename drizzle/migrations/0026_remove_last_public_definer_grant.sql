REVOKE ALL ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO service_role;