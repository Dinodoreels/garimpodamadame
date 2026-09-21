ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'awaiting_separation',
  ADD COLUMN IF NOT EXISTS separation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS separated_at timestamptz,
  ADD COLUMN IF NOT EXISTS packed_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS fulfillment_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_queue
  ON public.orders (fulfillment_status, paid_at)
  WHERE paid_at IS NOT NULL;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_fulfillment_status_check
  CHECK (fulfillment_status IN ('awaiting_separation','separating','packed','posted','returned')) NOT VALID;