CREATE OR REPLACE FUNCTION public.imperial_settle_duel(p_room_id uuid, p_server_seed text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_house uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_room imperial_duel_rooms;
  v_seed_hash text;
  v_roll numeric;
  v_winner text;
  v_left_pot numeric;
  v_right_pot numeric;
  v_total_pot numeric;
  v_winning_pot numeric;
  v_payout_pool numeric;
  v_edge numeric;
  v_house_bal numeric;
  v_bet imperial_duel_bets;
  v_share numeric;
  v_payout numeric;
  v_signals jsonb;
BEGIN
  IF NOT has_role(v_uid,'admin'::app_role) THEN RAISE EXCEPTION 'not_admin'; END IF;
  IF p_server_seed IS NULL OR length(p_server_seed) < 16 THEN RAISE EXCEPTION 'invalid_seed'; END IF;

  SELECT * INTO v_room FROM imperial_duel_rooms WHERE id=p_room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'room_not_found'; END IF;
  IF v_room.status NOT IN ('open','locked') THEN RAISE EXCEPTION 'room_not_settleable'; END IF;

  v_seed_hash := encode(digest(p_server_seed,'sha256'),'hex');
  IF v_seed_hash <> v_room.server_seed_hash THEN RAISE EXCEPTION 'seed_hash_mismatch'; END IF;

  -- Fair uniform RNG: first 60 bits (15 hex chars) / 2^60 → 0..1 unbiased
  v_roll := (('x' || substr(v_seed_hash,1,15))::bit(60)::bigint)::numeric / 1152921504606846976.0;
  v_winner := CASE WHEN v_roll < 0.5 THEN 'left' ELSE 'right' END;

  SELECT COALESCE(SUM(amount_phon),0) INTO v_left_pot  FROM imperial_duel_bets WHERE room_id=p_room_id AND side='left'  AND status='placed';
  SELECT COALESCE(SUM(amount_phon),0) INTO v_right_pot FROM imperial_duel_bets WHERE room_id=p_room_id AND side='right' AND status='placed';
  v_total_pot := v_left_pot + v_right_pot;
  v_winning_pot := CASE WHEN v_winner='left' THEN v_left_pot ELSE v_right_pot END;

  v_edge := round(v_total_pot * v_room.house_edge_bps / 10000.0, 8);
  v_payout_pool := v_total_pot - v_edge;

  v_signals := imperial_compute_display_signals(v_roll, 0, 0, v_total_pot);

  FOR v_bet IN SELECT * FROM imperial_duel_bets WHERE room_id=p_room_id AND status='placed' FOR UPDATE LOOP
    IF v_bet.side = v_winner AND v_winning_pot > 0 THEN
      v_share := v_bet.amount_phon / v_winning_pot;
      v_payout := round(v_payout_pool * v_share, 8);

      UPDATE phon_balances SET balance=balance+v_payout, updated_at=now() WHERE user_id=v_bet.user_id;
      UPDATE phon_balances SET balance=balance-v_payout, updated_at=now()
        WHERE user_id=v_house RETURNING balance INTO v_house_bal;

      UPDATE imperial_duel_bets SET status='won', settled_at=now(), payout_phon=v_payout WHERE id=v_bet.id;

      INSERT INTO imperial_house_ledger(room_id,kind,amount_phon,balance_after,operator_isolation_flag,meta)
      VALUES (p_room_id,'pot_out',v_payout,v_house_bal,true,
              jsonb_build_object('bet_id',v_bet.id,'user_id',v_bet.user_id));

      INSERT INTO imperial_duel_audit(room_id,user_id,event,amount_phon,
        near_miss_intensity,cinematic_level,display_random,actual_roll,perceived_win_rate,
        server_seed_revealed,meta)
      VALUES (p_room_id,v_bet.user_id,'settled',v_payout,
        (v_signals->>'near_miss_intensity')::numeric,
        (v_signals->>'cinematic_level')::int,
        v_roll, v_roll,
        (v_signals->>'perceived_win_rate')::numeric,
        p_server_seed,
        jsonb_build_object('result','won','side',v_bet.side));
    ELSE
      UPDATE imperial_duel_bets SET status='lost', settled_at=now(), payout_phon=0 WHERE id=v_bet.id;

      INSERT INTO imperial_duel_audit(room_id,user_id,event,amount_phon,
        near_miss_intensity,cinematic_level,display_random,actual_roll,perceived_win_rate,
        server_seed_revealed,meta)
      VALUES (p_room_id,v_bet.user_id,'settled',v_bet.amount_phon,
        (v_signals->>'near_miss_intensity')::numeric,
        (v_signals->>'cinematic_level')::int,
        v_roll, v_roll,
        (v_signals->>'perceived_win_rate')::numeric,
        p_server_seed,
        jsonb_build_object('result','lost','side',v_bet.side));
    END IF;
  END LOOP;

  IF v_edge > 0 THEN
    SELECT balance INTO v_house_bal FROM phon_balances WHERE user_id=v_house;
    INSERT INTO imperial_house_ledger(room_id,kind,amount_phon,balance_after,operator_isolation_flag,meta)
    VALUES (p_room_id,'edge',v_edge,v_house_bal,true,
            jsonb_build_object('house_edge_bps',v_room.house_edge_bps,'total_pot',v_total_pot));
  END IF;

  UPDATE imperial_duel_rooms
    SET status='settled', settle_at=now(), server_seed=p_server_seed, winner_side=v_winner,
        settle_meta = jsonb_build_object(
          'actual_roll', v_roll, 'total_pot', v_total_pot,
          'edge', v_edge, 'payout_pool', v_payout_pool,
          'display_signals', v_signals)
    WHERE id=p_room_id;

  RETURN jsonb_build_object('ok',true,'winner',v_winner,'roll',v_roll,
    'total_pot',v_total_pot,'edge',v_edge,'payout_pool',v_payout_pool,'signals',v_signals);
END $fn$;