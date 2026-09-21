ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title TEXT, ADD COLUMN IF NOT EXISTS seo_description TEXT, ADD COLUMN IF NOT EXISTS social_image_url TEXT;
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS social_image_url TEXT;
ALTER TABLE public.promo_pages ADD COLUMN IF NOT EXISTS seo_title TEXT, ADD COLUMN IF NOT EXISTS seo_description TEXT, ADD COLUMN IF NOT EXISTS social_image_url TEXT;
ALTER TABLE public.product_kits ADD COLUMN IF NOT EXISTS seo_title TEXT, ADD COLUMN IF NOT EXISTS seo_description TEXT, ADD COLUMN IF NOT EXISTS social_image_url TEXT;

GRANT SELECT ON public.products, public.cms_pages, public.promo_pages, public.product_kits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products, public.cms_pages, public.promo_pages, public.product_kits, public.site_settings TO authenticated;
GRANT ALL ON public.products, public.cms_pages, public.promo_pages, public.product_kits, public.site_settings TO service_role;

DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.site_settings;
CREATE POLICY "Public can read non-sensitive settings"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY['about_content','contact_content','auth_page_config','releases','legal_terms','legal_privacy','legal_cookies','legal_entity','pixels_config','ai_config','vapid_public_key','free_shipping','email_campaign','storefront_navigation','seo_metadata']));