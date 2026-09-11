
-- Helpers de permissão do módulo Inbound
CREATE OR REPLACE FUNCTION public.can_manage_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'gestor_cd'::public.app_role, 'inbound'::public.app_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'gestor_cd'::public.app_role, 'inbound'::public.app_role,
                   'qc'::public.app_role, 'estoque'::public.app_role, 'commerce'::public.app_role,
                   'viewer'::public.app_role, 'vendedor'::public.app_role)
  )
$$;

-- Recebimentos
CREATE TABLE public.truck_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  received_date date NOT NULL DEFAULT current_date,
  received_time time NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::time,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  origin_name text,
  carrier text,
  truck_plate text,
  driver_name text,
  document_number text,
  invoice_number text,
  estimated_quantity integer NOT NULL DEFAULT 0,
  lot_value numeric NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'open',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.truck_receipts TO authenticated;
GRANT ALL ON public.truck_receipts TO service_role;
ALTER TABLE public.truck_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inbound pode gerenciar recebimentos" ON public.truck_receipts
  FOR ALL TO authenticated
  USING (public.can_manage_inbound(auth.uid()))
  WITH CHECK (public.can_manage_inbound(auth.uid()));

CREATE POLICY "Equipe pode ver recebimentos" ON public.truck_receipts
  FOR SELECT TO authenticated
  USING (public.can_view_inbound(auth.uid()));

CREATE INDEX idx_truck_receipts_date ON public.truck_receipts (received_date DESC);
CREATE INDEX idx_truck_receipts_status ON public.truck_receipts (status);
CREATE INDEX idx_truck_receipts_supplier ON public.truck_receipts (supplier_id);

CREATE TRIGGER update_truck_receipts_updated_at BEFORE UPDATE ON public.truck_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lotes
CREATE TABLE public.lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  receipt_id uuid REFERENCES public.truck_receipts(id) ON DELETE CASCADE,
  description text,
  status text NOT NULL DEFAULT 'open',
  expected_units integer NOT NULL DEFAULT 0,
  processed_units integer NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lots TO authenticated;
GRANT ALL ON public.lots TO service_role;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inbound pode gerenciar lotes" ON public.lots
  FOR ALL TO authenticated
  USING (public.can_manage_inbound(auth.uid()))
  WITH CHECK (public.can_manage_inbound(auth.uid()));

CREATE POLICY "Equipe pode ver lotes" ON public.lots
  FOR SELECT TO authenticated
  USING (public.can_view_inbound(auth.uid()));

CREATE INDEX idx_lots_receipt ON public.lots (receipt_id);
CREATE INDEX idx_lots_status ON public.lots (status);

CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON public.lots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Anexos
CREATE TABLE public.receipt_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES public.truck_receipts(id) ON DELETE CASCADE,
  lot_id uuid REFERENCES public.lots(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'document',
  file_path text NOT NULL,
  file_name text,
  mime_type text,
  size_bytes bigint,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_attachments TO authenticated;
GRANT ALL ON public.receipt_attachments TO service_role;
ALTER TABLE public.receipt_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inbound pode gerenciar anexos" ON public.receipt_attachments
  FOR ALL TO authenticated
  USING (public.can_manage_inbound(auth.uid()))
  WITH CHECK (public.can_manage_inbound(auth.uid()));

CREATE POLICY "Equipe pode ver anexos" ON public.receipt_attachments
  FOR SELECT TO authenticated
  USING (public.can_view_inbound(auth.uid()));

CREATE INDEX idx_receipt_attachments_receipt ON public.receipt_attachments (receipt_id);
CREATE INDEX idx_receipt_attachments_lot ON public.receipt_attachments (lot_id);

-- Trilha de auditoria do módulo
CREATE TABLE public.inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  actor_id uuid,
  source text NOT NULL DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.inbound_events TO authenticated;
GRANT ALL ON public.inbound_events TO service_role;
ALTER TABLE public.inbound_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver eventos inbound" ON public.inbound_events
  FOR SELECT TO authenticated
  USING (public.can_view_inbound(auth.uid()));

CREATE POLICY "Inbound pode registrar eventos" ON public.inbound_events
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_inbound(auth.uid()) AND actor_id = auth.uid());

CREATE INDEX idx_inbound_events_entity ON public.inbound_events (entity_type, entity_id, created_at DESC);

-- Numeração automática
CREATE OR REPLACE FUNCTION public.next_receipt_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prefix text; n integer;
BEGIN
  prefix := 'REC-' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY') || '-';
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM char_length(prefix) + 1) AS integer)), 0) + 1
    INTO n FROM public.truck_receipts WHERE code LIKE prefix || '%';
  RETURN prefix || LPAD(n::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.next_lot_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prefix text; n integer;
BEGIN
  prefix := 'LOTE-' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY') || '-';
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM char_length(prefix) + 1) AS integer)), 0) + 1
    INTO n FROM public.lots WHERE code LIKE prefix || '%';
  RETURN prefix || LPAD(n::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_receipt_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := public.next_receipt_code();
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_lot_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := public.next_lot_code();
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_receipt_code BEFORE INSERT ON public.truck_receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_receipt_code();

CREATE TRIGGER trg_set_lot_code BEFORE INSERT ON public.lots
  FOR EACH ROW EXECUTE FUNCTION public.set_lot_code();
