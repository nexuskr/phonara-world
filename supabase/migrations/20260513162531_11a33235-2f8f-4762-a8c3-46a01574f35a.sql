
-- 1) season meta + history table
ALTER TABLE public.founding_seasons
  ADD COLUMN IF NOT EXISTS settled_at timestamptz;

CREATE TABLE IF NOT EXISTS public.founding_seat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.founding_seasons(id) ON DELETE CASCADE,
  seat_no int,
  user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('claim','release','season_end','settled','perk_granted')),
  note text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fse_user ON public.founding_seat_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fse_season ON public.founding_seat_events(season_id, created_at DESC);

ALTER TABLE public.founding_seat_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fse_self_or_admin_select" ON public.founding_seat_events
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fse_admin_all" ON public.founding_seat_events
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) extend fomo_notifications kind to allow founding_seat
ALTER TABLE public.fomo_notifications DROP CONSTRAINT IF EXISTS fomo_notifications_kind_check;
ALTER TABLE public.fomo_notifications ADD CONSTRAINT fomo_notifications_kind_check
  CHECK (kind = ANY (ARRAY[
    'recovery','loss_streak','inactive','jackpot_near','war_started',
    'referral_used','empire_promo','market_event','founding_seat'
  ]));

-- 3) trigger: log + notify on seat changes
CREATE OR REPLACE FUNCTION public.tg_founding_seat_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_season_code text;
  v_season_title text;
BEGIN
  SELECT code, title INTO v_season_code, v_season_title
  FROM public.founding_seasons WHERE id = NEW.season_id;

  -- claim
  IF (TG_OP = 'INSERT' AND NEW.claimed_by IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND (OLD.claimed_by IS NULL OR OLD.claimed_by IS DISTINCT FROM NEW.claimed_by)
         AND NEW.claimed_by IS NOT NULL) THEN
    INSERT INTO public.founding_seat_events(season_id, seat_no, user_id, event_type, payload)
    VALUES (NEW.season_id, NEW.seat_no, NEW.claimed_by, 'claim',
            jsonb_build_object('season_code', v_season_code));
    PERFORM public.enqueue_fomo_notification(
      NEW.claimed_by, 'founding_seat',
      v_season_title || ' 좌석 #' || NEW.seat_no::text || ' 확보!',
      '명예의 전당에 영구 등재되었습니다. 시즌 종료 시 퍼크가 자동 정산됩니다.',
      '내 좌석 보기', '/empire/my-seat',
      jsonb_build_object('season_id', NEW.season_id, 'seat_no', NEW.seat_no, 'kind','claim'),
      8::smallint,
      'founding_claim:' || NEW.season_id::text || ':' || NEW.seat_no::text,
      720
    );
  END IF;

  -- release
  IF TG_OP = 'UPDATE' AND OLD.claimed_by IS NOT NULL AND NEW.claimed_by IS NULL THEN
    INSERT INTO public.founding_seat_events(season_id, seat_no, user_id, event_type, payload)
    VALUES (NEW.season_id, NEW.seat_no, OLD.claimed_by, 'release',
            jsonb_build_object('season_code', v_season_code));
    PERFORM public.enqueue_fomo_notification(
      OLD.claimed_by, 'founding_seat',
      v_season_title || ' 좌석 #' || NEW.seat_no::text || ' 해제',
      '관리자에 의해 좌석이 해제되었습니다. 자세한 내용은 운영팀에 문의해주세요.',
      '문의하기', '/trust',
      jsonb_build_object('season_id', NEW.season_id, 'seat_no', NEW.seat_no, 'kind','release'),
      9::smallint,
      'founding_release:' || NEW.season_id::text || ':' || NEW.seat_no::text || ':' || extract(epoch from now())::bigint::text,
      720
    );
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_founding_seat_change ON public.founding_season_seats;
CREATE TRIGGER trg_founding_seat_change
AFTER INSERT OR UPDATE OF claimed_by ON public.founding_season_seats
FOR EACH ROW EXECUTE FUNCTION public.tg_founding_seat_change();

-- 4) admin update season
CREATE OR REPLACE FUNCTION public.admin_update_founding_season(
  _id uuid, _title text, _subtitle text, _perks jsonb, _ends_at timestamptz
) RETURNS public.founding_seasons
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.founding_seasons;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin_only'; END IF;
  UPDATE public.founding_seasons SET
    title = COALESCE(_title, title),
    subtitle = COALESCE(_subtitle, subtitle),
    perks = COALESCE(_perks, perks),
    ends_at = _ends_at
  WHERE id = _id RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  RETURN v_row;
END $$;
REVOKE ALL ON FUNCTION public.admin_update_founding_season(uuid,text,text,jsonb,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_founding_season(uuid,text,text,jsonb,timestamptz) TO authenticated;

-- 5) admin release seat
CREATE OR REPLACE FUNCTION public.admin_release_founding_seat(
  _season_id uuid, _seat_no int, _reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin_only'; END IF;
  SELECT claimed_by INTO v_user FROM public.founding_season_seats
    WHERE season_id = _season_id AND seat_no = _seat_no;
  IF v_user IS NULL THEN RAISE EXCEPTION 'seat_not_claimed'; END IF;

  UPDATE public.founding_season_seats
    SET claimed_by = NULL, claimed_at = NULL, display_label = NULL
    WHERE season_id = _season_id AND seat_no = _seat_no;

  -- attach reason to latest release event
  UPDATE public.founding_seat_events SET note = _reason
    WHERE id = (SELECT id FROM public.founding_seat_events
                WHERE season_id = _season_id AND seat_no = _seat_no AND event_type = 'release'
                ORDER BY created_at DESC LIMIT 1);

  RETURN jsonb_build_object('ok', true, 'released_user', v_user);
END $$;
REVOKE ALL ON FUNCTION public.admin_release_founding_seat(uuid,int,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_release_founding_seat(uuid,int,text) TO authenticated;

-- 6) settle one ended season (idempotent)
CREATE OR REPLACE FUNCTION public.settle_founding_season(_season_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_season public.founding_seasons;
  v_count int := 0;
  r record;
BEGIN
  SELECT * INTO v_season FROM public.founding_seasons WHERE id = _season_id FOR UPDATE;
  IF v_season.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_season.settled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_settled', true);
  END IF;
  IF v_season.active THEN RAISE EXCEPTION 'season_still_active'; END IF;

  -- log season_end
  INSERT INTO public.founding_seat_events(season_id, event_type, payload)
  VALUES (_season_id, 'season_end', jsonb_build_object('code', v_season.code));

  -- distribute: notify every claimant + grant Crown bonus (×3 for founding emperor)
  FOR r IN
    SELECT s.seat_no, s.claimed_by
    FROM public.founding_season_seats s
    WHERE s.season_id = _season_id AND s.claimed_by IS NOT NULL
  LOOP
    -- best-effort Crown grant if function exists
    BEGIN
      PERFORM public.award_crown(r.claimed_by, 3.0::numeric, 'founding_season:' || v_season.code);
    EXCEPTION WHEN undefined_function OR others THEN NULL;
    END;

    INSERT INTO public.founding_seat_events(season_id, seat_no, user_id, event_type, payload)
    VALUES (_season_id, r.seat_no, r.claimed_by, 'perk_granted',
            jsonb_build_object('crown_multiplier', 3.0, 'season_code', v_season.code));

    PERFORM public.enqueue_fomo_notification(
      r.claimed_by, 'founding_seat',
      v_season.title || ' 종료 — 명예 정산 완료',
      '좌석 #' || r.seat_no::text || ' 보유자 영구 퍼크 + Crown ×3 보너스가 지급되었습니다.',
      '내 좌석 보기', '/empire/my-seat',
      jsonb_build_object('season_id', _season_id, 'seat_no', r.seat_no, 'kind','settled'),
      9::smallint,
      'founding_settle:' || _season_id::text || ':' || r.seat_no::text,
      720
    );
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.founding_seasons SET settled_at = now() WHERE id = _season_id;

  INSERT INTO public.founding_seat_events(season_id, event_type, payload)
  VALUES (_season_id, 'settled', jsonb_build_object('users', v_count));

  RETURN jsonb_build_object('ok', true, 'settled_users', v_count);
END $$;
REVOKE ALL ON FUNCTION public.settle_founding_season(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_founding_season(uuid) TO authenticated;

-- 7) admin end season
CREATE OR REPLACE FUNCTION public.admin_end_founding_season(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin_only'; END IF;
  UPDATE public.founding_seasons
    SET active = false, ends_at = LEAST(COALESCE(ends_at, now()), now())
    WHERE id = _id;
  v_res := public.settle_founding_season(_id);
  RETURN v_res;
END $$;
REVOKE ALL ON FUNCTION public.admin_end_founding_season(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_end_founding_season(uuid) TO authenticated;

-- 8) cron-callable batch settle
CREATE OR REPLACE FUNCTION public.settle_ended_founding_seasons()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_n int := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.founding_seasons
    WHERE settled_at IS NULL
      AND (active = false OR (ends_at IS NOT NULL AND ends_at < now()))
  LOOP
    -- auto-deactivate if past end
    UPDATE public.founding_seasons SET active = false WHERE id = r.id AND active = true;
    BEGIN
      PERFORM public.settle_founding_season(r.id);
      v_n := v_n + 1;
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION public.settle_ended_founding_seasons() FROM PUBLIC;

-- 9) my seat + history
CREATE OR REPLACE FUNCTION public.get_my_founding_seat(_season_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid := _season_id;
  v_season public.founding_seasons;
  v_seat public.founding_season_seats;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.founding_seasons WHERE active = true LIMIT 1;
  END IF;
  IF v_id IS NULL THEN RETURN jsonb_build_object('has_seat', false); END IF;
  SELECT * INTO v_season FROM public.founding_seasons WHERE id = v_id;
  SELECT * INTO v_seat FROM public.founding_season_seats
    WHERE season_id = v_id AND claimed_by = v_uid LIMIT 1;
  RETURN jsonb_build_object(
    'has_seat', v_seat.id IS NOT NULL,
    'season', jsonb_build_object(
      'id', v_season.id, 'code', v_season.code, 'title', v_season.title,
      'subtitle', v_season.subtitle, 'perks', v_season.perks,
      'starts_at', v_season.starts_at, 'ends_at', v_season.ends_at,
      'active', v_season.active, 'settled_at', v_season.settled_at,
      'total_seats', v_season.total_seats
    ),
    'seat', CASE WHEN v_seat.id IS NULL THEN NULL ELSE
      jsonb_build_object('seat_no', v_seat.seat_no, 'claimed_at', v_seat.claimed_at,
        'display_label', v_seat.display_label) END
  );
END $$;
GRANT EXECUTE ON FUNCTION public.get_my_founding_seat(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_founding_seat_history(_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid, season_id uuid, season_code text, season_title text,
  seat_no int, event_type text, note text, payload jsonb, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  RETURN QUERY
  SELECT e.id, e.season_id, fs.code, fs.title, e.seat_no, e.event_type, e.note, e.payload, e.created_at
  FROM public.founding_seat_events e
  JOIN public.founding_seasons fs ON fs.id = e.season_id
  WHERE e.user_id = v_uid
  ORDER BY e.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 200));
END $$;
GRANT EXECUTE ON FUNCTION public.get_my_founding_seat_history(int) TO authenticated;

-- 10) admin list seasons
CREATE OR REPLACE FUNCTION public.admin_list_founding_seasons()
RETURNS TABLE (
  id uuid, code text, title text, subtitle text, total_seats int,
  claimed int, perks jsonb, starts_at timestamptz, ends_at timestamptz,
  active boolean, settled_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin_only'; END IF;
  RETURN QUERY
  SELECT s.id, s.code, s.title, s.subtitle, s.total_seats,
    (SELECT count(*)::int FROM public.founding_season_seats x
       WHERE x.season_id = s.id AND x.claimed_by IS NOT NULL),
    s.perks, s.starts_at, s.ends_at, s.active, s.settled_at
  FROM public.founding_seasons s
  ORDER BY s.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_founding_seasons() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_founding_seasons() TO authenticated;

-- realtime for events + seasons + notifications already on
ALTER PUBLICATION supabase_realtime ADD TABLE public.founding_seat_events;

-- 11) cron schedule (every 5 min)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'settle_ended_founding_seasons') THEN
    PERFORM cron.unschedule('settle_ended_founding_seasons');
  END IF;
  PERFORM cron.schedule('settle_ended_founding_seasons', '*/5 * * * *',
    $cron$ SELECT public.settle_ended_founding_seasons(); $cron$);
END $$;
