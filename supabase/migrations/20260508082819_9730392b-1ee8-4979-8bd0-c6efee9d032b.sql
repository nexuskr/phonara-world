
-- ============ 1. NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notif_self_select ON public.notifications;
CREATE POLICY notif_self_select ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS notif_self_update ON public.notifications;
CREATE POLICY notif_self_update ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid, _kind text, _title text, _body text DEFAULT NULL, _payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.notifications(user_id, kind, title, body, payload)
    VALUES (_user_id, _kind, _title, _body, COALESCE(_payload,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.notify_user(uuid,text,text,text,jsonb) FROM public, anon, authenticated;

-- ============ 2. MISSION TEMPLATES ============
CREATE TABLE IF NOT EXISTS public.mission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  difficulty text NOT NULL DEFAULT 'EASY',
  reward_credit bigint NOT NULL DEFAULT 1000,
  reward_xp int NOT NULL DEFAULT 50,
  duration_minutes int NOT NULL DEFAULT 5,
  auto_approve boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  ai_prompt_seed text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mt_public_read ON public.mission_templates;
CREATE POLICY mt_public_read ON public.mission_templates FOR SELECT USING (active OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS mt_admin_write ON public.mission_templates;
CREATE POLICY mt_admin_write ON public.mission_templates FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- seed defaults
INSERT INTO public.mission_templates (key, title, description, category, difficulty, reward_credit, reward_xp, duration_minutes, auto_approve, ai_prompt_seed) VALUES
  ('daily_login_streak', '연속 출석 챌린지', '5일 연속 접속하기', 'attendance', 'EASY', 3000, 100, 5, true, 'login_streak'),
  ('first_deposit_warmup', '첫 입금 워밍업', '관심있는 패키지 살펴보기', 'deposit', 'EASY', 2000, 50, 10, true, 'browse_packages'),
  ('referral_blitz', '주간 추천 폭주', '이번 주 친구 1명 초대', 'referral', 'MEDIUM', 10000, 200, 60, true, 'invite_friend'),
  ('coin_master_path', '코인 마스터 길', '코인 입금 ₩50,000 누적', 'deposit', 'HARD', 15000, 300, 1440, false, 'coin_deposit')
ON CONFLICT (key) DO NOTHING;

-- ============ 3. AI GENERATED MISSIONS QUEUE ============
CREATE TABLE IF NOT EXISTS public.ai_generated_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_key text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  reward_credit bigint NOT NULL DEFAULT 0,
  reward_xp int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','claimed','expired','rejected')),
  ai_reasoning text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  claimed_at timestamptz,
  approved_by_admin uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aigm_user_status ON public.ai_generated_missions(user_id, status, expires_at DESC);
ALTER TABLE public.ai_generated_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aigm_self_select ON public.ai_generated_missions;
CREATE POLICY aigm_self_select ON public.ai_generated_missions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS aigm_admin_write ON public.ai_generated_missions;
CREATE POLICY aigm_admin_write ON public.ai_generated_missions FOR UPDATE
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_generated_missions;

CREATE OR REPLACE FUNCTION public.enqueue_ai_mission(
  _user_id uuid, _template_key text, _title text, _description text,
  _reward_credit bigint, _reward_xp int, _ai_reasoning text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tpl public.mission_templates%ROWTYPE; _id uuid; _status text;
BEGIN
  SELECT * INTO _tpl FROM public.mission_templates WHERE key = _template_key AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_template:%', _template_key; END IF;
  _status := CASE WHEN _tpl.auto_approve THEN 'approved' ELSE 'pending' END;
  INSERT INTO public.ai_generated_missions(user_id, template_key, title, description,
    reward_credit, reward_xp, status, ai_reasoning, expires_at)
    VALUES (_user_id, _template_key, _title, _description,
            COALESCE(_reward_credit, _tpl.reward_credit),
            COALESCE(_reward_xp, _tpl.reward_xp), _status, _ai_reasoning,
            now() + (_tpl.duration_minutes || ' minutes')::interval)
  RETURNING id INTO _id;
  PERFORM public.notify_user(_user_id, 'ai_mission_new',
    '🤖 새로운 AI 미션',
    _title || ' · 보상 ₩' || _reward_credit::text,
    jsonb_build_object('mission_id', _id, 'auto_approve', _tpl.auto_approve));
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_ai_mission(uuid,text,text,text,bigint,int,text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_ai_mission(_mission_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.ai_generated_missions%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO _row FROM public.ai_generated_missions WHERE id = _mission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _row.user_id <> _uid THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _row.status <> 'approved' THEN RAISE EXCEPTION 'not_claimable:%', _row.status; END IF;
  IF _row.expires_at < now() THEN
    UPDATE public.ai_generated_missions SET status='expired' WHERE id=_mission_id;
    RAISE EXCEPTION 'expired';
  END IF;
  UPDATE public.ai_generated_missions SET status='claimed', claimed_at=now() WHERE id=_mission_id;
  PERFORM public._credit_user_balance(_uid, _row.reward_credit, 'ai_mission', jsonb_build_object('mission_id', _mission_id));
  PERFORM public.grant_xp(_uid, _row.reward_xp);
  PERFORM public.notify_user(_uid, 'mission_reward',
    '🎁 미션 보상 지급',
    '+₩' || _row.reward_credit::text || ' · +' || _row.reward_xp::text || ' XP',
    jsonb_build_object('mission_id', _mission_id, 'credit', _row.reward_credit, 'xp', _row.reward_xp));
  RETURN jsonb_build_object('ok', true, 'credit', _row.reward_credit, 'xp', _row.reward_xp);
END $$;
REVOKE ALL ON FUNCTION public.claim_ai_mission(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_ai_mission(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_resolve_ai_mission(_id uuid, _action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.ai_generated_missions%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _action NOT IN ('approve','reject') THEN RAISE EXCEPTION 'invalid_action'; END IF;
  SELECT * INTO _row FROM public.ai_generated_missions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  UPDATE public.ai_generated_missions
    SET status = CASE WHEN _action='approve' THEN 'approved' ELSE 'rejected' END,
        approved_by_admin = _uid
    WHERE id = _id;
  IF _action='approve' THEN
    PERFORM public.notify_user(_row.user_id,'ai_mission_approved','✓ 미션 승인','이제 보상을 청구할 수 있습니다.',
      jsonb_build_object('mission_id', _id));
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.admin_resolve_ai_mission(uuid,text) FROM public, anon, authenticated;

-- ============ 4. WEEKLY SEASON PASS ============
CREATE TABLE IF NOT EXISTS public.weekly_pass_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level int NOT NULL UNIQUE,
  reward_credit bigint NOT NULL DEFAULT 0,
  reward_badge text,
  withdraw_priority boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT ''
);
ALTER TABLE public.weekly_pass_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wpr_public_read ON public.weekly_pass_rewards;
CREATE POLICY wpr_public_read ON public.weekly_pass_rewards FOR SELECT USING (true);
INSERT INTO public.weekly_pass_rewards (level, reward_credit, reward_badge, withdraw_priority, description) VALUES
  (1, 2000,  NULL,            false, '워밍업 보상'),
  (3, 5000,  NULL,            false, '미들 보상'),
  (5, 10000, 'weekly_silver', true,  '주간 실버 + 출금 우선'),
  (7, 20000, 'weekly_gold',   true,  '주간 골드 + 출금 우선'),
  (10,50000, 'weekly_diamond',true,  '주간 다이아 + 출금 우선 + 50k')
ON CONFLICT (level) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.weekly_pass_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  iso_week text NOT NULL,
  xp bigint NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 0,
  claimed_levels jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, iso_week)
);
ALTER TABLE public.weekly_pass_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wpp_self_select ON public.weekly_pass_progress;
CREATE POLICY wpp_self_select ON public.weekly_pass_progress FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.claim_weekly_pass_reward(_level int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _wk text := to_char(now(),'IYYY-IW');
        _row public.weekly_pass_progress%ROWTYPE; _rew public.weekly_pass_rewards%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO _rew FROM public.weekly_pass_rewards WHERE level = _level;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_level'; END IF;
  SELECT * INTO _row FROM public.weekly_pass_progress WHERE user_id=_uid AND iso_week=_wk FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_progress'; END IF;
  IF _row.level < _level THEN RAISE EXCEPTION 'level_locked'; END IF;
  IF _row.claimed_levels @> to_jsonb(_level) THEN RAISE EXCEPTION 'already_claimed'; END IF;
  UPDATE public.weekly_pass_progress
    SET claimed_levels = claimed_levels || to_jsonb(_level), updated_at = now()
    WHERE id = _row.id;
  IF _rew.reward_credit > 0 THEN
    PERFORM public._credit_user_balance(_uid, _rew.reward_credit, 'weekly_pass', jsonb_build_object('level',_level));
  END IF;
  PERFORM public.notify_user(_uid, 'weekly_pass_claim',
    '🌟 주간패스 보상 수령 (Lv ' || _level || ')',
    COALESCE(_rew.description,'') || ' · +₩' || _rew.reward_credit::text,
    jsonb_build_object('level',_level,'badge',_rew.reward_badge,'priority',_rew.withdraw_priority));
  RETURN jsonb_build_object('ok', true, 'credit', _rew.reward_credit, 'badge', _rew.reward_badge, 'priority', _rew.withdraw_priority);
END $$;
REVOKE ALL ON FUNCTION public.claim_weekly_pass_reward(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_weekly_pass_reward(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_weekly_pass_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _wk text := to_char(now(),'IYYY-IW');
        _prog public.weekly_pass_progress%ROWTYPE; _rewards jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO _prog FROM public.weekly_pass_progress WHERE user_id=_uid AND iso_week=_wk;
  SELECT jsonb_agg(jsonb_build_object('level',level,'credit',reward_credit,'badge',reward_badge,'priority',withdraw_priority,'description',description) ORDER BY level)
    INTO _rewards FROM public.weekly_pass_rewards;
  RETURN jsonb_build_object(
    'iso_week', _wk,
    'progress', COALESCE(to_jsonb(_prog), jsonb_build_object('xp',0,'level',0,'claimed_levels','[]'::jsonb)),
    'rewards', COALESCE(_rewards,'[]'::jsonb)
  );
END $$;
REVOKE ALL ON FUNCTION public.get_weekly_pass_overview() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_pass_overview() TO authenticated;

-- ============ 5. WEEKLY LEADERBOARD AUTO PAYOUT ============
CREATE TABLE IF NOT EXISTS public.weekly_payout_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_week text NOT NULL,
  rank int NOT NULL,
  user_id uuid NOT NULL,
  amount bigint NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(iso_week, rank)
);
ALTER TABLE public.weekly_payout_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wpl_self_select ON public.weekly_payout_log;
CREATE POLICY wpl_self_select ON public.weekly_payout_log FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.pay_weekly_leaderboard()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _wk text := to_char(now() - interval '1 day','IYYY-IW');
        _r record; _amt bigint; _paid int := 0;
BEGIN
  FOR _r IN
    SELECT inviter_id, COUNT(*) AS cnt, COALESCE(SUM(commission),0) AS total
    FROM public.referral_earnings
    WHERE created_at >= date_trunc('week', now() - interval '7 days')
      AND created_at <  date_trunc('week', now())
    GROUP BY inviter_id
    ORDER BY total DESC, cnt DESC
    LIMIT 3
  LOOP
    _paid := _paid + 1;
    _amt := CASE _paid WHEN 1 THEN 50000 WHEN 2 THEN 30000 ELSE 15000 END;
    INSERT INTO public.weekly_payout_log(iso_week, rank, user_id, amount)
      VALUES (_wk, _paid, _r.inviter_id, _amt)
      ON CONFLICT (iso_week, rank) DO NOTHING;
    IF FOUND THEN
      PERFORM public._credit_user_balance(_r.inviter_id, _amt, 'weekly_leaderboard',
        jsonb_build_object('iso_week', _wk, 'rank', _paid));
      PERFORM public.notify_user(_r.inviter_id, 'weekly_payout',
        '🏆 주간 추천 ' || _paid || '위 보상',
        '+₩' || _amt::text || ' 자동 지급',
        jsonb_build_object('rank', _paid, 'amount', _amt, 'iso_week', _wk));
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'iso_week', _wk, 'paid', _paid);
END $$;
REVOKE ALL ON FUNCTION public.pay_weekly_leaderboard() FROM public, anon, authenticated;

-- ============ 6. ADMIN TEMPLATE UPSERT ============
CREATE OR REPLACE FUNCTION public.admin_upsert_mission_template(
  _key text, _title text, _description text, _category text, _difficulty text,
  _reward_credit bigint, _reward_xp int, _duration_minutes int,
  _auto_approve boolean, _active boolean, _ai_prompt_seed text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.mission_templates(key,title,description,category,difficulty,reward_credit,reward_xp,duration_minutes,auto_approve,active,ai_prompt_seed)
    VALUES(_key,_title,_description,_category,_difficulty,_reward_credit,_reward_xp,_duration_minutes,_auto_approve,_active,_ai_prompt_seed)
  ON CONFLICT (key) DO UPDATE SET
    title=EXCLUDED.title, description=EXCLUDED.description, category=EXCLUDED.category,
    difficulty=EXCLUDED.difficulty, reward_credit=EXCLUDED.reward_credit, reward_xp=EXCLUDED.reward_xp,
    duration_minutes=EXCLUDED.duration_minutes, auto_approve=EXCLUDED.auto_approve, active=EXCLUDED.active,
    ai_prompt_seed=EXCLUDED.ai_prompt_seed, updated_at=now();
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.admin_upsert_mission_template(text,text,text,text,text,bigint,int,int,boolean,boolean,text) FROM public, anon, authenticated;

-- ============ 7. PERMISSION BASELINE ============
INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note) VALUES
  ('notify_user','_user_id uuid, _kind text, _title text, _body text, _payload jsonb','{}','notification','internal only'),
  ('enqueue_ai_mission','_user_id uuid, _template_key text, _title text, _description text, _reward_credit bigint, _reward_xp integer, _ai_reasoning text','{}','ai_mission','internal — edge function via service role'),
  ('claim_ai_mission','_mission_id uuid','{authenticated}','ai_mission','user RPC'),
  ('admin_resolve_ai_mission','_id uuid, _action text','{}','ai_mission','admin only'),
  ('claim_weekly_pass_reward','_level integer','{authenticated}','weekly_pass','user RPC'),
  ('get_weekly_pass_overview','','{authenticated}','weekly_pass','user RPC'),
  ('pay_weekly_leaderboard','','{}','referral','cron only — service role'),
  ('admin_upsert_mission_template','_key text, _title text, _description text, _category text, _difficulty text, _reward_credit bigint, _reward_xp integer, _duration_minutes integer, _auto_approve boolean, _active boolean, _ai_prompt_seed text','{}','mission_admin','admin only')
ON CONFLICT (function_name, function_args) DO UPDATE SET
  allowed_roles = EXCLUDED.allowed_roles, category = EXCLUDED.category, note = EXCLUDED.note, updated_at = now();
