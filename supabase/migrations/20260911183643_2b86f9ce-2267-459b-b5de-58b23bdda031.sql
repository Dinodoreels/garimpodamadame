ALTER TABLE public.operators
  ADD COLUMN failed_login_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN locked_until timestamptz;

REVOKE INSERT ON public.inbound_items FROM authenticated;
REVOKE INSERT ON public.inbound_pendings FROM authenticated;