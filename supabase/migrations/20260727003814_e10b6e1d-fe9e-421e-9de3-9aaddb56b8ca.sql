-- ============ Constants ============
CREATE OR REPLACE FUNCTION bananagram_core.const_invitation_ttl_seconds()
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = '' AS $$ SELECT 604800 $$;
CREATE OR REPLACE FUNCTION bananagram_core.const_max_active_invitations_per_circle()
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = '' AS $$ SELECT 20 $$;
CREATE OR REPLACE FUNCTION bananagram_core.const_schema_v1()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$ SELECT 'bananagram.witness-event/v1'::text $$;

ALTER FUNCTION bananagram_core.const_invitation_ttl_seconds() OWNER TO postgres;
ALTER FUNCTION bananagram_core.const_max_active_invitations_per_circle() OWNER TO postgres;
ALTER FUNCTION bananagram_core.const_schema_v1() OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.const_invitation_ttl_seconds() FROM PUBLIC;
REVOKE ALL ON FUNCTION bananagram_core.const_max_active_invitations_per_circle() FROM PUBLIC;
REVOKE ALL ON FUNCTION bananagram_core.const_schema_v1() FROM PUBLIC;

-- ============ Helpers (internal, no external grants) ============

-- ISO string identical to new Date().toISOString(): YYYY-MM-DDTHH:MM:SS.mmmZ
CREATE OR REPLACE FUNCTION bananagram_core.iso_now()
RETURNS text LANGUAGE sql VOLATILE SET search_path = '' AS $$
  SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;
ALTER FUNCTION bananagram_core.iso_now() OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.iso_now() FROM PUBLIC;

-- Resolve caller display name (fallback to email prefix, then 'unknown')
CREATE OR REPLACE FUNCTION bananagram_core.resolve_actor_label(_uid uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  n text;
BEGIN
  SELECT display_name INTO n FROM public.profiles WHERE user_id = _uid;
  IF n IS NOT NULL AND length(trim(n)) > 0 THEN RETURN n; END IF;
  SELECT split_part(email, '@', 1) INTO n FROM auth.users WHERE id = _uid;
  RETURN COALESCE(n, 'unknown');
END;
$$;
ALTER FUNCTION bananagram_core.resolve_actor_label(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.resolve_actor_label(uuid) FROM PUBLIC;

-- Return caller's membership role for a circle (raises if not a member)
CREATE OR REPLACE FUNCTION bananagram_core.require_circle_role(_circle uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE r text;
BEGIN
  SELECT role INTO r FROM public.circle_memberships
   WHERE circle_id = _circle AND user_id = auth.uid();
  IF r IS NULL THEN RAISE EXCEPTION 'forbidden: not a member of circle' USING ERRCODE = '42501'; END IF;
  RETURN r;
END;
$$;
ALTER FUNCTION bananagram_core.require_circle_role(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.require_circle_role(uuid) FROM PUBLIC;

-- Derive current status of a need from events; raise if closed or missing.
CREATE OR REPLACE FUNCTION bananagram_core.derive_need(_circle uuid, _need uuid,
  OUT household_id uuid, OUT status text, OUT target_units bigint, OUT confirmed_units bigint,
  OUT unit_label text, OUT household_label text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  opened jsonb;
  closed_count int;
BEGIN
  SELECT payload INTO opened FROM public.witness_events
   WHERE circle_id = _circle AND aggregate_id = _need AND kind = 'need.opened'
   ORDER BY sequence LIMIT 1;
  IF opened IS NULL THEN RAISE EXCEPTION 'invalid_transition: need not found' USING ERRCODE='P0001'; END IF;
  household_id := (opened->>'householdId')::uuid;
  household_label := opened->>'householdLabel';
  target_units := (opened->>'targetUnits')::bigint;
  unit_label := opened->>'unitLabel';

  SELECT count(*) INTO closed_count FROM public.witness_events
   WHERE circle_id = _circle AND aggregate_id = _need AND kind = 'need.closed';

  SELECT COALESCE(SUM((payload->>'confirmedUnits')::bigint), 0) INTO confirmed_units
   FROM public.witness_events
   WHERE circle_id = _circle AND kind = 'fulfillment.confirmed'
     AND (payload->>'needId')::uuid = _need;

  IF closed_count > 0 THEN status := 'closed';
  ELSIF confirmed_units >= target_units THEN status := 'fulfilled';
  ELSE status := 'open'; END IF;
END;
$$;
ALTER FUNCTION bananagram_core.derive_need(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.derive_need(uuid, uuid) FROM PUBLIC;

-- Derive current status of an offer from events.
CREATE OR REPLACE FUNCTION bananagram_core.derive_offer(_circle uuid, _offer uuid,
  OUT need_id uuid, OUT contributor_id uuid, OUT status text, OUT promised_units bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  ev record;
BEGIN
  status := NULL;
  FOR ev IN SELECT kind, payload FROM public.witness_events
             WHERE circle_id = _circle AND aggregate_id = _offer
             ORDER BY sequence LOOP
    IF ev.kind = 'offer.pledged' THEN
      need_id := (ev.payload->>'needId')::uuid;
      contributor_id := (ev.payload->>'contributorId')::uuid;
      promised_units := (ev.payload->>'promisedUnits')::bigint;
      status := 'pledged';
    ELSIF ev.kind = 'offer.accepted' THEN status := 'accepted';
    ELSIF ev.kind = 'offer.declined' THEN status := 'declined';
    ELSIF ev.kind = 'fulfillment.reported' THEN status := 'reported';
    ELSIF ev.kind = 'fulfillment.confirmed' THEN status := 'confirmed';
    END IF;
  END LOOP;
  IF status IS NULL THEN RAISE EXCEPTION 'invalid_transition: offer not found' USING ERRCODE='P0001'; END IF;
END;
$$;
ALTER FUNCTION bananagram_core.derive_offer(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.derive_offer(uuid, uuid) FROM PUBLIC;

-- Idempotency lookup: returns matching receipt or raises idempotency_conflict.
CREATE OR REPLACE FUNCTION bananagram_core.check_idempotency(
  _uid uuid, _scope text, _key text, _kind text, _cmd_hash text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE row public.command_idempotency;
BEGIN
  SELECT * INTO row FROM public.command_idempotency
   WHERE actor_user_id = _uid AND scope = _scope AND idempotency_key = _key;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF row.command_kind = _kind AND row.command_hash = _cmd_hash THEN
    RETURN jsonb_build_object('replayed', true, 'receipt', row.receipt);
  END IF;
  RAISE EXCEPTION 'idempotency_conflict: key reused with different command' USING ERRCODE='P0001';
END;
$$;
ALTER FUNCTION bananagram_core.check_idempotency(uuid, text, text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.check_idempotency(uuid, text, text, text, text) FROM PUBLIC;

-- Append event: builds hashed envelope, inserts row, advances head, records idempotency.
-- Returns receipt: { replayed:false, event: <full envelope>, head: {hash, sequence} }.
CREATE OR REPLACE FUNCTION bananagram_core.append_event(
  _uid uuid, _circle uuid, _kind text, _aggregate uuid,
  _actor_role text, _payload jsonb,
  _idem_key text, _cmd_hash text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  head public.ledger_heads;
  new_seq bigint;
  event_id uuid := extensions.gen_random_uuid();
  occurred_at_text text := bananagram_core.iso_now();
  actor_label text := bananagram_core.resolve_actor_label(_uid);
  envelope jsonb;
  envelope_text text;
  event_hash text;
  receipt jsonb;
BEGIN
  SELECT * INTO head FROM public.ledger_heads WHERE circle_id = _circle FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_transition: no ledger head' USING ERRCODE='P0001'; END IF;

  new_seq := head.sequence + 1;

  envelope := jsonb_build_object(
    'schema', bananagram_core.const_schema_v1(),
    'eventId', event_id::text,
    'sequence', new_seq,
    'kind', _kind,
    'occurredAt', occurred_at_text,
    'actor', jsonb_build_object('id', _uid::text, 'label', actor_label, 'role', _actor_role),
    'aggregateId', _aggregate::text,
    'payload', _payload,
    'previousHash', head.head_hash
  );

  envelope_text := bananagram_core.canonical_json_text(envelope);
  event_hash := bananagram_core.sha256_hex(envelope_text);

  INSERT INTO public.witness_events(
    event_id, circle_id, sequence, kind, occurred_at, occurred_at_text,
    actor_user_id, actor_label, actor_role, aggregate_id, payload,
    previous_hash, event_hash
  ) VALUES (
    event_id, _circle, new_seq, _kind, occurred_at_text::timestamptz, occurred_at_text,
    _uid, actor_label, _actor_role, _aggregate, _payload,
    head.head_hash, event_hash
  );

  UPDATE public.ledger_heads
     SET head_hash = event_hash, sequence = new_seq, updated_at = clock_timestamp()
   WHERE circle_id = _circle;

  receipt := jsonb_build_object(
    'replayed', false,
    'event', envelope || jsonb_build_object('eventHash', event_hash),
    'head', jsonb_build_object('hash', event_hash, 'sequence', new_seq)
  );

  INSERT INTO public.command_idempotency(
    actor_user_id, scope, idempotency_key, command_kind, command_hash, receipt, event_id
  ) VALUES (
    _uid, 'circle:' || _circle::text, _idem_key,
    (SELECT k FROM (VALUES (_kind)) AS t(k)), _cmd_hash, receipt, event_id
  );

  RETURN receipt;
END;
$$;
ALTER FUNCTION bananagram_core.append_event(uuid, uuid, text, uuid, text, jsonb, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.append_event(uuid, uuid, text, uuid, text, jsonb, text, text) FROM PUBLIC;

-- ============ Admin RPCs (public, security definer) ============

CREATE OR REPLACE FUNCTION public.rpc_upsert_profile(_display_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  IF _display_name IS NULL OR length(trim(_display_name)) = 0 OR length(_display_name) > 80 THEN
    RAISE EXCEPTION 'validation: display_name must be 1..80 chars' USING ERRCODE='P0001';
  END IF;
  INSERT INTO public.profiles(user_id, display_name) VALUES (uid, trim(_display_name))
    ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;
  RETURN jsonb_build_object('user_id', uid, 'display_name', trim(_display_name));
END;
$$;
ALTER FUNCTION public.rpc_upsert_profile(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rpc_upsert_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_profile(text) TO authenticated;

-- Creates household + a circle + household membership + ledger head at genesis.
-- Idempotency scope = 'admin:global'.
CREATE OR REPLACE FUNCTION public.rpc_create_household_and_circle(
  _household_label text, _circle_label text, _idempotency_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid();
  cmd_hash text;
  existing public.command_idempotency;
  household_id uuid;
  circle_id uuid;
  receipt jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  IF _household_label IS NULL OR length(trim(_household_label)) NOT BETWEEN 1 AND 80
     OR _circle_label IS NULL OR length(trim(_circle_label)) NOT BETWEEN 1 AND 80
     OR _idempotency_key IS NULL OR length(_idempotency_key) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'validation' USING ERRCODE='P0001';
  END IF;

  cmd_hash := bananagram_core.sha256_hex(bananagram_core.canonical_json_text(jsonb_build_object(
    'household_label', trim(_household_label), 'circle_label', trim(_circle_label)
  )));

  SELECT * INTO existing FROM public.command_idempotency
   WHERE actor_user_id = uid AND scope = 'admin:global' AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    IF existing.command_kind = 'create_household' AND existing.command_hash = cmd_hash THEN
      RETURN jsonb_build_object('replayed', true, 'receipt', existing.receipt);
    END IF;
    RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE='P0001';
  END IF;

  INSERT INTO public.households(label, created_by) VALUES (trim(_household_label), uid)
    RETURNING id INTO household_id;
  INSERT INTO public.circles(household_id, label) VALUES (household_id, trim(_circle_label))
    RETURNING id INTO circle_id;
  INSERT INTO public.circle_memberships(circle_id, user_id, role) VALUES (circle_id, uid, 'household');
  INSERT INTO public.ledger_heads(circle_id, head_hash, sequence) VALUES (circle_id, 'GENESIS', 0);

  receipt := jsonb_build_object(
    'household_id', household_id, 'circle_id', circle_id,
    'household_label', trim(_household_label), 'circle_label', trim(_circle_label)
  );

  INSERT INTO public.command_idempotency(actor_user_id, scope, idempotency_key, command_kind, command_hash, receipt)
   VALUES (uid, 'admin:global', _idempotency_key, 'create_household', cmd_hash, receipt);

  RETURN jsonb_build_object('replayed', false, 'receipt', receipt);
END;
$$;
ALTER FUNCTION public.rpc_create_household_and_circle(text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rpc_create_household_and_circle(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_create_household_and_circle(text, text, text) TO authenticated;

-- Create an invitation: household-role member only. Raw token returned ONCE.
-- Idempotency receipt stores only invitation_id, circle_id, expires_at — never the raw token.
CREATE OR REPLACE FUNCTION public.rpc_create_invitation(
  _circle_id uuid, _idempotency_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid();
  role text;
  cmd_hash text;
  existing public.command_idempotency;
  raw_token text;
  token_hash text;
  invitation_id uuid := extensions.gen_random_uuid();
  ttl int := bananagram_core.const_invitation_ttl_seconds();
  max_active int := bananagram_core.const_max_active_invitations_per_circle();
  active_count int;
  expires_at timestamptz;
  receipt jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  IF _circle_id IS NULL OR _idempotency_key IS NULL OR length(_idempotency_key) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'validation' USING ERRCODE='P0001';
  END IF;

  role := bananagram_core.require_circle_role(_circle_id);
  IF role <> 'household' THEN RAISE EXCEPTION 'forbidden: only household role may create invitations' USING ERRCODE='42501'; END IF;

  cmd_hash := bananagram_core.sha256_hex(bananagram_core.canonical_json_text(
    jsonb_build_object('circle_id', _circle_id::text)));

  SELECT * INTO existing FROM public.command_idempotency
   WHERE actor_user_id = uid AND scope = 'circle:' || _circle_id::text AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    IF existing.command_kind = 'create_invitation' AND existing.command_hash = cmd_hash THEN
      RETURN jsonb_build_object('replayed', true, 'receipt', existing.receipt, 'token', NULL);
    END IF;
    RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE='P0001';
  END IF;

  SELECT count(*) INTO active_count FROM bananagram_private.invitations
    WHERE circle_id = _circle_id AND redeemed_by IS NULL AND expires_at > clock_timestamp();
  IF active_count >= max_active THEN
    RAISE EXCEPTION 'rate_limited: too many active invitations for this circle' USING ERRCODE='P0001';
  END IF;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  token_hash := bananagram_core.sha256_hex(raw_token);
  expires_at := clock_timestamp() + (ttl || ' seconds')::interval;

  INSERT INTO bananagram_private.invitations(id, circle_id, token_hash, created_by, expires_at)
    VALUES (invitation_id, _circle_id, token_hash, uid, expires_at);

  receipt := jsonb_build_object(
    'invitation_id', invitation_id, 'circle_id', _circle_id, 'expires_at', expires_at
  );

  INSERT INTO public.command_idempotency(actor_user_id, scope, idempotency_key, command_kind, command_hash, receipt)
    VALUES (uid, 'circle:' || _circle_id::text, _idempotency_key, 'create_invitation', cmd_hash, receipt);

  RETURN jsonb_build_object('replayed', false, 'receipt', receipt, 'token', raw_token);
END;
$$;
ALTER FUNCTION public.rpc_create_invitation(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rpc_create_invitation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_create_invitation(uuid, text) TO authenticated;

-- Redeem an invitation atomically. Idempotent for the same redeeming user only.
CREATE OR REPLACE FUNCTION public.rpc_redeem_invitation(_raw_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid();
  th text;
  inv bananagram_private.invitations;
  existing_role text;
  circle_label text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  IF _raw_token IS NULL OR length(_raw_token) NOT BETWEEN 16 AND 256 THEN
    RAISE EXCEPTION 'validation' USING ERRCODE='P0001';
  END IF;

  th := bananagram_core.sha256_hex(_raw_token);

  SELECT * INTO inv FROM bananagram_private.invitations
    WHERE token_hash = th FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation_not_found' USING ERRCODE='P0001'; END IF;
  IF inv.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'invitation_expired' USING ERRCODE='P0001'; END IF;

  -- Already a member?
  SELECT role INTO existing_role FROM public.circle_memberships
    WHERE circle_id = inv.circle_id AND user_id = uid;

  IF inv.redeemed_by IS NOT NULL THEN
    IF inv.redeemed_by = uid THEN
      -- Legitimate replay by same user
      SELECT label INTO circle_label FROM public.circles WHERE id = inv.circle_id;
      RETURN jsonb_build_object('circle_id', inv.circle_id, 'circle_label', circle_label,
                                'role', COALESCE(existing_role, 'neighbor'), 'replayed', true);
    ELSE
      RAISE EXCEPTION 'invitation_already_redeemed' USING ERRCODE='P0001';
    END IF;
  END IF;

  -- First-time redemption.
  IF existing_role IS NOT NULL THEN
    -- Already a member from another path; reject without consuming the invitation.
    RAISE EXCEPTION 'already_a_member' USING ERRCODE='P0001';
  END IF;

  INSERT INTO public.circle_memberships(circle_id, user_id, role) VALUES (inv.circle_id, uid, 'neighbor');
  UPDATE bananagram_private.invitations
    SET redeemed_by = uid, redeemed_at = clock_timestamp()
    WHERE id = inv.id;

  SELECT label INTO circle_label FROM public.circles WHERE id = inv.circle_id;
  RETURN jsonb_build_object('circle_id', inv.circle_id, 'circle_label', circle_label,
                            'role', 'neighbor', 'replayed', false);
END;
$$;
ALTER FUNCTION public.rpc_redeem_invitation(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rpc_redeem_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_redeem_invitation(text) TO authenticated;

-- ============ Ledger command RPCs ============
-- Common wrapper macro-shape: authenticate, lock, idempotency, head check, derive, append.

-- open_need
CREATE OR REPLACE FUNCTION public.rpc_open_need(
  _circle_id uuid, _expected_head text, _idempotency_key text,
  _title text, _summary text, _requested_items text[], _unit_label text,
  _target_units bigint, _visibility text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid();
  role text;
  head public.ledger_heads;
  cmd jsonb;
  cmd_hash text;
  idem jsonb;
  need_id uuid := extensions.gen_random_uuid();
  hh_id uuid;
  hh_label text;
  actor_label text;
  payload jsonb;
  items text[];
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  IF _circle_id IS NULL OR _expected_head IS NULL OR _idempotency_key IS NULL
     OR length(_idempotency_key) NOT BETWEEN 8 AND 200
     OR _title IS NULL OR length(trim(_title)) NOT BETWEEN 1 AND 100
     OR _summary IS NULL OR length(trim(_summary)) NOT BETWEEN 1 AND 500
     OR _unit_label IS NULL OR length(trim(_unit_label)) NOT BETWEEN 1 AND 60
     OR _target_units IS NULL OR _target_units < 1 OR _target_units > 10000
     OR _visibility NOT IN ('circle','public_summary') THEN
    RAISE EXCEPTION 'validation' USING ERRCODE='P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('ledger:' || _circle_id::text, 0));

  role := bananagram_core.require_circle_role(_circle_id);
  IF role <> 'household' THEN RAISE EXCEPTION 'forbidden: only household role may open a need' USING ERRCODE='42501'; END IF;

  SELECT household_id, label INTO hh_id, hh_label
    FROM public.circles WHERE id = _circle_id;
  IF hh_id IS NULL THEN RAISE EXCEPTION 'invalid_transition: circle not found' USING ERRCODE='P0001'; END IF;

  SELECT label INTO hh_label FROM public.households WHERE id = hh_id;

  items := COALESCE((SELECT array_agg(trim(x)) FROM unnest(_requested_items) x
                     WHERE trim(x) <> '' LIMIT 12), ARRAY[]::text[]);

  payload := jsonb_build_object(
    'householdId', hh_id::text,
    'householdLabel', hh_label,
    'title', trim(_title),
    'summary', trim(_summary),
    'requestedItems', to_jsonb(items),
    'unitLabel', trim(_unit_label),
    'targetUnits', _target_units,
    'visibility', _visibility
  );

  cmd := jsonb_build_object(
    'kind', 'open_need', 'circle_id', _circle_id::text,
    'expected_head', _expected_head, 'payload', payload
  );
  cmd_hash := bananagram_core.sha256_hex(bananagram_core.canonical_json_text(cmd));

  idem := bananagram_core.check_idempotency(uid, 'circle:' || _circle_id::text, _idempotency_key, 'open_need', cmd_hash);
  IF idem IS NOT NULL THEN RETURN idem; END IF;

  SELECT * INTO head FROM public.ledger_heads WHERE circle_id = _circle_id FOR UPDATE;
  IF head.head_hash <> _expected_head THEN
    RAISE EXCEPTION 'stale_head: expected=% actual=%', _expected_head, head.head_hash USING ERRCODE='P0001';
  END IF;

  RETURN bananagram_core.append_event(uid, _circle_id, 'need.opened', need_id, 'household', payload, _idempotency_key, cmd_hash);
END;
$$;
ALTER FUNCTION public.rpc_open_need(uuid, text, text, text, text, text[], text, bigint, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rpc_open_need(uuid, text, text, text, text, text[], text, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_open_need(uuid, text, text, text, text, text[], text, bigint, text) TO authenticated;

-- pledge_offer
CREATE OR REPLACE FUNCTION public.rpc_pledge_offer(
  _circle_id uuid, _expected_head text, _idempotency_key text,
  _need_id uuid, _kind text, _label text, _promised_units bigint, _note text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid();
  role text;
  head public.ledger_heads;
  n_status text; n_hh uuid; n_target bigint; n_confirmed bigint; n_unit text; n_hh_label text;
  cmd jsonb; cmd_hash text; idem jsonb;
  offer_id uuid := extensions.gen_random_uuid();
  payload jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  IF _circle_id IS NULL OR _need_id IS NULL OR _expected_head IS NULL OR _idempotency_key IS NULL
     OR length(_idempotency_key) NOT BETWEEN 8 AND 200
     OR _kind NOT IN ('goods','funds','time','creative_purchase')
     OR _label IS NULL OR length(trim(_label)) NOT BETWEEN 1 AND 160
     OR _promised_units IS NULL OR _promised_units < 1 OR _promised_units > 10000 THEN
    RAISE EXCEPTION 'validation' USING ERRCODE='P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('ledger:' || _circle_id::text, 0));

  role := bananagram_core.require_circle_role(_circle_id);
  IF role = 'household' THEN
    RAISE EXCEPTION 'forbidden: household-role members cannot pledge in this circle' USING ERRCODE='42501';
  END IF;

  SELECT * FROM bananagram_core.derive_need(_circle_id, _need_id)
    INTO n_hh, n_status, n_target, n_confirmed, n_unit, n_hh_label;
  IF n_status <> 'open' THEN RAISE EXCEPTION 'invalid_transition: need is not open' USING ERRCODE='P0001'; END IF;

  payload := jsonb_build_object(
    'needId', _need_id::text,
    'contributorId', uid::text,
    'contributorLabel', bananagram_core.resolve_actor_label(uid),
    'contributorRole', role,
    'kind', _kind,
    'label', trim(_label),
    'promisedUnits', _promised_units
  );
  IF _note IS NOT NULL AND length(trim(_note)) > 0 THEN
    payload := payload || jsonb_build_object('note', left(trim(_note), 500));
  END IF;

  cmd := jsonb_build_object('kind','pledge_offer','circle_id',_circle_id::text,
    'expected_head',_expected_head,'payload',payload);
  cmd_hash := bananagram_core.sha256_hex(bananagram_core.canonical_json_text(cmd));

  idem := bananagram_core.check_idempotency(uid, 'circle:' || _circle_id::text, _idempotency_key, 'pledge_offer', cmd_hash);
  IF idem IS NOT NULL THEN RETURN idem; END IF;

  SELECT * INTO head FROM public.ledger_heads WHERE circle_id = _circle_id FOR UPDATE;
  IF head.head_hash <> _expected_head THEN
    RAISE EXCEPTION 'stale_head' USING ERRCODE='P0001';
  END IF;

  RETURN bananagram_core.append_event(uid, _circle_id, 'offer.pledged', offer_id, role, payload, _idempotency_key, cmd_hash);
END;
$$;
ALTER FUNCTION public.rpc_pledge_offer(uuid, text, text, uuid, text, text, bigint, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rpc_pledge_offer(uuid, text, text, uuid, text, text, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_pledge_offer(uuid, text, text, uuid, text, text, bigint, text) TO authenticated;

-- Shared helper for household-authority offer commands.
CREATE OR REPLACE FUNCTION bananagram_core.assert_household_authority(
  _uid uuid, _circle uuid, _need_household uuid
) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE r text; ch uuid;
BEGIN
  SELECT household_id INTO ch FROM public.circles WHERE id = _circle;
  IF ch IS NULL OR ch <> _need_household THEN
    RAISE EXCEPTION 'invalid_transition: need does not belong to this circle' USING ERRCODE='P0001';
  END IF;
  SELECT role INTO r FROM public.circle_memberships WHERE circle_id = _circle AND user_id = _uid;
  IF r IS NULL OR r <> 'household' THEN
    RAISE EXCEPTION 'forbidden: household authority required' USING ERRCODE='42501';
  END IF;
END;
$$;
ALTER FUNCTION bananagram_core.assert_household_authority(uuid, uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.assert_household_authority(uuid, uuid, uuid) FROM PUBLIC;

-- accept_offer
CREATE OR REPLACE FUNCTION public.rpc_accept_offer(
  _circle_id uuid, _expected_head text, _idempotency_key text, _offer_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid();
  head public.ledger_heads;
  o_need uuid; o_contrib uuid; o_status text; o_prom bigint;
  n_hh uuid; n_status text; n_target bigint; n_confirmed bigint; n_unit text; n_hh_label text;
  cmd jsonb; cmd_hash text; idem jsonb; payload jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ledger:' || _circle_id::text, 0));
  SELECT * FROM bananagram_core.derive_offer(_circle_id, _offer_id) INTO o_need, o_contrib, o_status, o_prom;
  IF o_status <> 'pledged' THEN RAISE EXCEPTION 'invalid_transition: offer is not pledged' USING ERRCODE='P0001'; END IF;
  IF uid = o_contrib THEN RAISE EXCEPTION 'forbidden: contributor cannot accept own offer' USING ERRCODE='42501'; END IF;
  SELECT * FROM bananagram_core.derive_need(_circle_id, o_need) INTO n_hh, n_status, n_target, n_confirmed, n_unit, n_hh_label;
  PERFORM bananagram_core.assert_household_authority(uid, _circle_id, n_hh);

  payload := jsonb_build_object('needId', o_need::text);
  cmd := jsonb_build_object('kind','accept_offer','circle_id',_circle_id::text,'expected_head',_expected_head,'offer_id',_offer_id::text);
  cmd_hash := bananagram_core.sha256_hex(bananagram_core.canonical_json_text(cmd));
  idem := bananagram_core.check_idempotency(uid, 'circle:' || _circle_id::text, _idempotency_key, 'accept_offer', cmd_hash);
  IF idem IS NOT NULL THEN RETURN idem; END IF;

  SELECT * INTO head FROM public.ledger_heads WHERE circle_id = _circle_id FOR UPDATE;
  IF head.head_hash <> _expected_head THEN RAISE EXCEPTION 'stale_head' USING ERRCODE='P0001'; END IF;

  RETURN bananagram_core.append_event(uid, _circle_id, 'offer.accepted', _offer_id, 'household', payload, _idempotency_key, cmd_hash);
END;
$$;
ALTER FUNCTION public.rpc_accept_offer(uuid, text, text, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rpc_accept_offer(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_accept_offer(uuid, text, text, uuid) TO authenticated;

-- decline_offer
CREATE OR REPLACE FUNCTION public.rpc_decline_offer(
  _circle_id uuid, _expected_head text, _idempotency_key text, _offer_id uuid, _reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid(); head public.ledger_heads;
  o_need uuid; o_contrib uuid; o_status text; o_prom bigint;
  n_hh uuid; n_status text; n_target bigint; n_confirmed bigint; n_unit text; n_hh_label text;
  cmd jsonb; cmd_hash text; idem jsonb; payload jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ledger:' || _circle_id::text, 0));
  SELECT * FROM bananagram_core.derive_offer(_circle_id, _offer_id) INTO o_need, o_contrib, o_status, o_prom;
  IF o_status <> 'pledged' THEN RAISE EXCEPTION 'invalid_transition: offer not pledged' USING ERRCODE='P0001'; END IF;
  SELECT * FROM bananagram_core.derive_need(_circle_id, o_need) INTO n_hh, n_status, n_target, n_confirmed, n_unit, n_hh_label;
  PERFORM bananagram_core.assert_household_authority(uid, _circle_id, n_hh);

  payload := jsonb_build_object('needId', o_need::text);
  IF _reason IS NOT NULL AND length(trim(_reason)) > 0 THEN
    payload := payload || jsonb_build_object('reason', left(trim(_reason), 240));
  END IF;
  cmd := jsonb_build_object('kind','decline_offer','circle_id',_circle_id::text,'expected_head',_expected_head,'offer_id',_offer_id::text,'payload',payload);
  cmd_hash := bananagram_core.sha256_hex(bananagram_core.canonical_json_text(cmd));
  idem := bananagram_core.check_idempotency(uid, 'circle:' || _circle_id::text, _idempotency_key, 'decline_offer', cmd_hash);
  IF idem IS NOT NULL THEN RETURN idem; END IF;

  SELECT * INTO head FROM public.ledger_heads WHERE circle_id = _circle_id FOR UPDATE;
  IF head.head_hash <> _expected_head THEN RAISE EXCEPTION 'stale_head' USING ERRCODE='P0001'; END IF;

  RETURN bananagram_core.append_event(uid, _circle_id, 'offer.declined', _offer_id, 'household', payload, _idempotency_key, cmd_hash);
END;
$$;
ALTER FUNCTION public.rpc_decline_offer(uuid, text, text, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rpc_decline_offer(uuid, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_decline_offer(uuid, text, text, uuid, text) TO authenticated;

-- report_fulfillment (contributor only)
CREATE OR REPLACE FUNCTION public.rpc_report_fulfillment(
  _circle_id uuid, _expected_head text, _idempotency_key text, _offer_id uuid, _note text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid(); head public.ledger_heads;
  o_need uuid; o_contrib uuid; o_status text; o_prom bigint;
  role text; cmd jsonb; cmd_hash text; idem jsonb; payload jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ledger:' || _circle_id::text, 0));
  role := bananagram_core.require_circle_role(_circle_id);
  SELECT * FROM bananagram_core.derive_offer(_circle_id, _offer_id) INTO o_need, o_contrib, o_status, o_prom;
  IF o_status <> 'accepted' THEN RAISE EXCEPTION 'invalid_transition: offer is not accepted' USING ERRCODE='P0001'; END IF;
  IF uid <> o_contrib THEN RAISE EXCEPTION 'forbidden: only the contributor may report' USING ERRCODE='42501'; END IF;

  payload := jsonb_build_object('needId', o_need::text);
  IF _note IS NOT NULL AND length(trim(_note)) > 0 THEN
    payload := payload || jsonb_build_object('note', left(trim(_note), 500));
  END IF;
  cmd := jsonb_build_object('kind','report_fulfillment','circle_id',_circle_id::text,'expected_head',_expected_head,'offer_id',_offer_id::text,'payload',payload);
  cmd_hash := bananagram_core.sha256_hex(bananagram_core.canonical_json_text(cmd));
  idem := bananagram_core.check_idempotency(uid, 'circle:' || _circle_id::text, _idempotency_key, 'report_fulfillment', cmd_hash);
  IF idem IS NOT NULL THEN RETURN idem; END IF;

  SELECT * INTO head FROM public.ledger_heads WHERE circle_id = _circle_id FOR UPDATE;
  IF head.head_hash <> _expected_head THEN RAISE EXCEPTION 'stale_head' USING ERRCODE='P0001'; END IF;

  RETURN bananagram_core.append_event(uid, _circle_id, 'fulfillment.reported', _offer_id, role, payload, _idempotency_key, cmd_hash);
END;
$$;
ALTER FUNCTION public.rpc_report_fulfillment(uuid, text, text, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rpc_report_fulfillment(uuid, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_report_fulfillment(uuid, text, text, uuid, text) TO authenticated;

-- confirm_fulfillment (household only; caller != contributor)
CREATE OR REPLACE FUNCTION public.rpc_confirm_fulfillment(
  _circle_id uuid, _expected_head text, _idempotency_key text, _offer_id uuid, _confirmed_units bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid(); head public.ledger_heads;
  o_need uuid; o_contrib uuid; o_status text; o_prom bigint;
  n_hh uuid; n_status text; n_target bigint; n_confirmed bigint; n_unit text; n_hh_label text;
  cmd jsonb; cmd_hash text; idem jsonb; payload jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  IF _confirmed_units IS NULL OR _confirmed_units < 1 THEN RAISE EXCEPTION 'validation' USING ERRCODE='P0001'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('ledger:' || _circle_id::text, 0));

  SELECT * FROM bananagram_core.derive_offer(_circle_id, _offer_id) INTO o_need, o_contrib, o_status, o_prom;
  IF o_status <> 'reported' THEN RAISE EXCEPTION 'invalid_transition: offer must be reported first' USING ERRCODE='P0001'; END IF;
  IF uid = o_contrib THEN RAISE EXCEPTION 'forbidden: contributor cannot confirm own offer' USING ERRCODE='42501'; END IF;
  IF _confirmed_units > o_prom THEN RAISE EXCEPTION 'validation: confirmed_units exceeds promised' USING ERRCODE='P0001'; END IF;

  SELECT * FROM bananagram_core.derive_need(_circle_id, o_need) INTO n_hh, n_status, n_target, n_confirmed, n_unit, n_hh_label;
  PERFORM bananagram_core.assert_household_authority(uid, _circle_id, n_hh);

  payload := jsonb_build_object('needId', o_need::text, 'confirmedUnits', _confirmed_units);
  cmd := jsonb_build_object('kind','confirm_fulfillment','circle_id',_circle_id::text,'expected_head',_expected_head,'offer_id',_offer_id::text,'payload',payload);
  cmd_hash := bananagram_core.sha256_hex(bananagram_core.canonical_json_text(cmd));
  idem := bananagram_core.check_idempotency(uid, 'circle:' || _circle_id::text, _idempotency_key, 'confirm_fulfillment', cmd_hash);
  IF idem IS NOT NULL THEN RETURN idem; END IF;

  SELECT * INTO head FROM public.ledger_heads WHERE circle_id = _circle_id FOR UPDATE;
  IF head.head_hash <> _expected_head THEN RAISE EXCEPTION 'stale_head' USING ERRCODE='P0001'; END IF;

  RETURN bananagram_core.append_event(uid, _circle_id, 'fulfillment.confirmed', _offer_id, 'household', payload, _idempotency_key, cmd_hash);
END;
$$;
ALTER FUNCTION public.rpc_confirm_fulfillment(uuid, text, text, uuid, bigint) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rpc_confirm_fulfillment(uuid, text, text, uuid, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_confirm_fulfillment(uuid, text, text, uuid, bigint) TO authenticated;

-- close_need
CREATE OR REPLACE FUNCTION public.rpc_close_need(
  _circle_id uuid, _expected_head text, _idempotency_key text, _need_id uuid, _reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid(); head public.ledger_heads;
  n_hh uuid; n_status text; n_target bigint; n_confirmed bigint; n_unit text; n_hh_label text;
  cmd jsonb; cmd_hash text; idem jsonb; payload jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) NOT BETWEEN 1 AND 240 THEN RAISE EXCEPTION 'validation' USING ERRCODE='P0001'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('ledger:' || _circle_id::text, 0));

  SELECT * FROM bananagram_core.derive_need(_circle_id, _need_id) INTO n_hh, n_status, n_target, n_confirmed, n_unit, n_hh_label;
  IF n_status = 'closed' THEN RAISE EXCEPTION 'invalid_transition: need already closed' USING ERRCODE='P0001'; END IF;
  PERFORM bananagram_core.assert_household_authority(uid, _circle_id, n_hh);

  payload := jsonb_build_object('reason', left(trim(_reason), 240));
  cmd := jsonb_build_object('kind','close_need','circle_id',_circle_id::text,'expected_head',_expected_head,'need_id',_need_id::text,'payload',payload);
  cmd_hash := bananagram_core.sha256_hex(bananagram_core.canonical_json_text(cmd));
  idem := bananagram_core.check_idempotency(uid, 'circle:' || _circle_id::text, _idempotency_key, 'close_need', cmd_hash);
  IF idem IS NOT NULL THEN RETURN idem; END IF;

  SELECT * INTO head FROM public.ledger_heads WHERE circle_id = _circle_id FOR UPDATE;
  IF head.head_hash <> _expected_head THEN RAISE EXCEPTION 'stale_head' USING ERRCODE='P0001'; END IF;

  RETURN bananagram_core.append_event(uid, _circle_id, 'need.closed', _need_id, 'household', payload, _idempotency_key, cmd_hash);
END;
$$;
ALTER FUNCTION public.rpc_close_need(uuid, text, text, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rpc_close_need(uuid, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_close_need(uuid, text, text, uuid, text) TO authenticated;
