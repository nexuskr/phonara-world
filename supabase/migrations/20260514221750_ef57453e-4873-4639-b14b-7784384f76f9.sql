-- relax nft_collection constraints
ALTER TABLE public.nft_collection DROP CONSTRAINT IF EXISTS nft_collection_level_check;
ALTER TABLE public.nft_collection ADD CONSTRAINT nft_collection_level_check
  CHECK (level = ANY (ARRAY['bronze','gold','diamond','legendary']));
ALTER TABLE public.nft_collection DROP CONSTRAINT IF EXISTS nft_collection_type_check;
ALTER TABLE public.nft_collection ADD CONSTRAINT nft_collection_type_check
  CHECK (type = ANY (ARRAY['crown','emperor','founder','crown_war']));
ALTER TABLE public.nft_collection DROP CONSTRAINT IF EXISTS nft_collection_boost_pct_check;
ALTER TABLE public.nft_collection ADD CONSTRAINT nft_collection_boost_pct_check
  CHECK (boost_pct >= 0 AND boost_pct <= 70);
ALTER TABLE public.nft_collection DROP CONSTRAINT IF EXISTS nft_collection_source_check;
ALTER TABLE public.nft_collection ADD CONSTRAINT nft_collection_source_check
  CHECK (source = ANY (ARRAY['deposit','baron','founding','admin','bequest','atelier','crown_war']));

-- =========== CROWN WAR LEGENDARY AUTO-GRANT ===========
CREATE OR REPLACE FUNCTION public.settle_crown_war()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  w public.crown_wars; rec RECORD; awarded jsonb := '[]'::jsonb;
  hour_start TIMESTAMPTZ; total_n INT;
  _variant TEXT; _nick TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  FOR w IN SELECT * FROM public.crown_wars WHERE status='active' AND ends_at <= now() ORDER BY id ASC LOOP
    UPDATE public.crown_wars SET status='settling' WHERE id = w.id;
    SELECT COUNT(*) INTO total_n FROM public.crown_war_participants WHERE war_id = w.id;
    FOR rec IN
      SELECT user_id, score, ROW_NUMBER() OVER (ORDER BY score DESC, last_event_at ASC) AS rnk
      FROM public.crown_war_participants WHERE war_id=w.id AND score>0
      ORDER BY score DESC, last_event_at ASC LIMIT 3
    LOOP
      PERFORM public.crown_war_award_direct(rec.user_id, w.id, rec.rnk::int, rec.score);
      IF rec.rnk = 1 THEN
        UPDATE public.crown_wars SET top1_user_id=rec.user_id, top1_score=rec.score WHERE id=w.id;
        -- Legendary NFT auto-grant (idempotent by source_ref = war_id)
        _variant := CASE WHEN random() < 0.5 THEN 'golden_trump' ELSE 'starship_musk' END;
        BEGIN
          INSERT INTO public.nft_collection (user_id, type, level, boost_pct, source, source_ref, external_metadata_url)
          VALUES (rec.user_id, 'crown_war', 'legendary', 35, 'crown_war', 'war:'||w.id::text,
                  jsonb_build_object('variant', _variant)::text)
          ON CONFLICT (source, source_ref) DO NOTHING;
        EXCEPTION WHEN others THEN NULL;
        END;
        SELECT nickname INTO _nick FROM public.profiles WHERE id = rec.user_id;
        PERFORM public.enqueue_imperial_story(
          'crown_war_finale',
          '⚔️ Crown War 우승: '||COALESCE(_nick,'익명 황제')||' · '||CASE _variant WHEN 'golden_trump' THEN 'Golden Trump 👑' ELSE 'Starship Musk 🚀' END,
          'Legendary NFT(boost +35%) 자동 발급',
          rec.user_id, _nick,
          jsonb_build_object('war_id', w.id, 'variant', _variant, 'score', rec.score),
          'crown_war:'||w.id::text, 168
        );
      END IF;
      IF rec.rnk = 2 THEN UPDATE public.crown_wars SET top2_user_id=rec.user_id, top2_score=rec.score WHERE id=w.id; END IF;
      IF rec.rnk = 3 THEN UPDATE public.crown_wars SET top3_user_id=rec.user_id, top3_score=rec.score WHERE id=w.id; END IF;
      awarded := awarded || jsonb_build_object('rank', rec.rnk, 'user_id', rec.user_id, 'score', rec.score);
    END LOOP;
    UPDATE public.crown_wars SET status='done', settled_at=now(), total_participants=total_n WHERE id=w.id;
  END LOOP;
  hour_start := date_trunc('hour', now());
  IF NOT EXISTS (SELECT 1 FROM public.crown_wars WHERE status='active' AND ends_at > now()) THEN
    INSERT INTO public.crown_wars(started_at, ends_at, status)
    VALUES (hour_start, hour_start + INTERVAL '55 minutes', 'active')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN jsonb_build_object('awarded', awarded, 'now', now());
END $function$;

-- =========== KILL SWITCH ENFORCEMENT ===========
CREATE OR REPLACE FUNCTION public.trg_block_trades_when_halted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _halted BOOLEAN;
BEGIN
  SELECT enabled INTO _halted FROM platform_kill_switches WHERE key = 'trading_halt';
  IF COALESCE(_halted, false) AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'trading_halted' USING HINT = '플랫폼 거래가 일시 중단되었습니다.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS block_trades_when_halted ON public.live_positions;
CREATE TRIGGER block_trades_when_halted BEFORE INSERT ON public.live_positions
FOR EACH ROW EXECUTE FUNCTION public.trg_block_trades_when_halted();

-- =========== withdrawal halt guard via insert trigger on withdrawal_requests ===========
CREATE OR REPLACE FUNCTION public.trg_block_withdrawals_when_halted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _halted BOOLEAN;
BEGIN
  SELECT enabled INTO _halted FROM platform_kill_switches WHERE key = 'withdrawals_halt';
  IF COALESCE(_halted, false) AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'withdrawals_halted' USING HINT = '출금이 일시 중단되었습니다.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS block_withdrawals_when_halted ON public.withdrawal_requests;
CREATE TRIGGER block_withdrawals_when_halted BEFORE INSERT ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_block_withdrawals_when_halted();

-- =========== PHASE C ADMIN METRICS ===========
CREATE OR REPLACE FUNCTION public.admin_get_phase_c_metrics()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _r JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'atelier_24h', (SELECT COALESCE(SUM(cost_phon),0) FROM atelier_runs WHERE created_at > now() - interval '24 hours'),
    'atelier_7d',  (SELECT COALESCE(SUM(cost_phon),0) FROM atelier_runs WHERE created_at > now() - interval '7 days'),
    'atelier_jackpots_7d', (SELECT COUNT(*) FROM atelier_runs WHERE created_at > now() - interval '7 days' AND outcome='jackpot'),
    'marketplace_volume_24h', (SELECT COALESCE(SUM(price_phon),0) FROM nft_trades WHERE created_at > now() - interval '24 hours'),
    'marketplace_volume_7d',  (SELECT COALESCE(SUM(price_phon),0) FROM nft_trades WHERE created_at > now() - interval '7 days'),
    'galaxy_seats_held', (SELECT COUNT(*) FROM galaxy_seats WHERE holder_user_id IS NOT NULL),
    'galaxy_total_locked', (SELECT COALESCE(SUM(current_bid),0) FROM galaxy_seats WHERE holder_user_id IS NOT NULL),
    'galaxy_bids_24h', (SELECT COUNT(*) FROM galaxy_bid_history WHERE created_at > now() - interval '24 hours'),
    'journey_claims_24h', (SELECT COUNT(*) FROM imperial_journey_claims WHERE claimed_at > now() - interval '24 hours'),
    'journey_phon_paid_7d', (SELECT COALESCE(SUM(reward_phon),0) FROM imperial_journey_claims WHERE claimed_at > now() - interval '7 days'),
    'stories_active', (SELECT COUNT(*) FROM imperial_stories WHERE expires_at > now()),
    'dividend_paid_30d', (SELECT COALESCE(SUM(dividend_phon),0) FROM emperor_dividend_log WHERE paid_at > now() - interval '30 days'),
    'crown_war_legendary_total', (SELECT COUNT(*) FROM nft_collection WHERE level='legendary' AND type='crown_war')
  ) INTO _r;
  RETURN _r;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_get_phase_c_metrics() TO authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES
  ('admin_get_phase_c_metrics','','{authenticated}','admin_only','Phase C Week3 metrics'),
  ('trg_block_trades_when_halted','','{}','system_only','BEFORE INSERT live_positions kill switch'),
  ('trg_block_withdrawals_when_halted','','{}','system_only','BEFORE INSERT withdrawal_requests kill switch')
ON CONFLICT (function_name, function_args) DO UPDATE SET allowed_roles = EXCLUDED.allowed_roles, category = EXCLUDED.category, note = EXCLUDED.note, updated_at = now();