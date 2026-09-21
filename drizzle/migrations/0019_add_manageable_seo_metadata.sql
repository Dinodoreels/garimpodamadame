ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title TEXT, ADD COLUMN IF NOT EXISTS seo_description TEXT, ADD COLUMN IF NOT EXISTS social_image_url TEXT;
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS social_image_url TEXT;
ALTER TABLE public.promo_pages ADD COLUMN IF NOT EXISTS seo_title TEXT, ADD COLUMN IF NOT EXISTS seo_description TEXT, ADD COLUMN IF NOT EXISTS social_image_url TEXT;
ALTER TABLE public.product_kits ADD COLUMN IF NOT EXISTS seo_title TEXT, ADD COLUMN IF NOT EXISTS seo_description TEXT, ADD COLUMN IF NOT EXISTS social_image_url TEXT;

DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.site_settings;
CREATE POLICY "Public can read non-sensitive settings"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY['about_content','contact_content','auth_page_config','releases','legal_terms','legal_privacy','legal_cookies','legal_entity','pixels_config','ai_config','vapid_public_key','free_shipping','email_campaign','storefront_navigation','seo_metadata']));