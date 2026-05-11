
INSERT INTO public.achievements_catalog (key, name, description, category, ap, reward_credit, badge_tier, sort_order)
VALUES ('guide_master', '가이드 마스터', '풀스크린 가이드 7단계를 완주하고 +5,000원 보너스를 수령했습니다.', 'onboard', 100, 5000, 'silver', 5)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.complete_guide_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_already boolean;
  v_bonus bigint := 5000;
  v_new_balance bigint;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = v_uid AND achievement_key = 'guide_master'
  ) INTO v_already;

  IF v_already THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  INSERT INTO public.wallet_balances (user_id) VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.wallet_balances
  SET available_balance = available_balance + v_bonus,
      total_balance     = total_balance     + v_bonus,
      today_earned      = today_earned      + v_bonus,
      monthly_earned    = monthly_earned    + v_bonus,
      updated_at        = now()
  WHERE user_id = v_uid
  RETURNING available_balance INTO v_new_balance;

  INSERT INTO public.user_achievements (user_id, achievement_key, unlocked_at)
  VALUES (v_uid, 'guide_master', now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_onboarding_progress (user_id, flow, step, data, completed_at)
  VALUES (v_uid, 'guide', 7, jsonb_build_object('bonus_paid', v_bonus), now())
  ON CONFLICT (user_id, flow) DO UPDATE
    SET step = 7, completed_at = now(), data = EXCLUDED.data;

  RETURN jsonb_build_object(
    'ok', true,
    'bonus', v_bonus,
    'available_balance', v_new_balance,
    'achievement', 'guide_master'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_guide_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_guide_bonus() TO authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES ('complete_guide_bonus', '', ARRAY['authenticated']::text[], 'onboarding', 'Guide 7씬 완주 시 +5,000원 1회 지급 + guide_master 업적')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles,
      note = EXCLUDED.note,
      updated_at = now();
