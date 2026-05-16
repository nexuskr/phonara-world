-- ============ VIP TIERS ============
CREATE TABLE IF NOT EXISTS public.vip_tier_config (
  tier              text PRIMARY KEY,
  rank              smallint NOT NULL,
  min_phon          bigint NOT NULL,
  crown_mult        numeric NOT NULL DEFAULT 1.0,
  fee_waiver_pct    smallint NOT NULL DEFAULT 0,
  free_spins        smallint NOT NULL DEFAULT 0,
  whale_lead_seconds smallint NOT NULL DEFAULT 0,
  lounge            boolean NOT NULL DEFAULT false,
  concierge         boolean NOT NULL DEFAULT false,
  withdraw_priority smallint NOT NULL DEFAULT 0,
  event_lead_hours  smallint NOT NULL DEFAULT 0,
  skin_pack         text NOT NULL,
  gradient_from     text NOT NULL,
  gradient_to       text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vip_tier_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vip_tier_config_public_read" ON public.vip_tier_config;
CREATE POLICY "vip_tier_config_public_read" ON public.vip_tier_config FOR SELECT TO authenticated, anon USING (true);

INSERT INTO public.vip_tier_config (tier,rank,min_phon,crown_mult,fee_waiver_pct,free_spins,whale_lead_seconds,lounge,concierge,withdraw_priority,event_lead_hours,skin_pack,gradient_from,gradient_to) VALUES
  ('silver',1,30000,2.0,0,1,15,false,false,0,0,'silver','#cbd5e1','#94a3b8'),
  ('gold',2,100000,3.0,10,3,30,true,false,1,6,'gold','#fde68a','#f59e0b'),
  ('platinum',3,300000,4.0,25,7,60,true,true,2,24,'platinum','#e0e7ff','#818cf8'),
  ('diamond',4,1000000,5.0,50,15,120,true,true,3,48,'diamond','#a7f3d0','#06b6d4')
ON CONFLICT (tier) DO UPDATE SET rank=EXCLUDED.rank,min_phon=EXCLUDED.min_phon,crown_mult=EXCLUDED.crown_mult,fee_waiver_pct=EXCLUDED.fee_waiver_pct,free_spins=EXCLUDED.free_spins,whale_lead_seconds=EXCLUDED.whale_lead_seconds,lounge=EXCLUDED.lounge,concierge=EXCLUDED.concierge,withdraw_priority=EXCLUDED.withdraw_priority,event_lead_hours=EXCLUDED.event_lead_hours,skin_pack=EXCLUDED.skin_pack,gradient_from=EXCLUDED.gradient_from,gradient_to=EXCLUDED.gradient_to;

ALTER TABLE public.vip_passes ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'silver' REFERENCES public.vip_tier_config(tier) ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS idx_vip_passes_tier ON public.vip_passes(tier);

CREATE OR REPLACE FUNCTION public.subscribe_vip_pass_phon(_tier text DEFAULT 'silver')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid(); v_cost numeric; v_bal numeric; v_now timestamptz:=now(); v_new_expires timestamptz; v_existing public.vip_passes%ROWTYPE; v_cur_rank int:=0; v_new_rank int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT min_phon,rank INTO v_cost,v_new_rank FROM public.vip_tier_config WHERE tier=_tier;
  IF v_cost IS NULL THEN RAISE EXCEPTION 'invalid_tier'; END IF;
  SELECT balance INTO v_bal FROM public.phon_balances WHERE user_id=v_uid FOR UPDATE;
  IF COALESCE(v_bal,0)<v_cost THEN RAISE EXCEPTION 'insufficient_phon'; END IF;
  SELECT * INTO v_existing FROM public.vip_passes WHERE user_id=v_uid FOR UPDATE;
  IF v_existing.user_id IS NOT NULL AND v_existing.active AND v_existing.expires_at>v_now THEN
    v_new_expires:=v_existing.expires_at+interval '30 days';
    SELECT rank INTO v_cur_rank FROM public.vip_tier_config WHERE tier=v_existing.tier;
  ELSE v_new_expires:=v_now+interval '30 days'; END IF;
  UPDATE public.phon_balances SET balance=balance-v_cost,updated_at=v_now WHERE user_id=v_uid;
  INSERT INTO public.phon_transactions(user_id,amount,kind,ref,meta) VALUES(v_uid,-v_cost,'vip_pass_subscribe',_tier,jsonb_build_object('new_expires',v_new_expires,'tier',_tier));
  INSERT INTO public.vip_passes(user_id,active,started_at,expires_at,renewals,last_paid_phon,last_paid_at,source,tier)
    VALUES(v_uid,true,v_now,v_new_expires,1,v_cost,v_now,'phon',_tier)
  ON CONFLICT (user_id) DO UPDATE SET active=true,expires_at=v_new_expires,renewals=public.vip_passes.renewals+1,last_paid_phon=v_cost,last_paid_at=v_now,source='phon',
    tier=CASE WHEN v_new_rank>COALESCE(v_cur_rank,0) THEN _tier ELSE public.vip_passes.tier END, updated_at=v_now;
  RETURN jsonb_build_object('ok',true,'expires_at',v_new_expires,'paid_phon',v_cost,'tier',_tier);
END;$$;

CREATE OR REPLACE FUNCTION public.get_my_vip_tier()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid(); v_active boolean:=false; v_tier text:='silver'; v_cur record; v_next record; v_progress numeric:=0;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('active',false,'tier',null); END IF;
  SELECT (vp.active AND vp.expires_at>now()),vp.tier INTO v_active,v_tier FROM public.vip_passes vp WHERE vp.user_id=v_uid;
  IF NOT COALESCE(v_active,false) THEN v_tier:='silver'; END IF;
  SELECT * INTO v_cur FROM public.vip_tier_config WHERE tier=v_tier;
  SELECT * INTO v_next FROM public.vip_tier_config WHERE rank=v_cur.rank+1;
  IF v_next.tier IS NOT NULL THEN v_progress:=LEAST(100,ROUND(100.0*v_cur.min_phon/v_next.min_phon,1)); ELSE v_progress:=100; END IF;
  RETURN jsonb_build_object('active',COALESCE(v_active,false),'tier',v_cur.tier,
    'benefits',jsonb_build_object('crown_mult',v_cur.crown_mult,'fee_waiver_pct',v_cur.fee_waiver_pct,'free_spins',v_cur.free_spins,'whale_lead_seconds',v_cur.whale_lead_seconds,'lounge',v_cur.lounge,'concierge',v_cur.concierge,'withdraw_priority',v_cur.withdraw_priority,'event_lead_hours',v_cur.event_lead_hours,'skin_pack',v_cur.skin_pack,'gradient_from',v_cur.gradient_from,'gradient_to',v_cur.gradient_to),
    'next_tier',CASE WHEN v_next.tier IS NULL THEN NULL ELSE jsonb_build_object('tier',v_next.tier,'min_phon',v_next.min_phon,'crown_mult',v_next.crown_mult) END,
    'progress_pct',v_progress);
END;$$;
GRANT EXECUTE ON FUNCTION public.get_my_vip_tier() TO authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_vip_pass_phon(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.award_crown(_type text,_base integer,_meta jsonb DEFAULT '{}'::jsonb,_dedupe_key text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user UUID:=auth.uid(); v_level INT; v_streak INT; v_variance NUMERIC; v_level_mult NUMERIC; v_streak_mult NUMERIC; v_type_mult NUMERIC; v_vip_mult NUMERIC:=1.0; v_is_vip boolean:=false; v_vip_tier text:='silver'; v_expected INT; v_awarded INT; v_rpe NUMERIC; v_dedupe TEXT; v_recent INT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _base<0 OR _base>10000 THEN RAISE EXCEPTION 'base out of range'; END IF;
  SELECT COUNT(*) INTO v_recent FROM public.crown_events WHERE user_id=v_user AND created_at>now()-interval '1 second';
  IF v_recent>=5 THEN RAISE EXCEPTION 'rate_limited' USING ERRCODE='42501'; END IF;
  v_dedupe:=COALESCE(_dedupe_key,_type||':'||to_char(now(),'YYYYMMDDHH24MISSMS')||':'||md5(random()::text));
  SELECT empire_level,COALESCE(attendance_streak,0) INTO v_level,v_streak FROM public.profiles WHERE id=v_user;
  v_level:=COALESCE(v_level,1);
  v_is_vip:=public.is_vip_active(v_user);
  IF v_is_vip THEN
    SELECT tier INTO v_vip_tier FROM public.vip_passes WHERE user_id=v_user;
    SELECT crown_mult INTO v_vip_mult FROM public.vip_tier_config WHERE tier=COALESCE(v_vip_tier,'silver');
    v_vip_mult:=COALESCE(v_vip_mult,2.0);
  END IF;
  v_variance:=0.55+random()*(2.9-0.55);
  v_level_mult:=1+v_level*0.08;
  v_streak_mult:=1+power(LEAST(v_streak,30)::numeric/7,1.6)*0.5;
  v_type_mult:=CASE _type WHEN 'practice_win' THEN 1.80 WHEN 'first_win' THEN 1.80 WHEN 'big_win' THEN 1.80 WHEN 'streak' THEN 1.25 ELSE 1.00 END;
  v_expected:=GREATEST(1,ROUND(_base*v_level_mult*v_streak_mult*v_type_mult*v_vip_mult));
  v_awarded:=GREATEST(1,ROUND(_base*v_variance*v_level_mult*v_streak_mult*v_type_mult*v_vip_mult));
  v_rpe:=(v_awarded-v_expected)::numeric/GREATEST(v_expected,1);
  BEGIN
    INSERT INTO public.crown_events(user_id,event_type,base_amount,awarded_amount,variance,level_mult,streak_mult,type_mult,expected_amount,rpe,meta,dedupe_key)
    VALUES(v_user,_type,_base,v_awarded,v_variance,v_level_mult,v_streak_mult,v_type_mult,v_expected,v_rpe,_meta||jsonb_build_object('vip_bonus',v_is_vip,'vip_mult',v_vip_mult,'vip_tier',v_vip_tier),v_dedupe);
  EXCEPTION WHEN unique_violation THEN
    SELECT awarded_amount,expected_amount,rpe INTO v_awarded,v_expected,v_rpe FROM public.crown_events WHERE user_id=v_user AND dedupe_key=v_dedupe;
    RETURN jsonb_build_object('awarded',v_awarded,'expected',v_expected,'rpe',v_rpe,'duplicate',true,'level',v_level,'vip_bonus',v_is_vip);
  END;
  RETURN jsonb_build_object('awarded',v_awarded,'expected',v_expected,'rpe',v_rpe,'duplicate',false,'level',v_level,'streak',v_streak,'vip_bonus',v_is_vip,'vip_mult',v_vip_mult,'vip_tier',v_vip_tier);
END;$$;

-- ============ AVATAR SHOP ============
CREATE TABLE IF NOT EXISTS public.avatar_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  rarity text NOT NULL CHECK (rarity IN ('common','rare','epic','legendary','mythic')),
  vip_min_tier text REFERENCES public.vip_tier_config(tier),
  price_phon bigint NOT NULL DEFAULT 0,
  nft_source text,
  wearable_bonus jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text,
  emoji text DEFAULT '👤',
  limited_edition_cap int,
  sold_count int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.avatar_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "avatar_catalog_public_read" ON public.avatar_catalog;
CREATE POLICY "avatar_catalog_public_read" ON public.avatar_catalog FOR SELECT TO authenticated, anon USING (active=true);

CREATE TABLE IF NOT EXISTS public.user_avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_id uuid NOT NULL REFERENCES public.avatar_catalog(id) ON DELETE CASCADE,
  equipped boolean NOT NULL DEFAULT false,
  acquired_via text NOT NULL DEFAULT 'purchase',
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, avatar_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_avatars_one_equipped ON public.user_avatars(user_id) WHERE equipped=true;
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_avatars_self_read" ON public.user_avatars;
CREATE POLICY "user_avatars_self_read" ON public.user_avatars FOR SELECT TO authenticated USING (user_id=auth.uid() OR has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "user_avatars_admin_all" ON public.user_avatars;
CREATE POLICY "user_avatars_admin_all" ON public.user_avatars TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.avatar_catalog (slug,name,rarity,vip_min_tier,price_phon,emoji,wearable_bonus,limited_edition_cap,nft_source) VALUES
  ('rookie','루키 영혼','common',NULL,0,'🧑','{}'::jsonb,NULL,NULL),
  ('golden-fox','황금 여우','rare',NULL,2000,'🦊','{"slot_win_boost_bps":50}'::jsonb,NULL,NULL),
  ('neon-tiger','네온 호랑이','rare',NULL,3500,'🐯','{"slot_win_boost_bps":75}'::jsonb,NULL,NULL),
  ('phoenix','불사조','epic','silver',8000,'🔥','{"slot_win_boost_bps":150,"free_spins_daily":1}'::jsonb,5000,NULL),
  ('dragon-king','용왕','epic','gold',20000,'🐉','{"slot_win_boost_bps":250,"crown_mult_bonus":0.5}'::jsonb,2000,NULL),
  ('emperor-mask','황제의 가면','legendary','platinum',60000,'👑','{"slot_win_boost_bps":400,"crown_mult_bonus":1.0,"xp_mult":1.5}'::jsonb,500,'avatar_legendary'),
  ('cosmic-throne','코스믹 옥좌','mythic','diamond',200000,'🌌','{"slot_win_boost_bps":600,"crown_mult_bonus":1.5,"xp_mult":2.0,"free_spins_daily":3}'::jsonb,100,'avatar_mythic'),
  ('bigwin-trophy','대박 트로피','epic',NULL,0,'🏆','{"slot_win_boost_bps":200,"crown_mult_bonus":0.3}'::jsonb,NULL,'avatar_bigwin')
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_avatar_catalog()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid(); v_tier text; v_tier_rank int:=0; v_result jsonb;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT vp.tier INTO v_tier FROM public.vip_passes vp WHERE vp.user_id=v_uid AND vp.active AND vp.expires_at>now();
    SELECT rank INTO v_tier_rank FROM public.vip_tier_config WHERE tier=COALESCE(v_tier,'_none');
  END IF;
  SELECT jsonb_build_object('my_tier_rank',COALESCE(v_tier_rank,0),
    'items',COALESCE(jsonb_agg(jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name,'rarity',c.rarity,'vip_min_tier',c.vip_min_tier,'price_phon',c.price_phon,'nft_source',c.nft_source,'wearable_bonus',c.wearable_bonus,'image_url',c.image_url,'emoji',c.emoji,'limited_edition_cap',c.limited_edition_cap,'sold_count',c.sold_count,
      'remaining',CASE WHEN c.limited_edition_cap IS NULL THEN NULL ELSE GREATEST(0,c.limited_edition_cap-c.sold_count) END,
      'owned',(ua.user_id IS NOT NULL),'equipped',COALESCE(ua.equipped,false),
      'gated',(c.vip_min_tier IS NOT NULL AND COALESCE((SELECT rank FROM public.vip_tier_config WHERE tier=c.vip_min_tier),0)>COALESCE(v_tier_rank,0))
    ) ORDER BY c.rank_order,c.price_phon),'[]'::jsonb)) INTO v_result
  FROM (SELECT cc.*,CASE cc.rarity WHEN 'common' THEN 1 WHEN 'rare' THEN 2 WHEN 'epic' THEN 3 WHEN 'legendary' THEN 4 WHEN 'mythic' THEN 5 ELSE 9 END AS rank_order FROM public.avatar_catalog cc WHERE cc.active=true) c
  LEFT JOIN public.user_avatars ua ON ua.user_id=v_uid AND ua.avatar_id=c.id;
  RETURN v_result;
END;$$;

CREATE OR REPLACE FUNCTION public.purchase_avatar(_avatar_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid(); v_avatar public.avatar_catalog%ROWTYPE; v_tier text; v_tier_rank int:=0; v_need_rank int:=0; v_bal numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO v_avatar FROM public.avatar_catalog WHERE id=_avatar_id AND active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'avatar_not_found'; END IF;
  IF v_avatar.vip_min_tier IS NOT NULL THEN
    SELECT vp.tier INTO v_tier FROM public.vip_passes vp WHERE vp.user_id=v_uid AND vp.active AND vp.expires_at>now();
    SELECT rank INTO v_tier_rank FROM public.vip_tier_config WHERE tier=COALESCE(v_tier,'_none');
    SELECT rank INTO v_need_rank FROM public.vip_tier_config WHERE tier=v_avatar.vip_min_tier;
    IF COALESCE(v_tier_rank,0)<v_need_rank THEN RAISE EXCEPTION 'vip_tier_required'; END IF;
  END IF;
  IF v_avatar.limited_edition_cap IS NOT NULL AND v_avatar.sold_count>=v_avatar.limited_edition_cap THEN RAISE EXCEPTION 'sold_out'; END IF;
  PERFORM 1 FROM public.user_avatars WHERE user_id=v_uid AND avatar_id=_avatar_id;
  IF FOUND THEN RAISE EXCEPTION 'already_owned'; END IF;
  IF v_avatar.price_phon>0 THEN
    SELECT balance INTO v_bal FROM public.phon_balances WHERE user_id=v_uid FOR UPDATE;
    IF COALESCE(v_bal,0)<v_avatar.price_phon THEN RAISE EXCEPTION 'insufficient_phon'; END IF;
    UPDATE public.phon_balances SET balance=balance-v_avatar.price_phon,updated_at=now() WHERE user_id=v_uid;
    INSERT INTO public.phon_transactions(user_id,amount,kind,ref,meta) VALUES(v_uid,-v_avatar.price_phon,'avatar_purchase',v_avatar.slug,jsonb_build_object('avatar_id',_avatar_id));
  END IF;
  INSERT INTO public.user_avatars(user_id,avatar_id,equipped,acquired_via) VALUES(v_uid,_avatar_id,false,'purchase');
  UPDATE public.avatar_catalog SET sold_count=sold_count+1 WHERE id=_avatar_id;
  RETURN jsonb_build_object('ok',true,'avatar_id',_avatar_id,'paid_phon',v_avatar.price_phon);
END;$$;

CREATE OR REPLACE FUNCTION public.equip_avatar(_avatar_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  PERFORM 1 FROM public.user_avatars WHERE user_id=v_uid AND avatar_id=_avatar_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_owned'; END IF;
  UPDATE public.user_avatars SET equipped=false WHERE user_id=v_uid AND equipped=true;
  UPDATE public.user_avatars SET equipped=true WHERE user_id=v_uid AND avatar_id=_avatar_id;
  RETURN jsonb_build_object('ok',true,'equipped',_avatar_id);
END;$$;

CREATE OR REPLACE FUNCTION public.get_my_equipped_avatar()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid(); v jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name,'rarity',c.rarity,'emoji',c.emoji,'image_url',c.image_url,'wearable_bonus',c.wearable_bonus) INTO v
  FROM public.user_avatars ua JOIN public.avatar_catalog c ON c.id=ua.avatar_id WHERE ua.user_id=v_uid AND ua.equipped=true LIMIT 1;
  RETURN v;
END;$$;

CREATE OR REPLACE FUNCTION public.award_avatar_for_bigwin(_user uuid,_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_slug text; v_avatar_id uuid;
BEGIN
  IF _user IS NULL OR _amount IS NULL THEN RETURN NULL; END IF;
  v_slug:=CASE WHEN _amount>=1000000 THEN 'bigwin-trophy' ELSE NULL END;
  IF v_slug IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_avatar_id FROM public.avatar_catalog WHERE slug=v_slug;
  IF v_avatar_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.user_avatars(user_id,avatar_id,equipped,acquired_via) VALUES(_user,v_avatar_id,false,'bigwin') ON CONFLICT (user_id,avatar_id) DO NOTHING;
  RETURN jsonb_build_object('ok',true,'awarded_slug',v_slug);
END;$$;

GRANT EXECUTE ON FUNCTION public.get_avatar_catalog() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.purchase_avatar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.equip_avatar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_equipped_avatar() TO authenticated;

-- ============ EARN HUB: mission_guild ============
CREATE OR REPLACE FUNCTION public.claim_daily_quick_reward(_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid:=auth.uid(); _today date:=(now() AT TIME ZONE 'Asia/Seoul')::date; _amount bigint:=0; _inserted boolean:=false; _new_balance numeric:=0; _eligible boolean:=true;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','auth_required'); END IF;
  _amount:=CASE _kind WHEN 'mission_play' THEN 100 WHEN 'mission_invite' THEN 150 WHEN 'mission_deposit' THEN 300 WHEN 'play_today' THEN 80 WHEN 'mission_guild' THEN 500 ELSE 0 END;
  IF _amount=0 THEN RETURN jsonb_build_object('ok',false,'error','invalid_kind'); END IF;
  IF _kind='mission_guild' THEN
    SELECT EXISTS(SELECT 1 FROM public.guild_members WHERE user_id=_uid) INTO _eligible;
    IF NOT _eligible THEN RETURN jsonb_build_object('ok',false,'error','requires_guild'); END IF;
  END IF;
  INSERT INTO public.daily_quick_claims(user_id,kind,day,amount) VALUES(_uid,_kind,_today,_amount)
  ON CONFLICT (user_id,kind,day) DO NOTHING RETURNING true INTO _inserted;
  IF NOT COALESCE(_inserted,false) THEN
    SELECT balance INTO _new_balance FROM public.phon_balances WHERE user_id=_uid;
    RETURN jsonb_build_object('ok',true,'already_claimed',true,'kind',_kind,'amount',0,'balance',COALESCE(_new_balance,0));
  END IF;
  INSERT INTO public.phon_balances(user_id,balance) VALUES(_uid,_amount)
  ON CONFLICT (user_id) DO UPDATE SET balance=public.phon_balances.balance+EXCLUDED.balance,updated_at=now() RETURNING balance INTO _new_balance;
  RETURN jsonb_build_object('ok',true,'already_claimed',false,'kind',_kind,'amount',_amount,'balance',_new_balance);
END;$$;