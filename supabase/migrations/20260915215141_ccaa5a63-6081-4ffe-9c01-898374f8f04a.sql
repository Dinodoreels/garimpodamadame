CREATE TABLE public.melhor_envio_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  oauth_state text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  account_name text,
  account_email text,
  connected_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.melhor_envio_config TO service_role;
ALTER TABLE public.melhor_envio_config ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_melhor_envio_config_updated_at
BEFORE UPDATE ON public.melhor_envio_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.melhor_envio_config (singleton) VALUES (true);