
CREATE TABLE IF NOT EXISTS public.guilds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  emblem text NOT NULL DEFAULT '🏰',
  leader_id uuid NOT NULL,
  total_power bigint NOT NULL DEFAULT 0,
  member_count integer NOT NULL DEFAULT 1,
  max_members integer NOT NULL DEFAULT 30,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guild_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('leader','officer','member')),
  contribution bigint NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON public.guild_members(guild_id);

CREATE TABLE IF NOT EXISTS public.guild_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guild_chat_guild_created ON public.guild_chat_messages(guild_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.guild_wars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  defender_guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','finished','cancelled')),
  attacker_score bigint NOT NULL DEFAULT 0,
  defender_score bigint NOT NULL DEFAULT 0,
  winner_guild_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  CHECK (attacker_guild_id <> defender_guild_id)
);
CREATE INDEX IF NOT EXISTS idx_guild_wars_status ON public.guild_wars(status, ends_at);

CREATE TABLE IF NOT EXISTS public.guild_war_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id uuid NOT NULL REFERENCES public.guild_wars(id) ON DELETE CASCADE,
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  score bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gwc_war_guild ON public.guild_war_contributions(war_id, guild_id);

ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_wars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_war_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guilds_public_read" ON public.guilds FOR SELECT USING (true);
CREATE POLICY "guilds_admin_all" ON public.guilds FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.is_guild_member(_user_id uuid, _guild_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.guild_members WHERE user_id = _user_id AND guild_id = _guild_id);
$$;

CREATE POLICY "guild_members_self_or_same_guild" ON public.guild_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_guild_member(auth.uid(), guild_id)
    OR public.has_role(auth.uid(),'admin'::app_role)
  );

CREATE POLICY "guild_chat_members_only" ON public.guild_chat_messages FOR SELECT
  USING (public.is_guild_member(auth.uid(), guild_id) OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "guild_wars_public_read" ON public.guild_wars FOR SELECT USING (true);

CREATE POLICY "gwc_members_only" ON public.guild_war_contributions FOR SELECT
  USING (public.is_guild_member(auth.uid(), guild_id) OR public.has_role(auth.uid(),'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.guild_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guild_wars;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guild_war_contributions;

CREATE OR REPLACE FUNCTION public.create_guild(_name text, _emblem text DEFAULT '🏰', _description text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _gid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF EXISTS(SELECT 1 FROM public.guild_members WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'already_in_guild';
  END IF;
  IF char_length(coalesce(_name,'')) < 2 OR char_length(_name) > 30 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  INSERT INTO public.guilds(name, emblem, leader_id, description)
    VALUES(_name, coalesce(_emblem,'🏰'), _uid, _description)
    RETURNING id INTO _gid;
  INSERT INTO public.guild_members(guild_id, user_id, role) VALUES(_gid, _uid, 'leader');
  RETURN _gid;
END $$;

CREATE OR REPLACE FUNCTION public.join_guild(_guild_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _count int; _max int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF EXISTS(SELECT 1 FROM public.guild_members WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'already_in_guild';
  END IF;
  SELECT member_count, max_members INTO _count, _max FROM public.guilds WHERE id = _guild_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'guild_not_found'; END IF;
  IF _count >= _max THEN RAISE EXCEPTION 'guild_full'; END IF;
  INSERT INTO public.guild_members(guild_id, user_id) VALUES(_guild_id, _uid);
  UPDATE public.guilds SET member_count = member_count + 1, updated_at = now() WHERE id = _guild_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.leave_guild()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _gid uuid; _role text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT guild_id, role INTO _gid, _role FROM public.guild_members WHERE user_id = _uid;
  IF _gid IS NULL THEN RAISE EXCEPTION 'not_in_guild'; END IF;
  IF _role = 'leader' THEN RAISE EXCEPTION 'leader_must_transfer'; END IF;
  DELETE FROM public.guild_members WHERE user_id = _uid;
  UPDATE public.guilds SET member_count = GREATEST(member_count - 1, 0), updated_at = now() WHERE id = _gid;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.send_guild_message(_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _gid uuid; _mid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT guild_id INTO _gid FROM public.guild_members WHERE user_id = _uid;
  IF _gid IS NULL THEN RAISE EXCEPTION 'not_in_guild'; END IF;
  IF char_length(coalesce(_message,'')) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid_message'; END IF;
  IF (SELECT count(*) FROM public.guild_chat_messages WHERE user_id = _uid AND created_at > now() - interval '1 minute') >= 30 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  INSERT INTO public.guild_chat_messages(guild_id, user_id, message) VALUES(_gid, _uid, _message) RETURNING id INTO _mid;
  RETURN _mid;
END $$;

CREATE OR REPLACE FUNCTION public.declare_guild_war(_defender_guild_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _att uuid; _role text; _wid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT guild_id, role INTO _att, _role FROM public.guild_members WHERE user_id = _uid;
  IF _att IS NULL THEN RAISE EXCEPTION 'not_in_guild'; END IF;
  IF _role NOT IN ('leader','officer') THEN RAISE EXCEPTION 'no_permission'; END IF;
  IF _att = _defender_guild_id THEN RAISE EXCEPTION 'cannot_war_self'; END IF;
  IF EXISTS(
    SELECT 1 FROM public.guild_wars
    WHERE status='active' AND (
      (attacker_guild_id=_att AND defender_guild_id=_defender_guild_id)
      OR (attacker_guild_id=_defender_guild_id AND defender_guild_id=_att)
    )
  ) THEN RAISE EXCEPTION 'war_already_active'; END IF;
  INSERT INTO public.guild_wars(attacker_guild_id, defender_guild_id) VALUES(_att, _defender_guild_id) RETURNING id INTO _wid;
  RETURN _wid;
END $$;

CREATE OR REPLACE FUNCTION public.contribute_guild_war(_war_id uuid, _score bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _gid uuid; _war record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _score <= 0 OR _score > 10000 THEN RAISE EXCEPTION 'invalid_score'; END IF;
  SELECT guild_id INTO _gid FROM public.guild_members WHERE user_id = _uid;
  IF _gid IS NULL THEN RAISE EXCEPTION 'not_in_guild'; END IF;
  SELECT * INTO _war FROM public.guild_wars WHERE id = _war_id FOR UPDATE;
  IF NOT FOUND OR _war.status <> 'active' OR _war.ends_at < now() THEN RAISE EXCEPTION 'war_inactive'; END IF;
  IF _gid <> _war.attacker_guild_id AND _gid <> _war.defender_guild_id THEN RAISE EXCEPTION 'not_a_participant'; END IF;

  INSERT INTO public.guild_war_contributions(war_id, guild_id, user_id, score)
    VALUES(_war_id, _gid, _uid, _score);

  IF _gid = _war.attacker_guild_id THEN
    UPDATE public.guild_wars SET attacker_score = attacker_score + _score WHERE id = _war_id;
  ELSE
    UPDATE public.guild_wars SET defender_score = defender_score + _score WHERE id = _war_id;
  END IF;

  UPDATE public.guild_members SET contribution = contribution + _score WHERE user_id = _uid;
  UPDATE public.guilds SET total_power = total_power + _score, updated_at = now() WHERE id = _gid;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.get_guild_leaderboard(_limit int DEFAULT 20)
RETURNS TABLE(guild_id uuid, name text, emblem text, total_power bigint, member_count int, rank int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, emblem, total_power, member_count,
    (rank() OVER (ORDER BY total_power DESC))::int AS rank
  FROM public.guilds ORDER BY total_power DESC LIMIT GREATEST(_limit, 1);
$$;

INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note) VALUES
  ('public.create_guild','text, text, text', ARRAY['authenticated'],'guild','P4 guild create'),
  ('public.join_guild','uuid', ARRAY['authenticated'],'guild','P4 guild join'),
  ('public.leave_guild','', ARRAY['authenticated'],'guild','P4 guild leave'),
  ('public.send_guild_message','text', ARRAY['authenticated'],'guild','P4 chat send'),
  ('public.declare_guild_war','uuid', ARRAY['authenticated'],'guild','P4 declare war'),
  ('public.contribute_guild_war','uuid, bigint', ARRAY['authenticated'],'guild','P4 contribute war'),
  ('public.get_guild_leaderboard','integer', ARRAY['authenticated','anon'],'guild','P4 leaderboard'),
  ('public.is_guild_member','uuid, uuid', ARRAY['authenticated'],'guild','P4 guild membership check')
ON CONFLICT DO NOTHING;

GRANT EXECUTE ON FUNCTION public.create_guild(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_guild(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_guild() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_guild_message(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.declare_guild_war(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contribute_guild_war(uuid, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guild_leaderboard(int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_guild_member(uuid, uuid) TO authenticated;
