-- Prevent customers from mutating server-controlled financial and workflow fields.
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;

-- Cart contents and prices are recalculated by trusted checkout code; clients may replace carts,
-- but cannot update server-controlled discount/reminder columns.
DROP POLICY IF EXISTS "Users can update own abandoned carts" ON public.abandoned_carts;
CREATE OR REPLACE FUNCTION public.protect_abandoned_cart_server_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.discount_code IS DISTINCT FROM OLD.discount_code
       OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
       OR NEW.reminder_sent_at IS DISTINCT FROM OLD.reminder_sent_at
       OR NEW.reminder_count IS DISTINCT FROM OLD.reminder_count THEN
      RAISE EXCEPTION 'Protected abandoned cart fields cannot be changed by customers';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_abandoned_cart_server_fields ON public.abandoned_carts;
CREATE TRIGGER protect_abandoned_cart_server_fields
BEFORE UPDATE ON public.abandoned_carts FOR EACH ROW
EXECUTE FUNCTION public.protect_abandoned_cart_server_fields();
CREATE POLICY "Users can update own abandoned carts"
ON public.abandoned_carts FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.user_sessions;
CREATE POLICY "Visitors can insert unowned sessions"
ON public.user_sessions FOR INSERT TO anon
WITH CHECK (user_id IS NULL);
CREATE POLICY "Users can insert own sessions"
ON public.user_sessions FOR INSERT TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Remove direct API execution from every privileged function by default.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END $$;

-- Role checks are needed by RLS, but callers may only ask about their own identity.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (_user_id = auth.uid() OR auth.role() = 'service_role') AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;
CREATE OR REPLACE FUNCTION private.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (_user_id = auth.uid() OR auth.role() = 'service_role') AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = ANY(_roles)
  )
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_any_role(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_any_role(uuid, text[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private AS $$
  SELECT private.has_role(_user_id, _role)
$$;
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private AS $$
  SELECT private.has_any_role(_user_id, _roles)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) TO authenticated;

-- Public, narrowly scoped customer operations retained explicitly.
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_cookie_consent(text,text,text,boolean,boolean,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_legal_acceptance(text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_by_number(text) TO anon, authenticated;

ALTER FUNCTION public.validate_discount_code(text) SECURITY INVOKER;
ALTER FUNCTION public.record_cookie_consent(text,text,text,boolean,boolean,text) SECURITY INVOKER;
ALTER FUNCTION public.record_legal_acceptance(text,text,text,text,text) SECURITY INVOKER;
ALTER FUNCTION public.get_order_by_number(text) SECURITY INVOKER;