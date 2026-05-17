CREATE OR REPLACE FUNCTION public.get_phon_traders_24h()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(COUNT(DISTINCT user_id), 0)::int
  FROM public.phon_bet_audit
  WHERE action = 'open' AND created_at > now() - INTERVAL '24 hours';
$$;

REVOKE ALL ON FUNCTION public.get_phon_traders_24h() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_phon_traders_24h() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_recent_phon_wins(_limit integer DEFAULT 8)
RETURNS TABLE(masked_nick text, pnl_phon numeric, closed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(LEFT(p.nickname, 1) || '폐X폐', '익명폐') AS masked_nick,
    a.pnl_phon,
    a.created_at AS closed_at
  FROM public.phon_bet_audit a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE a.action = 'close'
    AND a.pnl_phon IS NOT NULL
    AND a.pnl_phon > 0
    AND a.created_at > now() - INTERVAL '24 hours'
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 30));
$$;

REVOKE ALL ON FUNCTION public.get_recent_phon_wins(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_phon_wins(integer) TO authenticated, anon;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES
  ('get_phon_traders_24h', '', ARRAY['authenticated','anon'], 'public_stats', 'PHON 베팅 라이브 트레이더 수 (24h)'),
  ('get_recent_phon_wins', '_limit integer', ARRAY['authenticated','anon'], 'public_stats', 'PHON 최근 수익 청산 (마스킹)')
ON CONFLICT (function_name, function_args) DO NOTHING;