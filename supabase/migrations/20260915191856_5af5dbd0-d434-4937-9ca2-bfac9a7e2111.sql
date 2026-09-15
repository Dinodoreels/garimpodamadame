ALTER TABLE public.fiscal_settings
  ADD COLUMN IF NOT EXISTS fiscal_environment text NOT NULL DEFAULT 'test' CHECK (fiscal_environment IN ('test','live')),
  ADD COLUMN IF NOT EXISTS homologation_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS production_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.fiscal_documents
  ADD COLUMN IF NOT EXISTS fiscal_environment text NOT NULL DEFAULT 'test' CHECK (fiscal_environment IN ('test','live')),
  ADD COLUMN IF NOT EXISTS validation_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

CREATE INDEX IF NOT EXISTS fiscal_documents_validated_at_idx
  ON public.fiscal_documents(validated_at DESC);