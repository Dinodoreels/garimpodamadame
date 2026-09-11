REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_qc_inbound(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_stock_inbound(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_commerce_inbound(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_cd_manager(uuid) FROM anon;