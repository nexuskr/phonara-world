
CREATE OR REPLACE FUNCTION public.delete_guild()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _gid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT id INTO _gid FROM public.guilds WHERE leader_id = _uid;
  IF _gid IS NULL THEN RAISE EXCEPTION 'not_leader'; END IF;

  -- Block deletion while active wars are running
  IF EXISTS (
    SELECT 1 FROM public.guild_wars
    WHERE status = 'active'
      AND (attacker_guild_id = _gid OR defender_guild_id = _gid)
  ) THEN
    RAISE EXCEPTION 'active_war_in_progress';
  END IF;

  -- Cascade deletes guild_members, guild_chat_messages, guild_activity_feed,
  -- guild_war_contributions, guild_wars (via FK ON DELETE CASCADE)
  DELETE FROM public.guilds WHERE id = _gid AND leader_id = _uid;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_guild() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_guild() TO authenticated;

-- Allow leader to leave (transfer leadership to highest-contribution member, or delete if alone)
CREATE OR REPLACE FUNCTION public.leave_guild()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _gid uuid;
  _role text;
  _heir uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT guild_id, role INTO _gid, _role FROM public.guild_members WHERE user_id = _uid;
  IF _gid IS NULL THEN RAISE EXCEPTION 'not_in_guild'; END IF;

  IF _role = 'leader' THEN
    -- Find highest-contribution non-leader member
    SELECT user_id INTO _heir
    FROM public.guild_members
    WHERE guild_id = _gid AND user_id <> _uid
    ORDER BY contribution DESC, joined_at ASC
    LIMIT 1;

    IF _heir IS NULL THEN
      -- Alone: delete the guild
      DELETE FROM public.guilds WHERE id = _gid AND leader_id = _uid;
      RETURN true;
    END IF;

    -- Transfer leadership
    UPDATE public.guild_members SET role = 'leader' WHERE guild_id = _gid AND user_id = _heir;
    UPDATE public.guilds SET leader_id = _heir, updated_at = now() WHERE id = _gid;
  END IF;

  DELETE FROM public.guild_members WHERE user_id = _uid;
  UPDATE public.guilds
    SET member_count = GREATEST(member_count - 1, 0), updated_at = now()
    WHERE id = _gid;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_guild() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_guild() TO authenticated;
