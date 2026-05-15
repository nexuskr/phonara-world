CREATE OR REPLACE FUNCTION public.get_world_domination_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
declare
  _gmv_24h numeric;
  _payout_total numeric;
  _active_emperors int;
  _max_crown_24h numeric;
  _active_users_24h int;
  _signed_up_today int;
begin
  select coalesce(sum(amount), 0) into _gmv_24h
    from withdrawal_requests
    where status = 'completed'
      and coalesce(completed_at, approved_at, created_at) >= now() - interval '24 hours';

  select coalesce(sum(amount), 0) into _payout_total
    from withdrawal_requests
    where status = 'completed';

  select count(*) into _active_emperors
    from empire_levels
    where level >= 7;

  select coalesce(max(awarded_amount), 0) into _max_crown_24h
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
$function$;