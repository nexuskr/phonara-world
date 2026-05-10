
INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note)
VALUES ('admin_liquidate_position','uuid, numeric','{}','trading','Service-role only auto-liquidation by liquidation-watcher')
ON CONFLICT (function_name, function_args) DO UPDATE SET allowed_roles='{}', note=EXCLUDED.note;
