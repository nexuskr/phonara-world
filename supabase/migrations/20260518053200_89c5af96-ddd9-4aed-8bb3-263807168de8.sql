-- 1) Restrict pay_config SELECT to admin only; clients use get_pay_receive_address() RPC
DROP POLICY IF EXISTS pay_config_authenticated_read ON public.pay_config;
CREATE POLICY pay_config_admin_read ON public.pay_config
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) Remove admin-only sensitive tables from realtime publication to prevent broadcast leakage
ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_audit_log;
ALTER PUBLICATION supabase_realtime DROP TABLE public.anomaly_events;
ALTER PUBLICATION supabase_realtime DROP TABLE public.account_freezes;
ALTER PUBLICATION supabase_realtime DROP TABLE public.error_logs;