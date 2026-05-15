
CREATE TABLE IF NOT EXISTS public.slot_sound_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme text NOT NULL,
  cue text NOT NULL,
  url text NOT NULL,
  version int NOT NULL DEFAULT 1,
  prompt text,
  duration_ms int,
  bytes int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (theme, cue)
);

ALTER TABLE public.slot_sound_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slot_sound_assets_public_read"
  ON public.slot_sound_assets FOR SELECT
  USING (true);

CREATE POLICY "slot_sound_assets_admin_write"
  ON public.slot_sound_assets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_slot_sound_assets_theme ON public.slot_sound_assets(theme);

CREATE TABLE IF NOT EXISTS public.slot_sound_gen_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme text NOT NULL,
  cue text NOT NULL,
  status text NOT NULL,
  error text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.slot_sound_gen_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slot_sound_gen_log_admin_only"
  ON public.slot_sound_gen_log FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_slot_sound_pack(_theme text)
RETURNS TABLE (cue text, url text, version int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cue, url, version
  FROM public.slot_sound_assets
  WHERE theme = _theme;
$$;

GRANT EXECUTE ON FUNCTION public.get_slot_sound_pack(text) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('slot-sfx', 'slot-sfx', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "slot_sfx_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'slot-sfx');

CREATE POLICY "slot_sfx_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'slot-sfx' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "slot_sfx_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'slot-sfx' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "slot_sfx_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'slot-sfx' AND public.has_role(auth.uid(), 'admin'));
