ALTER TABLE public.bling_import_runs
  ADD COLUMN IF NOT EXISTS decision text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS decision_reason text,
  ADD COLUMN IF NOT EXISTS decided_by uuid,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz;

ALTER TABLE public.bling_import_runs
  ADD CONSTRAINT bling_import_runs_decision_check
  CHECK (decision IN ('pending', 'approved', 'rejected'));

CREATE TABLE public.bling_import_run_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.bling_import_runs(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  reason text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.bling_import_run_decisions TO authenticated;
GRANT ALL ON public.bling_import_run_decisions TO service_role;
ALTER TABLE public.bling_import_run_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage Bling import decisions"
ON public.bling_import_run_decisions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND created_by = auth.uid());

CREATE INDEX idx_bling_import_run_decisions_run
ON public.bling_import_run_decisions(run_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bling_order_links_bling_order_unique
ON public.bling_order_links(bling_order_id);