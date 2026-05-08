-- 1. notification_preferences
CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN ('withdraw_pending','withdraw_approved','withdraw_processing','withdraw_completed','withdraw_rejected')),
  channel text NOT NULL CHECK (channel IN ('push','email','sms')),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event, channel)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "np_self_select" ON public.notification_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "np_self_upsert" ON public.notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "np_self_update" ON public.notification_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "np_self_delete" ON public.notification_preferences
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. withdrawal_requests.receipt_url
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS receipt_url text;

-- 3. storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('withdraw-receipts', 'withdraw-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "wr_owner_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'withdraw-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "wr_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'withdraw-receipts' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "wr_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'withdraw-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);