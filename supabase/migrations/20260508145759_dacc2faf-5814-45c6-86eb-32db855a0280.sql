CREATE OR REPLACE FUNCTION rule_verify_submission(p_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
  v_status text := 'valid';
  v_score int := 10;
  v_rules text := 'basic';
BEGIN
  SELECT * INTO v_sub FROM viral_mission_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission not found: %', p_submission_id;
  END IF;

  IF v_sub.proof_hash IS NULL THEN
    v_status := 'invalid';
    v_score  := 100;
    v_rules  := 'missing_proof';
  END IF;

  INSERT INTO viral_verification_log (
    submission_id, user_id, milestone,
    verification_status, risk_score, signals_initial, decided_by
  ) VALUES (
    p_submission_id, v_sub.user_id, NULL,
    v_status, v_score,
    jsonb_build_object(
      'rules_fired', v_rules,
      'risk_score',  v_score,
      'model_version','rule-v1',
      'decided_at',  now()
    ),
    'rule'
  )
  ON CONFLICT (submission_id) DO NOTHING;

  RETURN jsonb_build_object(
    'status', v_status,
    'risk_score', v_score,
    'submission_id', p_submission_id
  );
END $$;

REVOKE ALL ON FUNCTION rule_verify_submission(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION rule_verify_submission(uuid) TO service_role;