-- Admin: Trust v2 통계
CREATE OR REPLACE FUNCTION public.admin_get_trust_v2_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  WITH r AS (
    SELECT
      count(*) FILTER (WHERE status='pending')::int AS rr_pending,
      count(*) FILTER (WHERE status='approved')::int AS rr_approved,
      count(*) FILTER (WHERE status='rejected')::int AS rr_rejected,
      count(*) FILTER (WHERE status='completed')::int AS rr_completed,
      COALESCE(SUM(amount_krw) FILTER (WHERE status IN ('approved','completed')), 0)::numeric AS rr_total_refunded_krw,
      count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS rr_last_7d
    FROM public.refund_requests
  ),
  l AS (
    SELECT
      count(*)::int AS lpc_count,
      COALESCE(SUM(net_loss_krw), 0)::numeric AS lpc_net_loss_krw,
      COALESCE(SUM(refunded_phon), 0)::numeric AS lpc_refunded_phon,
      COALESCE(AVG(refunded_phon / NULLIF(net_loss_krw, 0)), 0)::numeric AS lpc_avg_ratio,
      count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS lpc_last_7d
    FROM public.loss_protection_claims
  ),
  g AS (
    SELECT
      count(*)::int AS godmode_total,
      count(*) FILTER (WHERE loss_protection_until > now())::int AS godmode_active_protection
    FROM public.first_deposit_godmode
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'refunds', jsonb_build_object(
      'pending', r.rr_pending,
      'approved', r.rr_approved,
      'rejected', r.rr_rejected,
      'completed', r.rr_completed,
      'total_refunded_krw', r.rr_total_refunded_krw,
      'last_7d', r.rr_last_7d
    ),
    'loss_protection', jsonb_build_object(
      'claims', l.lpc_count,
      'net_loss_krw', l.lpc_net_loss_krw,
      'refunded_phon', l.lpc_refunded_phon,
      'avg_ratio', l.lpc_avg_ratio,
      'last_7d', l.lpc_last_7d
    ),
    'godmode', jsonb_build_object(
      'total', g.godmode_total,
      'active_protection', g.godmode_active_protection
    )
  ) INTO v
  FROM r, l, g;

  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_trust_v2_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_trust_v2_stats() TO authenticated;

-- Admin: 환불 요청 목록
CREATE OR REPLACE FUNCTION public.admin_list_refund_requests(
  _status text DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  nickname text,
  reason text,
  amount_krw numeric,
  status text,
  admin_memo text,
  created_at timestamptz,
  resolved_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  RETURN QUERY
  SELECT
    r.id, r.user_id,
    COALESCE(p.nickname, '익명') AS nickname,
    r.reason, r.amount_krw, r.status, r.admin_memo,
    r.created_at, r.resolved_at
  FROM public.refund_requests r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE (_status IS NULL OR r.status = _status)
  ORDER BY
    CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
    r.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 200))
  OFFSET GREATEST(0, _offset);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_refund_requests(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_refund_requests(text, int, int) TO authenticated;