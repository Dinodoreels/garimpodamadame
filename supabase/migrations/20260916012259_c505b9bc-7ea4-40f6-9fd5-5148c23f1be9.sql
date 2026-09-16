ALTER FUNCTION public.calculate_product_catalog_readiness(uuid) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.calculate_product_catalog_readiness(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_product_catalog_readiness(uuid) TO authenticated, service_role;