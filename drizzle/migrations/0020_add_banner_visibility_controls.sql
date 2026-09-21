ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS show_title boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_subtitle boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_overlay boolean NOT NULL DEFAULT true;