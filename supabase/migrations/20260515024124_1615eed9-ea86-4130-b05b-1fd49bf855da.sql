CREATE OR REPLACE FUNCTION public.get_live_activity_60s(_limit integer DEFAULT 30)
 RETURNS TABLE(kind text, flag text, title text, amount numeric, user_mask text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  return query
  with nft_mint as (
    select 'nft_mint'::text as kind,
           '🪐'::text as flag,
           (upper(nc.level)||' '||nc.type)::text as title,
           coalesce(nc.boost_pct, 0)::numeric as amount,
           ('Empire '||substr(md5(nc.user_id::text), 1, 4))::text as user_mask,
           nc.created_at
      from public.nft_collection nc
     where nc.created_at >= now() - interval '60 seconds'
  ),
  crowns as (
    select 'crown_explosion'::text as kind,
           '👑'::text as flag,
           'Crown Explosion'::text as title,
           coalesce(ce.awarded_amount, 0)::numeric as amount,
           ('Whale '||substr(md5(ce.user_id::text), 1, 4))::text as user_mask,
           ce.created_at
      from public.crown_events ce
     where ce.created_at >= now() - interval '60 seconds'
       and ce.awarded_amount >= 10
  ),
  promotions as (
    select 'baron_promotion'::text as kind,
           '⚜️'::text as flag,
           ('Tier '||p.empire_level::text)::text as title,
           p.empire_level::numeric as amount,
           ('Baron '||substr(md5(p.user_id::text), 1, 4))::text as user_mask,
           p.updated_at as created_at
      from public.profiles p
     where p.empire_level >= 7
       and p.updated_at >= now() - interval '60 seconds'
  )
  select u.kind, u.flag, u.title, u.amount, u.user_mask, u.created_at from (
    select * from nft_mint
    union all select * from crowns
    union all select * from promotions
  ) u
  order by u.created_at desc
  limit greatest(1, least(_limit, 50));
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_emperor_24h()
 RETURNS TABLE(user_mask text, total_crown numeric, empire_level integer, flag text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID;
  _total NUMERIC;
BEGIN
  SELECT ce.user_id, SUM(ce.awarded_amount)::NUMERIC
  INTO _uid, _total
  FROM public.crown_events ce
  WHERE ce.created_at > now() - INTERVAL '24 hours' AND ce.awarded_amount > 0
  GROUP BY ce.user_id ORDER BY 2 DESC LIMIT 1;
  IF _uid IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT
    ('Emperor ' || substring(_uid::text, 1, 4))::TEXT,
    _total,
    COALESCE((SELECT p.empire_level FROM public.profiles p WHERE p.user_id = _uid), 1)::INT,
    (ARRAY['🇰🇷','🇯🇵','🇺🇸','🇸🇬','🇹🇼','🇻🇳','🇮🇩','🇭🇰','🇲🇾','🇹🇭'])[1 + (abs(hashtext(_uid::text)) % 10)]::TEXT;
END;
$function$;