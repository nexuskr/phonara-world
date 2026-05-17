
DO $$ BEGIN
  CREATE TYPE public.avatar_slot AS ENUM (
    'hair','face','eyes','mouth','top','bottom','shoes','gloves','cape','effect','background','title'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.avatar_rarity AS ENUM ('common','rare','epic','legendary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.avatar_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot public.avatar_slot NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rarity public.avatar_rarity NOT NULL DEFAULT 'common',
  price_phon NUMERIC NOT NULL DEFAULT 0,
  emoji TEXT,
  color_hex TEXT,
  shader_id TEXT,
  asset_url TEXT,
  vip_only BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_avatar_parts_slot_rarity ON public.avatar_parts(slot, rarity) WHERE active = TRUE;
ALTER TABLE public.avatar_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "avatar_parts public read" ON public.avatar_parts;
CREATE POLICY "avatar_parts public read" ON public.avatar_parts FOR SELECT USING (active = TRUE);

CREATE TABLE IF NOT EXISTS public.user_avatar_parts_owned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  part_id UUID NOT NULL REFERENCES public.avatar_parts(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  price_paid_phon NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(user_id, part_id)
);
CREATE INDEX IF NOT EXISTS idx_user_avatar_parts_owned_user ON public.user_avatar_parts_owned(user_id);
ALTER TABLE public.user_avatar_parts_owned ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_avatar_parts_owned self read" ON public.user_avatar_parts_owned;
CREATE POLICY "user_avatar_parts_owned self read" ON public.user_avatar_parts_owned FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_avatar_loadout (
  user_id UUID PRIMARY KEY,
  slots JSONB NOT NULL DEFAULT '{}'::jsonb,
  color_hex TEXT,
  pos_x REAL NOT NULL DEFAULT 0,
  pos_y REAL NOT NULL DEFAULT 0,
  anim_phase REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_avatar_loadout ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_avatar_loadout self read" ON public.user_avatar_loadout;
CREATE POLICY "user_avatar_loadout self read" ON public.user_avatar_loadout FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_avatar_loadout self upsert" ON public.user_avatar_loadout;
CREATE POLICY "user_avatar_loadout self upsert" ON public.user_avatar_loadout FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_avatar_loadout self update" ON public.user_avatar_loadout;
CREATE POLICY "user_avatar_loadout self update" ON public.user_avatar_loadout FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_avatar_parts_catalog()
RETURNS TABLE (
  id UUID, slot public.avatar_slot, slug TEXT, name TEXT,
  rarity public.avatar_rarity, price_phon NUMERIC, emoji TEXT,
  color_hex TEXT, shader_id TEXT, asset_url TEXT, vip_only BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, slot, slug, name, rarity, price_phon, emoji, color_hex, shader_id, asset_url, vip_only
  FROM public.avatar_parts
  WHERE active = TRUE
  ORDER BY slot, rarity DESC, price_phon ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_avatar_parts_catalog() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_avatar_loadout()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid UUID := auth.uid(); _row public.user_avatar_loadout%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  SELECT * INTO _row FROM public.user_avatar_loadout WHERE user_id = _uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'slots', '{}'::jsonb, 'color_hex', NULL, 'pos_x', 0, 'pos_y', 0, 'anim_phase', 0);
  END IF;
  RETURN jsonb_build_object('ok', true, 'slots', _row.slots, 'color_hex', _row.color_hex,
    'pos_x', _row.pos_x, 'pos_y', _row.pos_y, 'anim_phase', _row.anim_phase, 'updated_at', _row.updated_at);
END $$;
GRANT EXECUTE ON FUNCTION public.get_my_avatar_loadout() TO authenticated;

CREATE OR REPLACE FUNCTION public.equip_avatar_part(_slot public.avatar_slot, _part_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid UUID := auth.uid(); _owned BOOLEAN; _slot_text TEXT := _slot::text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  IF _part_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_avatar_parts_owned o
      JOIN public.avatar_parts p ON p.id = o.part_id
      WHERE o.user_id = _uid AND o.part_id = _part_id AND p.slot = _slot
    ) INTO _owned;
    IF NOT _owned THEN RETURN jsonb_build_object('ok', false, 'error', 'not_owned'); END IF;
  END IF;
  INSERT INTO public.user_avatar_loadout (user_id, slots, updated_at)
  VALUES (_uid, jsonb_build_object(_slot_text, _part_id), now())
  ON CONFLICT (user_id) DO UPDATE
    SET slots = COALESCE(user_avatar_loadout.slots, '{}'::jsonb) || jsonb_build_object(_slot_text, _part_id),
        updated_at = now();
  RETURN jsonb_build_object('ok', true, 'slot', _slot_text, 'part_id', _part_id);
END $$;
GRANT EXECUTE ON FUNCTION public.equip_avatar_part(public.avatar_slot, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_avatar_pose(_pos_x REAL, _pos_y REAL, _color_hex TEXT, _anim_phase REAL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  INSERT INTO public.user_avatar_loadout (user_id, pos_x, pos_y, color_hex, anim_phase, updated_at)
  VALUES (_uid, COALESCE(_pos_x, 0), COALESCE(_pos_y, 0), _color_hex, COALESCE(_anim_phase, 0), now())
  ON CONFLICT (user_id) DO UPDATE
    SET pos_x = COALESCE(EXCLUDED.pos_x, user_avatar_loadout.pos_x),
        pos_y = COALESCE(EXCLUDED.pos_y, user_avatar_loadout.pos_y),
        color_hex = COALESCE(EXCLUDED.color_hex, user_avatar_loadout.color_hex),
        anim_phase = COALESCE(EXCLUDED.anim_phase, user_avatar_loadout.anim_phase),
        updated_at = now();
  RETURN jsonb_build_object('ok', true);
END $$;
GRANT EXECUTE ON FUNCTION public.save_avatar_pose(REAL, REAL, TEXT, REAL) TO authenticated;

CREATE OR REPLACE FUNCTION public.purchase_avatar_part(_part_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid UUID := auth.uid(); _part public.avatar_parts%ROWTYPE; _bal NUMERIC; _new_bal NUMERIC;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  SELECT * INTO _part FROM public.avatar_parts WHERE id = _part_id AND active = TRUE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'part_not_found'); END IF;
  IF EXISTS (SELECT 1 FROM public.user_avatar_parts_owned WHERE user_id = _uid AND part_id = _part_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_owned');
  END IF;
  IF _part.price_phon > 0 THEN
    SELECT COALESCE(balance, 0) INTO _bal FROM public.phon_balances WHERE user_id = _uid FOR UPDATE;
    IF _bal IS NULL THEN
      INSERT INTO public.phon_balances (user_id, balance) VALUES (_uid, 0) ON CONFLICT DO NOTHING;
      _bal := 0;
    END IF;
    IF _bal < _part.price_phon THEN
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_phon', 'need', _part.price_phon, 'have', _bal);
    END IF;
    _new_bal := _bal - _part.price_phon;
    UPDATE public.phon_balances SET balance = _new_bal, updated_at = now() WHERE user_id = _uid;
  END IF;
  INSERT INTO public.user_avatar_parts_owned (user_id, part_id, price_paid_phon)
  VALUES (_uid, _part_id, _part.price_phon);
  RETURN jsonb_build_object('ok', true, 'part_id', _part_id, 'rarity', _part.rarity,
    'price_phon', _part.price_phon, 'new_balance', COALESCE(_new_bal, _bal, 0));
END $$;
GRANT EXECUTE ON FUNCTION public.purchase_avatar_part(UUID) TO authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES
  ('get_avatar_parts_catalog', '', ARRAY['anon','authenticated'], 'avatar', 'Avatar v3 catalog'),
  ('get_my_avatar_loadout', '', ARRAY['authenticated'], 'avatar', 'Avatar v3 my loadout'),
  ('equip_avatar_part', 'avatar_slot, uuid', ARRAY['authenticated'], 'avatar', 'Avatar v3 equip'),
  ('save_avatar_pose', 'real, real, text, real', ARRAY['authenticated'], 'avatar', 'Avatar v3 pose'),
  ('purchase_avatar_part', 'uuid', ARRAY['authenticated'], 'avatar', 'Avatar v3 PHON purchase')
ON CONFLICT (function_name, function_args) DO NOTHING;

INSERT INTO public.avatar_parts (slot, slug, name, rarity, price_phon, emoji, color_hex) VALUES
  ('hair','hair_basic','기본 머리','common',0,'💇',NULL),
  ('hair','hair_crown','황금 왕관','legendary',5000,'👑','#F5C518'),
  ('face','face_basic','기본 얼굴','common',0,'🙂',NULL),
  ('face','face_emperor','황제의 위엄','epic',1500,'😎',NULL),
  ('eyes','eyes_basic','기본 눈','common',0,'👀',NULL),
  ('eyes','eyes_starfire','별빛 눈','legendary',4000,'✨','#FFD86B'),
  ('mouth','mouth_basic','기본 입','common',0,'👄',NULL),
  ('mouth','mouth_smile','자신감 미소','rare',500,'😄',NULL),
  ('top','top_basic','기본 상의','common',0,'👕',NULL),
  ('top','top_royal_robe','로열 로브','legendary',6000,'🧥','#7C2D12'),
  ('bottom','bottom_basic','기본 하의','common',0,'👖',NULL),
  ('bottom','bottom_gold','황금 바지','epic',2000,'✨','#F5C518'),
  ('shoes','shoes_basic','기본 신발','common',0,'👟',NULL),
  ('shoes','shoes_diamond','다이아 부츠','legendary',5500,'💎','#A5F3FC'),
  ('gloves','gloves_basic','기본 장갑','common',0,'🧤',NULL),
  ('gloves','gloves_phantom','팬텀 장갑','epic',1800,'🖤',NULL),
  ('cape','cape_basic','없음','common',0,NULL,NULL),
  ('cape','cape_imperial','황제 망토','legendary',7000,'🦸','#7C2D12'),
  ('effect','effect_none','없음','common',0,NULL,NULL),
  ('effect','effect_aura_gold','황금 오라','legendary',8000,'🌟','#F5C518'),
  ('background','bg_basic','기본 배경','common',0,NULL,NULL),
  ('background','bg_throne','왕좌 배경','epic',2500,'🏛️','#1F2937'),
  ('title','title_none','없음','common',0,NULL,NULL),
  ('title','title_emperor','황제','legendary',9000,'👑','#F5C518')
ON CONFLICT (slug) DO NOTHING;
