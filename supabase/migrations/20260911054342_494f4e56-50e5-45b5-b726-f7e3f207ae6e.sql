-- Helpers de perfil
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_qc_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(_user_id, ARRAY['admin','gestor_cd','qc'])
$$;

CREATE OR REPLACE FUNCTION public.can_stock_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(_user_id, ARRAY['admin','gestor_cd','estoque'])
$$;

CREATE OR REPLACE FUNCTION public.can_commerce_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(_user_id, ARRAY['admin','gestor_cd','commerce'])
$$;

CREATE OR REPLACE FUNCTION public.is_cd_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(_user_id, ARRAY['admin','gestor_cd'])
$$;

-- Itens bipados
CREATE TABLE public.inbound_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid REFERENCES public.lots(id) ON DELETE SET NULL,
  receipt_id uuid REFERENCES public.truck_receipts(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'IDENTIFIED',
  condition_code text NOT NULL DEFAULT 'T1',
  barcode text,
  quantity integer NOT NULL DEFAULT 1,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  sku text,
  title text,
  brand text,
  category text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  photo_path text,
  ai_source text,
  ai_confidence numeric,
  ai_data jsonb,
  cost numeric,
  suggested_price numeric,
  notes text,
  operator_code text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbound_items TO authenticated;
GRANT ALL ON public.inbound_items TO service_role;
ALTER TABLE public.inbound_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbound_items_view" ON public.inbound_items FOR SELECT TO authenticated
  USING (public.can_view_inbound(auth.uid()));
CREATE POLICY "inbound_items_insert" ON public.inbound_items FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_inbound(auth.uid()));
CREATE POLICY "inbound_items_update" ON public.inbound_items FOR UPDATE TO authenticated
  USING (
    public.can_manage_inbound(auth.uid())
    OR public.can_qc_inbound(auth.uid())
    OR public.can_stock_inbound(auth.uid())
    OR public.can_commerce_inbound(auth.uid())
  )
  WITH CHECK (
    public.can_manage_inbound(auth.uid())
    OR public.can_qc_inbound(auth.uid())
    OR public.can_stock_inbound(auth.uid())
    OR public.can_commerce_inbound(auth.uid())
  );
CREATE POLICY "inbound_items_delete" ON public.inbound_items FOR DELETE TO authenticated
  USING (public.is_cd_manager(auth.uid()));

CREATE INDEX idx_inbound_items_lot ON public.inbound_items(lot_id);
CREATE INDEX idx_inbound_items_receipt ON public.inbound_items(receipt_id);
CREATE INDEX idx_inbound_items_state ON public.inbound_items(state);
CREATE INDEX idx_inbound_items_barcode ON public.inbound_items(barcode);
CREATE INDEX idx_inbound_items_created ON public.inbound_items(created_at DESC);

CREATE TRIGGER trg_inbound_items_updated_at BEFORE UPDATE ON public.inbound_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pendências
CREATE TABLE public.inbound_pendings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.inbound_items(id) ON DELETE CASCADE,
  lot_id uuid REFERENCES public.lots(id) ON DELETE SET NULL,
  reason text NOT NULL DEFAULT 'low_confidence',
  status text NOT NULL DEFAULT 'open',
  ai_suggestions jsonb,
  resolution text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbound_pendings TO authenticated;
GRANT ALL ON public.inbound_pendings TO service_role;
ALTER TABLE public.inbound_pendings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbound_pendings_view" ON public.inbound_pendings FOR SELECT TO authenticated
  USING (public.can_view_inbound(auth.uid()));
CREATE POLICY "inbound_pendings_insert" ON public.inbound_pendings FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_inbound(auth.uid()));
CREATE POLICY "inbound_pendings_update" ON public.inbound_pendings FOR UPDATE TO authenticated
  USING (public.can_manage_inbound(auth.uid()) OR public.can_qc_inbound(auth.uid()))
  WITH CHECK (public.can_manage_inbound(auth.uid()) OR public.can_qc_inbound(auth.uid()));
CREATE POLICY "inbound_pendings_delete" ON public.inbound_pendings FOR DELETE TO authenticated
  USING (public.is_cd_manager(auth.uid()));

CREATE INDEX idx_inbound_pendings_status ON public.inbound_pendings(status);
CREATE INDEX idx_inbound_pendings_lot ON public.inbound_pendings(lot_id);

CREATE TRIGGER trg_inbound_pendings_updated_at BEFORE UPDATE ON public.inbound_pendings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Operadores do galpão
CREATE TABLE public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  pin_hash text NOT NULL,
  role text NOT NULL DEFAULT 'inbound',
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operators TO authenticated;
GRANT ALL ON public.operators TO service_role;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operators_manage" ON public.operators FOR ALL TO authenticated
  USING (public.is_cd_manager(auth.uid()))
  WITH CHECK (public.is_cd_manager(auth.uid()));

CREATE TRIGGER trg_operators_updated_at BEFORE UPDATE ON public.operators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sessões do tablet
CREATE TABLE public.operator_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.operator_sessions TO authenticated;
GRANT ALL ON public.operator_sessions TO service_role;
ALTER TABLE public.operator_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operator_sessions_view" ON public.operator_sessions FOR SELECT TO authenticated
  USING (public.is_cd_manager(auth.uid()));

CREATE INDEX idx_operator_sessions_expires ON public.operator_sessions(expires_at);