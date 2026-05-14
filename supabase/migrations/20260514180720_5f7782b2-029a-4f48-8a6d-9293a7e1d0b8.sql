
-- Admin showcase: allow admins to grant themselves any of the 9 curated NFTs
-- and set as main, free of charge, without cooldown impact.
CREATE OR REPLACE FUNCTION public.admin_grant_self_nft(_type text, _level text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_nft_id uuid;
  v_boost int;
  v_ref text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  IF _type NOT IN ('crown','emperor','founder') THEN
    RAISE EXCEPTION 'invalid_type';
  END IF;
  IF _level NOT IN ('bronze','gold','diamond') THEN
    RAISE EXCEPTION 'invalid_level';
  END IF;

  v_boost := CASE _level
    WHEN 'diamond' THEN 50
    WHEN 'gold' THEN 25
    ELSE 10
  END;
  v_ref := 'showcase:' || _type || ':' || _level;

  -- Idempotent insert via (user_id, source, source_ref) unique index
  INSERT INTO public.nft_collection(user_id, type, level, boost_pct, source, source_ref)
  VALUES (v_uid, _type, _level, v_boost, 'admin', v_ref)
  ON CONFLICT (user_id, source, source_ref) DO UPDATE
    SET type = EXCLUDED.type, level = EXCLUDED.level, boost_pct = EXCLUDED.boost_pct
  RETURNING id INTO v_nft_id;

  -- Set as main NFT (bypass guard via SECURITY DEFINER, no cost/cooldown for admin)
  UPDATE public.profiles
    SET main_nft_id = v_nft_id
    WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'nft_id', v_nft_id,
    'type', _type,
    'level', _level,
    'boost_pct', v_boost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_self_nft(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_self_nft(text, text) TO authenticated;
