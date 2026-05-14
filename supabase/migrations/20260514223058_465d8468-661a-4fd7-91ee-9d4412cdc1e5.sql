
create or replace function public.get_world_domination_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  _gmv_24h numeric;
  _payout_total numeric;
  _active_emperors int;
  _max_crown_24h numeric;
  _active_users_24h int;
  _signed_up_today int;
begin
  select coalesce(sum(amount_phon), 0) into _gmv_24h
    from withdrawal_requests
    where status = 'completed'
      and updated_at >= now() - interval '24 hours';

  select coalesce(sum(amount_phon), 0) into _payout_total
    from withdrawal_requests
    where status = 'completed';

  select count(*) into _active_emperors
    from empire_levels
    where level >= 7;

  select coalesce(max(crown_amount), 0) into _max_crown_24h
    from crown_events
    where created_at >= now() - interval '24 hours';

  select count(distinct user_id) into _active_users_24h
    from crown_events
    where created_at >= now() - interval '24 hours';

  select count(*) into _signed_up_today
    from profiles
    where created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';

  return jsonb_build_object(
    'gmv_24h', _gmv_24h,
    'payout_total', _payout_total,
    'active_emperors', _active_emperors,
    'max_crown_24h', _max_crown_24h,
    'active_users_24h', _active_users_24h,
    'signed_up_today', _signed_up_today,
    'server_now', extract(epoch from now())
  );
end;
$$;

revoke all on function public.get_world_domination_stats() from public;
grant execute on function public.get_world_domination_stats() to anon, authenticated;

create or replace function public.get_live_activity_60s(_limit int default 30)
returns table(
  kind text,
  flag text,
  title text,
  amount numeric,
  user_mask text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  return query
  with nft_mint as (
    select 'nft_mint'::text as kind,
           '🪐'::text as flag,
           upper(level)||' '||type as title,
           coalesce(boost_pct, 0)::numeric as amount,
           ('Empire '||substr(md5(user_id::text), 1, 4))::text as user_mask,
           created_at
      from nft_collection
     where created_at >= now() - interval '60 seconds'
  ),
  crowns as (
    select 'crown_explosion'::text as kind,
           '👑'::text as flag,
           'Crown Explosion'::text as title,
           coalesce(crown_amount, 0)::numeric as amount,
           ('Whale '||substr(md5(user_id::text), 1, 4))::text as user_mask,
           created_at
      from crown_events
     where created_at >= now() - interval '60 seconds'
       and crown_amount >= 10
  ),
  promotions as (
    select 'baron_promotion'::text as kind,
           '⚜️'::text as flag,
           'Tier '||level::text as title,
           level::numeric as amount,
           ('Baron '||substr(md5(user_id::text), 1, 4))::text as user_mask,
           updated_at as created_at
      from empire_levels
     where level >= 7
       and updated_at >= now() - interval '60 seconds'
  )
  select * from (
    select * from nft_mint
    union all select * from crowns
    union all select * from promotions
  ) u
  order by u.created_at desc
  limit greatest(1, least(_limit, 50));
end;
$$;

revoke all on function public.get_live_activity_60s(int) from public;
grant execute on function public.get_live_activity_60s(int) to anon, authenticated;

insert into function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
values
  ('get_world_domination_stats', '', array['anon','authenticated']::text[], 'public_stats', 'Phase D Week 1: 홈 World Wall 공개 KPI'),
  ('get_live_activity_60s', 'integer', array['anon','authenticated']::text[], 'public_stats', 'Phase D Week 1: 60초 Live Now 피드')
on conflict do nothing;
