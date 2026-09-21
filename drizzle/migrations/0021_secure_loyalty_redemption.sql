CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_order_id uuid,
  p_user_id uuid,
  p_points integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
  order_owner uuid;
BEGIN
  IF p_points <= 0 THEN
    RAISE EXCEPTION 'Quantidade de pontos inválida';
  END IF;

  SELECT user_id INTO order_owner
  FROM public.orders
  WHERE id = p_order_id;

  IF order_owner IS NULL OR order_owner <> p_user_id THEN
    RAISE EXCEPTION 'Pedido inválido para resgate de pontos';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.loyalty_transactions
    WHERE order_id = p_order_id AND type = 'redeem'
  ) THEN
    RETURN;
  END IF;

  SELECT balance INTO current_balance
  FROM public.loyalty_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_balance IS NULL OR current_balance < p_points THEN
    RAISE EXCEPTION 'Saldo de pontos insuficiente';
  END IF;

  UPDATE public.loyalty_points
  SET balance = balance - p_points,
      total_redeemed = total_redeemed + p_points,
      updated_at = now(),
      last_activity_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.loyalty_transactions (user_id, order_id, type, points, description)
  SELECT p_user_id, p_order_id, 'redeem', -p_points, 'Resgate - Pedido #' || orders.order_number
  FROM public.orders
  WHERE orders.id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_loyalty_points(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(uuid, uuid, integer) TO service_role;