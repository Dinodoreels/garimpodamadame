ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_lote boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_products_is_lote ON public.products (is_lote) WHERE is_lote = true;