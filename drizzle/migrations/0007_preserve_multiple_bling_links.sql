DROP INDEX IF EXISTS public.bling_product_links_product_variant_key;
DROP INDEX IF EXISTS public.bling_product_links_product_variant_unique;
CREATE UNIQUE INDEX IF NOT EXISTS bling_product_links_remote_id_unique
  ON public.bling_product_links (bling_product_id)
  WHERE bling_product_id IS NOT NULL;