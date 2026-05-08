DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname AS fn,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND (
        p.proname LIKE 'admin\_%'           ESCAPE '\'
        OR p.proname LIKE '\_cron\_%'       ESCAPE '\'
        OR p.proname LIKE 'auto\_freeze\_%' ESCAPE '\'
        OR p.proname IN (
          'detect_anomalies',
          'block_withdrawal_when_frozen',
          'handle_new_user',
          'distribute_profit_share',
          'record_chaos_run',
          'ingest_span_quality_alert',
          'log_cron_settle',
          'move_to_dlq',
          'read_email_batch',
          'delete_email',
          'enqueue_email',
          'check_rls_integrity',
          'bulk_acknowledge_anomalies',
          'acknowledge_anomaly',
          '_credit_referral_commission',
          'bump_jackpot',
          'bump_quest_metric',
          'award_xp'
        )
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated;',
                   r.schema, r.fn, r.args);
  END LOOP;
END $$;