ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mercadopago_payment_id text,
  ADD COLUMN IF NOT EXISTS mercadopago_preference_id text,
  ADD COLUMN IF NOT EXISTS payment_status_detail text,
  ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2);

CREATE UNIQUE INDEX IF NOT EXISTS orders_mercadopago_payment_id_unique
  ON public.orders (mercadopago_payment_id)
  WHERE mercadopago_payment_id IS NOT NULL;

CREATE TABLE public.fiscal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL DEFAULT '',
  trade_name text NOT NULL DEFAULT '',
  tax_id text NOT NULL DEFAULT '',
  state_registration text,
  municipal_registration text,
  tax_regime text NOT NULL DEFAULT '',
  street text NOT NULL DEFAULT '',
  number text NOT NULL DEFAULT '',
  complement text,
  neighborhood text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip_code text NOT NULL DEFAULT '',
  invoice_series text NOT NULL DEFAULT '1',
  operation_nature text NOT NULL DEFAULT 'Venda de mercadoria',
  auto_issue_paid_orders boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_settings TO authenticated;
GRANT ALL ON public.fiscal_settings TO service_role;
ALTER TABLE public.fiscal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fiscal settings" ON public.fiscal_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.fiscal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'bling' CHECK (provider = 'bling'),
  status text NOT NULL DEFAULT 'pending_data' CHECK (status IN ('pending_data','ready','processing','authorized','rejected','cancelled','error')),
  recipient_snapshot jsonb,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  bling_invoice_id text,
  invoice_number text,
  invoice_series text,
  access_key text,
  danfe_url text,
  xml_url text,
  error_message text,
  issued_at timestamptz,
  authorized_at timestamptz,
  requested_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_documents TO authenticated;
GRANT ALL ON public.fiscal_documents TO service_role;
ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fiscal documents" ON public.fiscal_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Warehouse can view authorized fiscal documents" ON public.fiscal_documents
  FOR SELECT TO authenticated
  USING (status = 'authorized' AND public.has_any_role(auth.uid(), ARRAY['gestor_cd','estoque','inbound']));

CREATE TABLE public.fiscal_document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_document_id uuid NOT NULL REFERENCES public.fiscal_documents(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL,
  message text,
  provider_payload jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.fiscal_document_events TO authenticated;
GRANT ALL ON public.fiscal_document_events TO service_role;
ALTER TABLE public.fiscal_document_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view fiscal history" ON public.fiscal_document_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins add fiscal history" ON public.fiscal_document_events
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Warehouse views authorized fiscal history" ON public.fiscal_document_events
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gestor_cd','estoque','inbound']) AND EXISTS (
    SELECT 1 FROM public.fiscal_documents d
    WHERE d.id = fiscal_document_id AND d.status = 'authorized'
  ));

CREATE INDEX fiscal_documents_status_idx ON public.fiscal_documents(status);
CREATE INDEX fiscal_document_events_document_idx ON public.fiscal_document_events(fiscal_document_id, created_at DESC);

CREATE TRIGGER update_fiscal_settings_updated_at
  BEFORE UPDATE ON public.fiscal_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fiscal_documents_updated_at
  BEFORE UPDATE ON public.fiscal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();