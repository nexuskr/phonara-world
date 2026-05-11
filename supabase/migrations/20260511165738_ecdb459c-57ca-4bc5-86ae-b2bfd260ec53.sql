CREATE OR REPLACE FUNCTION public.update_bot_ratio_phase()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dau int;
  v_low int;
  v_high int;
  v_enabled boolean;
  v_new_phase int;
BEGIN
  SELECT dau_threshold_low, dau_threshold_high, auto_phase_enabled
    INTO v_low, v_high, v_enabled
  FROM public.bot_settings WHERE id = 1;

  IF NOT v_enabled THEN RETURN; END IF;

  SELECT COUNT(DISTINCT p.id) INTO v_dau
  FROM public.profiles p
  WHERE p.last_seen_at >= now() - interval '24 hours'
    AND COALESCE(p.is_bot, false) = false;

  IF v_dau < v_low THEN
    v_new_phase := 1;
  ELSIF v_dau < v_high THEN
    v_new_phase := 2;
  ELSIF v_dau < v_high * 4 THEN
    v_new_phase := 3;
  ELSE
    v_new_phase := 4;
  END IF;

  UPDATE public.bot_settings
     SET bot_ratio_phase = v_new_phase,
         updated_at = now()
   WHERE id = 1 AND bot_ratio_phase <> v_new_phase;
END;
$$;

REVOKE ALL ON FUNCTION public.update_bot_ratio_phase() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_bot_ratio_phase() FROM anon, authenticated;