
-- 1) imperial_rollout_phases: add tier, cap, activated_at + backfill
ALTER TABLE public.imperial_rollout_phases
  ADD COLUMN IF NOT EXISTS tier integer,
  ADD COLUMN IF NOT EXISTS cap bigint,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

UPDATE public.imperial_rollout_phases
   SET tier = COALESCE(tier, CASE phase
                                WHEN 1 THEN 1
                                WHEN 2 THEN 2
                                WHEN 3 THEN 3
                                WHEN 4 THEN 3
                              END),
       cap = COALESCE(cap, CASE phase
                              WHEN 1 THEN 50000
                              WHEN 2 THEN 250000
                              ELSE NULL
                            END),
       activated_at = COALESCE(activated_at, started_at);

-- 2) Overload: imperial_rollout_activate(_phase, _activated_by, _notes)
CREATE OR REPLACE FUNCTION public.imperial_rollout_activate(
  _phase integer,
  _activated_by uuid,
  _notes text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
  v_tier int;
  v_cap bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  IF _phase < 0 OR _phase > 4 THEN
    RAISE EXCEPTION 'invalid phase';
  END IF;

  v_tier := CASE _phase WHEN 0 THEN 0 WHEN 1 THEN 1 WHEN 2 THEN 2 ELSE 3 END;
  v_cap  := CASE _phase WHEN 0 THEN 0 WHEN 1 THEN 50000 WHEN 2 THEN 250000 ELSE NULL END;

  -- close any active phase
  UPDATE public.imperial_rollout_phases
     SET status = 'completed', ended_at = now()
   WHERE status = 'active';

  -- phase 0 = rollback marker (no new active row needed; just record event)
  IF _phase = 0 THEN
    PERFORM public.imperial_log_observability(
      'rollout_rolled_back', 'warn',
      'rollback:'||to_char(now(),'YYYYMMDDHH24MI'),
      jsonb_build_object('actor', _activated_by, 'notes', _notes)
    );
    RETURN 0;
  END IF;

  INSERT INTO public.imperial_rollout_phases
    (phase, status, started_by, notes, metrics_snapshot, tier, cap, activated_at)
  VALUES
    (_phase, 'active', COALESCE(_activated_by, auth.uid()), _notes, '{}'::jsonb, v_tier, v_cap, now())
  RETURNING id INTO v_id;

  PERFORM public.imperial_log_observability(
    'rollout_phase_activated', 'info',
    'phase:'||_phase||':'||to_char(now(),'YYYYMMDDHH24MI'),
    jsonb_build_object('phase', _phase, 'tier', v_tier, 'cap', v_cap, 'actor', _activated_by, 'notes', _notes)
  );

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.imperial_rollout_activate(integer, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.imperial_rollout_activate(integer, uuid, text) TO authenticated;

-- 3) Overload: imperial_log_observability(_event, _payload)
CREATE OR REPLACE FUNCTION public.imperial_log_observability(
  _event text,
  _payload jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.imperial_log_observability(_event, 'info', NULL, COALESCE(_payload,'{}'::jsonb));
$$;

REVOKE ALL ON FUNCTION public.imperial_log_observability(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.imperial_log_observability(text, jsonb) TO authenticated;
