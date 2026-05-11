CREATE TABLE IF NOT EXISTS public.ab_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ab_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  experiment_key text NOT NULL,
  variant text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, experiment_key)
);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_user ON public.ab_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_exp ON public.ab_assignments(experiment_key);

ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ab_experiments_admin_all ON public.ab_experiments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY ab_assignments_self_read ON public.ab_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- variant resolver (idempotent assign + return)
CREATE OR REPLACE FUNCTION public.get_ab_variant(p_experiment_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exp public.ab_experiments%ROWTYPE;
  v_existing text;
  v_variants jsonb;
  v_total numeric := 0;
  v_pick numeric;
  v_acc numeric := 0;
  v_chosen text;
  v_item jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN 'control'; END IF;

  SELECT variant INTO v_existing
  FROM public.ab_assignments
  WHERE user_id = v_uid AND experiment_key = p_experiment_key;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  SELECT * INTO v_exp FROM public.ab_experiments
  WHERE experiment_key = p_experiment_key AND is_active = true;
  IF NOT FOUND THEN RETURN 'control'; END IF;

  v_variants := v_exp.variants;
  IF jsonb_typeof(v_variants) <> 'array' OR jsonb_array_length(v_variants) = 0 THEN
    RETURN 'control';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_variants) LOOP
    v_total := v_total + COALESCE((v_item->>'weight')::numeric, 1);
  END LOOP;
  IF v_total <= 0 THEN RETURN 'control'; END IF;

  v_pick := random() * v_total;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_variants) LOOP
    v_acc := v_acc + COALESCE((v_item->>'weight')::numeric, 1);
    IF v_pick <= v_acc THEN
      v_chosen := v_item->>'name';
      EXIT;
    END IF;
  END LOOP;
  v_chosen := COALESCE(v_chosen, 'control');

  INSERT INTO public.ab_assignments (user_id, experiment_key, variant)
  VALUES (v_uid, p_experiment_key, v_chosen)
  ON CONFLICT (user_id, experiment_key) DO NOTHING;

  RETURN v_chosen;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ab_variant(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ab_variant(text) TO authenticated, service_role;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES ('get_ab_variant', 'text', ARRAY['authenticated','service_role']::text[], 'experimentation',
        'P7-B: stable A/B variant resolver with weighted random assignment + idempotent persist.')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles, category = EXCLUDED.category,
      note = EXCLUDED.note, updated_at = now();

INSERT INTO public.ab_experiments (experiment_key, label, description, variants, is_active)
VALUES (
  'bot_strength_v1',
  'Bot Seeding Strength A/B',
  'Test whether higher bot density increases first-deposit conversion.',
  '[{"name":"control","weight":50},{"name":"high","weight":50}]'::jsonb,
  false
)
ON CONFLICT (experiment_key) DO NOTHING;