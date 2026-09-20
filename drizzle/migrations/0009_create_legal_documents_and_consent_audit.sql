CREATE TABLE public.legal_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key text NOT NULL CHECK (document_key IN ('terms', 'privacy', 'cookies')),
  version text NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (document_key, version)
);

GRANT SELECT ON public.legal_document_versions TO anon, authenticated;
GRANT ALL ON public.legal_document_versions TO service_role;

ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read legal document versions"
ON public.legal_document_versions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can create legal document versions"
ON public.legal_document_versions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_legal_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_key text NOT NULL CHECK (document_key IN ('terms', 'privacy')),
  document_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('signup', 'login', 'google', 'reauthentication', 'account')),
  session_id text,
  user_agent text,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_key, document_version)
);

GRANT SELECT ON public.user_legal_consents TO authenticated;
GRANT ALL ON public.user_legal_consents TO service_role;

ALTER TABLE public.user_legal_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own legal consents"
ON public.user_legal_consents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all legal consents"
ON public.user_legal_consents
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.cookie_consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL,
  policy_version text NOT NULL,
  action text NOT NULL CHECK (action IN ('accept_all', 'reject_optional', 'customize')),
  essential boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  user_agent text,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cookie_consent_log TO authenticated;
GRANT ALL ON public.cookie_consent_log TO service_role;

ALTER TABLE public.cookie_consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own cookie choices"
ON public.cookie_consent_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all cookie choices"
ON public.cookie_consent_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_legal_acceptance(
  p_terms_version text,
  p_privacy_version text,
  p_source text DEFAULT 'login',
  p_session_id text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_terms_version IS NULL OR btrim(p_terms_version) = '' OR p_privacy_version IS NULL OR btrim(p_privacy_version) = '' THEN
    RAISE EXCEPTION 'Document versions are required';
  END IF;
  IF p_source NOT IN ('signup', 'login', 'google', 'reauthentication', 'account') THEN
    RAISE EXCEPTION 'Invalid acceptance source';
  END IF;

  INSERT INTO public.user_legal_consents (user_id, document_key, document_version, source, session_id, user_agent, ip_address)
  VALUES
    (current_user_id, 'terms', p_terms_version, p_source, left(p_session_id, 200), left(p_user_agent, 500), inet_client_addr()),
    (current_user_id, 'privacy', p_privacy_version, p_source, left(p_session_id, 200), left(p_user_agent, 500), inet_client_addr())
  ON CONFLICT (user_id, document_key, document_version) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_legal_acceptance(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_legal_acceptance(text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_cookie_consent(
  p_session_id text,
  p_policy_version text,
  p_action text,
  p_analytics boolean,
  p_marketing boolean,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR btrim(p_session_id) = '' OR p_policy_version IS NULL OR btrim(p_policy_version) = '' THEN
    RAISE EXCEPTION 'Session and policy version are required';
  END IF;
  IF p_action NOT IN ('accept_all', 'reject_optional', 'customize') THEN
    RAISE EXCEPTION 'Invalid cookie action';
  END IF;

  INSERT INTO public.cookie_consent_log (
    user_id, session_id, policy_version, action, essential, analytics, marketing, user_agent, ip_address
  ) VALUES (
    auth.uid(), left(p_session_id, 200), p_policy_version, p_action, true,
    coalesce(p_analytics, false), coalesce(p_marketing, false), left(p_user_agent, 500), inet_client_addr()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_cookie_consent(text, text, text, boolean, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_cookie_consent(text, text, text, boolean, boolean, text) TO anon, authenticated;

CREATE INDEX user_legal_consents_user_created_idx ON public.user_legal_consents (user_id, created_at DESC);
CREATE INDEX user_legal_consents_document_version_idx ON public.user_legal_consents (document_key, document_version);
CREATE INDEX cookie_consent_log_user_created_idx ON public.cookie_consent_log (user_id, created_at DESC);
CREATE INDEX cookie_consent_log_session_created_idx ON public.cookie_consent_log (session_id, created_at DESC);

DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.site_settings;
CREATE POLICY "Public can read non-sensitive settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY['about_content'::text, 'contact_content'::text, 'auth_page_config'::text, 'releases'::text, 'legal_terms'::text, 'legal_privacy'::text, 'legal_cookies'::text, 'legal_entity'::text, 'pixels_config'::text, 'ai_config'::text, 'vapid_public_key'::text, 'free_shipping'::text, 'email_campaign'::text]));