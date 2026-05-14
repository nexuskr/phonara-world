-- Restrict pay_config SELECT to authenticated users only.
-- The TRON receive address should not be enumerable by anonymous visitors.
-- Authenticated deposit flows already use the get_pay_receive_address() RPC.
DROP POLICY IF EXISTS pay_config_public_read ON public.pay_config;

CREATE POLICY pay_config_authenticated_read
ON public.pay_config
FOR SELECT
TO authenticated
USING (true);