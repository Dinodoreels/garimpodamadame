ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS external_order_key text,
  ADD COLUMN IF NOT EXISTS stock_accounting_started_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_external_order_key_unique
  ON public.orders (external_order_key)
  WHERE external_order_key IS NOT NULL;

CREATE TABLE public.order_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN ('debit', 'return')),
  quantity integer NOT NULL CHECK (quantity > 0),
  cycle_number integer NOT NULL CHECK (cycle_number > 0),
  previous_quantity integer NOT NULL CHECK (previous_quantity >= 0),
  resulting_quantity integer NOT NULL CHECK (resulting_quantity >= 0),
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_item_id, movement_type, cycle_number)
);

GRANT SELECT ON public.order_stock_movements TO authenticated;
GRANT ALL ON public.order_stock_movements TO service_role;

ALTER TABLE public.order_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view order stock movements"
ON public.order_stock_movements
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS order_stock_movements_order_id_idx
  ON public.order_stock_movements(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_stock_movements_variant_id_idx
  ON public.order_stock_movements(variant_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.apply_order_stock_transition(
  p_order_id uuid,
  p_source text DEFAULT 'order_sync'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item record;
  v_variant public.product_variants%ROWTYPE;
  v_accounted integer;
  v_target integer;
  v_delta integer;
  v_cycle integer;
  v_processed integer := 0;
  v_pending jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order.stock_accounting_started_at IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'blocked', true,
      'reason', 'legacy_untracked',
      'processed', 0,
      'pending', jsonb_build_array(jsonb_build_object('order_id', p_order_id, 'reason', 'Pedido anterior ao controle automático de estoque'))
    );
  END IF;

  v_target := CASE
    WHEN v_order.status IN ('paid', 'processing', 'shipped', 'delivered') THEN 1
    ELSE 0
  END;

  FOR v_item IN
    SELECT oi.id, oi.variant_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
    ORDER BY oi.id
  LOOP
    IF v_item.variant_id IS NULL THEN
      v_pending := v_pending || jsonb_build_array(jsonb_build_object(
        'order_item_id', v_item.id,
        'reason', 'Item sem vínculo com uma variante do estoque'
      ));
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(CASE WHEN movement_type = 'debit' THEN quantity ELSE -quantity END), 0)::integer
      INTO v_accounted
    FROM public.order_stock_movements
    WHERE order_item_id = v_item.id;

    v_delta := (v_target * GREATEST(v_item.quantity, 0)) - v_accounted;
    IF v_delta = 0 THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_variant
    FROM public.product_variants
    WHERE id = v_item.variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      v_pending := v_pending || jsonb_build_array(jsonb_build_object(
        'order_item_id', v_item.id,
        'variant_id', v_item.variant_id,
        'reason', 'Variante não encontrada'
      ));
      CONTINUE;
    END IF;

    IF v_delta > 0 THEN
      IF COALESCE(v_variant.inventory_quantity, 0) < v_delta THEN
        v_pending := v_pending || jsonb_build_array(jsonb_build_object(
          'order_item_id', v_item.id,
          'variant_id', v_item.variant_id,
          'required', v_delta,
          'available', COALESCE(v_variant.inventory_quantity, 0),
          'reason', 'Estoque insuficiente para contabilizar a venda'
        ));
        CONTINUE;
      END IF;

      SELECT COALESCE(MAX(cycle_number), 0) + 1 INTO v_cycle
      FROM public.order_stock_movements
      WHERE order_item_id = v_item.id AND movement_type = 'debit';

      UPDATE public.product_variants
      SET inventory_quantity = inventory_quantity - v_delta
      WHERE id = v_item.variant_id;

      INSERT INTO public.order_stock_movements (
        order_id, order_item_id, variant_id, movement_type, quantity,
        cycle_number, previous_quantity, resulting_quantity, source
      ) VALUES (
        p_order_id, v_item.id, v_item.variant_id, 'debit', v_delta,
        v_cycle, v_variant.inventory_quantity, v_variant.inventory_quantity - v_delta, p_source
      );
    ELSE
      SELECT COALESCE(MAX(cycle_number), 0) + 1 INTO v_cycle
      FROM public.order_stock_movements
      WHERE order_item_id = v_item.id AND movement_type = 'return';

      UPDATE public.product_variants
      SET inventory_quantity = inventory_quantity + ABS(v_delta)
      WHERE id = v_item.variant_id;

      INSERT INTO public.order_stock_movements (
        order_id, order_item_id, variant_id, movement_type, quantity,
        cycle_number, previous_quantity, resulting_quantity, source
      ) VALUES (
        p_order_id, v_item.id, v_item.variant_id, 'return', ABS(v_delta),
        v_cycle, v_variant.inventory_quantity, v_variant.inventory_quantity + ABS(v_delta), p_source
      );
    END IF;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', jsonb_array_length(v_pending) = 0,
    'blocked', jsonb_array_length(v_pending) > 0,
    'processed', v_processed,
    'pending', v_pending,
    'status', v_order.status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_order_stock_transition(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_order_stock_transition(uuid, text) TO service_role;