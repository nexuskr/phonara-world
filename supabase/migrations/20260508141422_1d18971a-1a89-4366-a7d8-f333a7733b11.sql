
-- =========================================================
-- PR2: Phonara Viral Pack — Milestone Engine + RRM
-- =========================================================

-- 1) viral_mission_catalog
CREATE TABLE IF NOT EXISTS public.viral_mission_catalog (
  key text PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN (
    'kakao','naver_blog','naver_cafe','band','instagram','tiktok',
    'threads','x','youtube','web','general'
  )),
  title text NOT NULL,
  copy_template text NOT NULL,
  asset_url text,
  proof_type text NOT NULL DEFAULT 'url'
    CHECK (proof_type IN ('url','screenshot','hash')),
  -- M1: signup activation, M2: first deposit, M3: first package purchase, M4: 30d retention
  -- (M2/M3 are event records only; payout gated by viral_settings.revenue_recognition_enabled)
  milestone_bonuses jsonb NOT NULL DEFAULT
    '{"M1":1000,"M2":5000,"M3":10000,"M4":5000}'::jsonb,
  lifetime_cap_per_invitee bigint NOT NULL DEFAULT 30000,
  daily_cap_per_user integer NOT NULL DEFAULT 5,
  cooldown_hours integer NOT NULL DEFAULT 6,
  ai_seed text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.viral_mission_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY vmc_public_read
ON public.viral_mission_catalog FOR SELECT
USING (active OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY vmc_admin_write
ON public.viral_mission_catalog FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2) viral_mission_submissions
CREATE TABLE IF NOT EXISTS public.viral_mission_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  catalog_key text NOT NULL REFERENCES public.viral_mission_catalog(key),
  chain_id uuid REFERENCES public.viral_attribution_chain(id),
  proof_url text,
  proof_hash text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','auto_verified','approved','rejected','flagged')),
  -- LOCKED: only these 3 values, never extended
  entitlement_status text NOT NULL DEFAULT 'not_eligible'
    CHECK (entitlement_status IN ('not_eligible','eligible','paid')),
  milestones_paid jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_bonus_paid bigint NOT NULL DEFAULT 0,
  clicks_attributed integer NOT NULL DEFAULT 0,
  conversions_attributed integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_vms_user      ON public.viral_mission_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_vms_chain     ON public.viral_mission_submissions(chain_id);
CREATE INDEX IF NOT EXISTS idx_vms_catalog   ON public.viral_mission_submissions(catalog_key);
CREATE INDEX IF NOT EXISTS idx_vms_status    ON public.viral_mission_submissions(status);

-- One submission row per (chain, catalog) for milestone idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_vms_chain_catalog
  ON public.viral_mission_submissions(chain_id, catalog_key)
  WHERE chain_id IS NOT NULL;

ALTER TABLE public.viral_mission_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY vms_self_select
ON public.viral_mission_submissions FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY vms_self_insert
ON public.viral_mission_submissions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY vms_admin_update
ON public.viral_mission_submissions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 3) settle_viral_milestone — single IF gate, no fanout
-- =========================================================
CREATE OR REPLACE FUNCTION public.settle_viral_milestone(
  _chain_id uuid,
  _milestone_key text,
  _catalog_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chain    public.viral_attribution_chain%ROWTYPE;
  v_catalog  public.viral_mission_catalog%ROWTYPE;
  v_settings public.viral_settings%ROWTYPE;
  v_caller   uuid := auth.uid();
  v_jwt_role text := coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','');
  v_bonus    bigint := 0;
  v_existing public.viral_mission_submissions%ROWTYPE;
  v_already_paid bigint := 0;
  v_eligible boolean := false;
  v_entitlement text := 'not_eligible';
  v_result   jsonb;
BEGIN
  -- Auth: caller must be admin or service_role (called from triggers/edge fns)
  IF v_caller IS NULL AND v_jwt_role <> 'service_role' THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF v_caller IS NOT NULL
     AND v_jwt_role <> 'service_role'
     AND NOT has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin or service_role required' USING ERRCODE = '42501';
  END IF;

  -- Validate milestone key
  IF _milestone_key NOT IN ('M1','M2','M3','M4') THEN
    RAISE EXCEPTION 'invalid milestone_key: %', _milestone_key;
  END IF;

  -- Load chain
  SELECT * INTO v_chain
  FROM public.viral_attribution_chain
  WHERE id = _chain_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'chain not found';
  END IF;
  IF v_chain.window_expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'window_expired');
  END IF;

  -- Idempotency: already recorded?
  IF v_chain.milestones_reached ? _milestone_key THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_recorded',
                              'milestone', _milestone_key);
  END IF;

  -- Load catalog
  SELECT * INTO v_catalog
  FROM public.viral_mission_catalog
  WHERE key = _catalog_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'catalog not found: %', _catalog_key;
  END IF;

  -- Load settings (singleton)
  SELECT * INTO v_settings FROM public.viral_settings WHERE id = 1;

  -- ============================================================
  -- THE SINGLE IF GATE (plan v3.3 lock)
  -- M1/M4: always eligible (behavior-based)
  -- M2/M3: eligible only when RRM=ON. Else: record only, no entitlement.
  -- ============================================================
  IF _milestone_key IN ('M1','M4') THEN
    v_eligible := true;
  ELSIF _milestone_key IN ('M2','M3') THEN
    v_eligible := COALESCE(v_settings.revenue_recognition_enabled, false);
  END IF;

  IF v_eligible THEN
    v_bonus := COALESCE((v_catalog.milestone_bonuses ->> _milestone_key)::bigint, 0);

    -- Lifetime cap per invitee
    SELECT COALESCE(SUM(total_bonus_paid),0) INTO v_already_paid
    FROM public.viral_mission_submissions
    WHERE chain_id = _chain_id;

    IF v_already_paid + v_bonus > v_catalog.lifetime_cap_per_invitee THEN
      v_bonus := GREATEST(v_catalog.lifetime_cap_per_invitee - v_already_paid, 0);
    END IF;

    v_entitlement := CASE WHEN v_bonus > 0 THEN 'paid' ELSE 'not_eligible' END;
  ELSE
    v_bonus := 0;
    v_entitlement := 'not_eligible';
  END IF;

  -- Upsert submission row (one per chain×catalog)
  INSERT INTO public.viral_mission_submissions
    (user_id, catalog_key, chain_id, status, entitlement_status,
     milestones_paid, total_bonus_paid, settled_at, metadata)
  VALUES
    (v_chain.inviter_id, _catalog_key, _chain_id, 'auto_verified', v_entitlement,
     jsonb_build_object(_milestone_key, v_bonus),
     v_bonus, now(),
     jsonb_build_object('rrm_enabled', v_settings.revenue_recognition_enabled,
                        'milestone', _milestone_key))
  ON CONFLICT (chain_id, catalog_key) DO UPDATE SET
    milestones_paid = viral_mission_submissions.milestones_paid
                       || jsonb_build_object(_milestone_key, EXCLUDED.total_bonus_paid),
    total_bonus_paid = viral_mission_submissions.total_bonus_paid + EXCLUDED.total_bonus_paid,
    entitlement_status = CASE
      WHEN viral_mission_submissions.entitlement_status = 'paid' THEN 'paid'
      ELSE EXCLUDED.entitlement_status
    END,
    settled_at = now();

  -- Update chain milestones_reached
  UPDATE public.viral_attribution_chain
     SET milestones_reached = milestones_reached
                              || jsonb_build_object(_milestone_key,
                                   jsonb_build_object('bonus', v_bonus,
                                                      'entitlement', v_entitlement,
                                                      'at', now())),
         updated_at = now()
   WHERE id = _chain_id;

  v_result := jsonb_build_object(
    'ok', true,
    'milestone', _milestone_key,
    'eligible', v_eligible,
    'entitlement', v_entitlement,
    'bonus', v_bonus,
    'rrm_enabled', v_settings.revenue_recognition_enabled
  );
  RETURN v_result;
END;
$$;

-- =========================================================
-- 4) toggle_rrm — admin only with audit
-- =========================================================
CREATE OR REPLACE FUNCTION public.toggle_rrm(
  _enabled boolean,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_prev  boolean;
BEGIN
  IF v_admin IS NULL OR NOT has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  IF _enabled = false AND (_reason IS NULL OR length(trim(_reason)) < 8) THEN
    RAISE EXCEPTION 'reason required (>=8 chars) when disabling RRM';
  END IF;

  SELECT revenue_recognition_enabled INTO v_prev
  FROM public.viral_settings WHERE id = 1;

  UPDATE public.viral_settings SET
    revenue_recognition_enabled = _enabled,
    rrm_disabled_reason = CASE WHEN _enabled THEN NULL ELSE _reason END,
    rrm_last_toggled_at = now(),
    rrm_last_toggled_by = v_admin
  WHERE id = 1;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, metadata)
  VALUES (v_admin, 'toggle_rrm', 'viral_settings',
          jsonb_build_object('previous', v_prev, 'next', _enabled, 'reason', _reason));

  RETURN jsonb_build_object('ok', true, 'previous', v_prev, 'next', _enabled);
END;
$$;

-- =========================================================
-- 5) Permission baseline registration
-- =========================================================
INSERT INTO public.function_permissions_baseline
  (function_name, function_args, allowed_roles, category, note)
VALUES
  ('settle_viral_milestone', 'uuid, text, text',
   ARRAY['authenticated','service_role']::text[],
   'viral',
   'Records milestone reach. M1/M4 always eligible; M2/M3 gated by viral_settings.revenue_recognition_enabled. No retroactive payouts.'),
  ('toggle_rrm', 'boolean, text',
   ARRAY['authenticated']::text[],
   'viral_admin',
   'Admin-only RRM toggle with audit log. Reason required when disabling.'),
  ('guard_viral_settings_retroactive_lock', '',
   ARRAY[]::text[],
   'trigger',
   'Trigger guard preventing rrm_no_retroactive_payout from being unset.'),
  ('guard_attribution_depth_one', '',
   ARRAY[]::text[],
   'trigger',
   'Trigger guard enforcing depth=1 + self-attribution block on viral_attribution_chain.')
ON CONFLICT DO NOTHING;

-- =========================================================
-- 6) 40 mission seeds (10 platforms × ~4 missions)
-- =========================================================
INSERT INTO public.viral_mission_catalog (key, platform, title, copy_template, ai_seed) VALUES
-- Kakao (4)
('kakao_friend_share_1', 'kakao', '카카오 친구에게 초대링크 공유',
 '안녕! 요즘 {{topic}} 관심 있는 사람한테만 공유하는 건데 한 번 봐봐 → {{ref_link}}',
 'casual_friendly_korean_kakao'),
('kakao_openchat_post_1', 'kakao', '오픈채팅방에 정보 공유',
 '{{topic}} 정리해둔 거 있어서 공유합니다. 관심 있으신 분만 → {{ref_link}}',
 'informative_openchat'),
('kakao_story_post_1', 'kakao', '카카오스토리 게시물',
 '요즘 시작한 {{topic}} 후기 → {{ref_link}}',
 'personal_review'),
('kakao_channel_msg_1', 'kakao', '채널 메시지 발송',
 '오늘의 {{topic}} 추천: {{ref_link}}',
 'channel_broadcast'),
-- Naver Blog (4)
('naver_blog_review_1', 'naver_blog', '네이버 블로그 후기 글',
 '{{topic}} 한 달 사용 후기와 솔직한 단점 → {{ref_link}}',
 'long_form_review'),
('naver_blog_howto_1', 'naver_blog', '네이버 블로그 방법 글',
 '{{topic}} 시작하는 방법 단계별 정리 → {{ref_link}}',
 'tutorial'),
('naver_blog_compare_1', 'naver_blog', '네이버 블로그 비교 글',
 '{{topic}} A vs B 비교 정리 → {{ref_link}}',
 'comparison'),
('naver_blog_news_1', 'naver_blog', '네이버 블로그 뉴스 인용',
 '최근 {{topic}} 관련 이슈 정리 → {{ref_link}}',
 'news_curation'),
-- Naver Cafe (4)
('naver_cafe_post_1', 'naver_cafe', '네이버 카페 정보 공유 게시글',
 '{{topic}} 정보 정리해서 공유드려요 → {{ref_link}}',
 'community_share'),
('naver_cafe_qna_1', 'naver_cafe', '네이버 카페 Q&A 답변',
 '저도 {{topic}} 시작했는데, 참고하시면 좋을 것 같아요 → {{ref_link}}',
 'qna_answer'),
('naver_cafe_review_1', 'naver_cafe', '네이버 카페 후기',
 '{{topic}} 사용 후기 공유합니다 → {{ref_link}}',
 'community_review'),
('naver_cafe_event_1', 'naver_cafe', '네이버 카페 이벤트 안내',
 '{{topic}} 관련 이벤트 정보 공유 → {{ref_link}}',
 'event_share'),
-- BAND (3)
('band_post_1', 'band', '밴드 게시글',
 '우리 밴드 식구들에게만 공유 → {{topic}} {{ref_link}}',
 'band_intimate'),
('band_share_1', 'band', '밴드 공유 카드',
 '{{topic}} 한 번 봐봐요 → {{ref_link}}',
 'band_share'),
('band_event_1', 'band', '밴드 이벤트',
 '{{topic}} 이벤트 알림 → {{ref_link}}',
 'band_event'),
-- Instagram (4)
('insta_story_share_1', 'instagram', '인스타 스토리 링크 스티커',
 '{{topic}} ✨ {{ref_link}}',
 'minimal_story'),
('insta_reels_caption_1', 'instagram', '릴스 캡션 + 링크',
 '{{topic}} 알아가는 중 🌱 프로필 링크 → {{ref_link}}',
 'reels_caption'),
('insta_post_carousel_1', 'instagram', '인스타 캐러셀 포스트',
 '{{topic}} 정리 5장 모음 → 프로필 링크 {{ref_link}}',
 'carousel_post'),
('insta_bio_link_1', 'instagram', '프로필 링크 트리',
 '🔗 {{ref_link}}',
 'bio_link'),
-- TikTok (4)
('tiktok_video_caption_1', 'tiktok', '틱톡 영상 캡션',
 '{{topic}} 후기 (진짜 솔직함) {{ref_link}}',
 'tiktok_caption'),
('tiktok_duet_1', 'tiktok', '틱톡 듀엣/스티치',
 '나도 해봤음 {{topic}} → {{ref_link}}',
 'tiktok_duet'),
('tiktok_bio_1', 'tiktok', '틱톡 바이오 링크',
 '👇 {{ref_link}}',
 'tiktok_bio'),
('tiktok_comment_1', 'tiktok', '틱톡 댓글 응답',
 '{{topic}} 정리해둔 거 있어요 → {{ref_link}}',
 'tiktok_reply'),
-- Threads (3)
('threads_post_1', 'threads', '스레드 짧은 글',
 '{{topic}} 시작한지 1주차 ✏️ {{ref_link}}',
 'threads_short'),
('threads_chain_1', 'threads', '스레드 연속 글',
 '{{topic}} 정리 1/3 → 마지막에 링크 {{ref_link}}',
 'threads_chain'),
('threads_reply_1', 'threads', '스레드 답글',
 '저도 비슷해요. 참고: {{ref_link}}',
 'threads_reply'),
-- X / Twitter (3)
('x_tweet_1', 'x', 'X 트윗',
 '{{topic}} 한 달 후기 ↓ {{ref_link}}',
 'x_tweet'),
('x_thread_1', 'x', 'X 스레드',
 '🧵 {{topic}} 정리 (1/5) {{ref_link}}',
 'x_thread'),
('x_reply_1', 'x', 'X 인용/답글',
 '저도 {{topic}}: {{ref_link}}',
 'x_reply'),
-- YouTube (3)
('youtube_short_desc_1', 'youtube', '쇼츠 설명',
 '{{topic}} 알아보기 → {{ref_link}}',
 'youtube_short'),
('youtube_comment_1', 'youtube', '유튜브 댓글',
 '{{topic}} 정리해둔 글 있어요 → {{ref_link}}',
 'youtube_comment'),
('youtube_community_1', 'youtube', '유튜브 커뮤니티',
 '{{topic}} 새 글 → {{ref_link}}',
 'youtube_community'),
-- Web / general (4)
('web_blog_external_1', 'web', '외부 블로그 글',
 '{{topic}} 후기 글 → {{ref_link}}',
 'web_blog'),
('web_forum_1', 'web', '커뮤니티 사이트 게시글',
 '{{topic}} 정보 공유 → {{ref_link}}',
 'forum_post'),
('web_dm_template_1', 'general', '1:1 DM 템플릿',
 '안녕하세요, {{topic}} 관심 있으실 것 같아 공유드려요 → {{ref_link}}',
 'cold_dm'),
('web_qr_offline_1', 'general', 'QR 오프라인 공유',
 '{{topic}} → 스캔하면 정보 → {{ref_link}}',
 'qr_offline')
ON CONFLICT (key) DO NOTHING;
