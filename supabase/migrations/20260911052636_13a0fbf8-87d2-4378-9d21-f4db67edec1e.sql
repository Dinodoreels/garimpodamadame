
REVOKE ALL ON FUNCTION public.next_receipt_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_lot_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_receipt_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_lot_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_manage_inbound(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_inbound(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_inbound(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_inbound(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_receipt_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.next_lot_code() TO service_role;
