-- Founding member tiers: first 200 signups get lifetime 10% (tier 'full'),
-- everyone after that only gets the 25% first-payment voucher (tier 'welcome').
-- is_founding_member stays true for both tiers (drives the "FOUNDING" badge /
-- 25% voucher eligibility); founding_tier is the new axis that gates the
-- lifetime 10%.

ALTER TABLE public.profiles
  ADD COLUMN founding_tier text NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_founding_tier_check
  CHECK (founding_tier IS NULL OR founding_tier IN ('full', 'welcome'));

COMMENT ON COLUMN public.profiles.founding_tier IS
  'full = one of the first 200 founding members (25% first payment + 10% lifetime w/ 4h monthly requirement). welcome = founding member after the 200 lifetime slots filled (25% first payment only, no lifetime 10%). NULL = not a founding member.';

-- Backfill: the only founding member(s) that exist today predate the tier
-- system and count toward the first 200 automatically.
UPDATE public.profiles SET founding_tier = 'full' WHERE is_founding_member = true;

-- Serializes concurrent signups near the 200th slot so two simultaneous
-- INSERTs can't both read "199 so far" and both become 'full'.
CREATE OR REPLACE FUNCTION public.assign_founding_tier()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_full_count int;
BEGIN
  -- Advisory xact lock instead of `FOR UPDATE` because there's no single row
  -- to lock here (the constraint is on a COUNT across profiles) — same
  -- serialization goal as the FOR UPDATE pattern used elsewhere (e.g.
  -- pay_reservation_with_credits), just applied to a table-wide invariant.
  PERFORM pg_advisory_xact_lock(hashtext('founding_tier_assignment'));

  SELECT count(*) INTO v_full_count FROM public.profiles WHERE founding_tier = 'full';

  IF v_full_count < 200 THEN
    RETURN 'full';
  ELSE
    RETURN 'welcome';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id uuid;
  v_is_founding boolean;
  v_tier text;
BEGIN
  SELECT id INTO v_lead_id FROM public.leads
  WHERE lower(email) = lower(new.email) AND converted_profile_id IS NULL
  LIMIT 1;

  v_is_founding := v_lead_id IS NOT NULL;
  v_tier := CASE WHEN v_is_founding THEN public.assign_founding_tier() ELSE NULL END;

  INSERT INTO public.profiles (id, email, full_name, is_founding_member, founding_tier)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_is_founding,
    v_tier
  );

  IF v_lead_id IS NOT NULL THEN
    UPDATE public.leads SET converted_profile_id = new.id WHERE id = v_lead_id;
  END IF;

  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_founding_member(p_user_id uuid, p_value boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tier text;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;

  IF p_value THEN
    v_tier := public.assign_founding_tier();
    UPDATE public.profiles SET is_founding_member = true, founding_tier = v_tier WHERE id = p_user_id;
  ELSE
    -- founding_hours_debt_min zeroed so it doesn't "come back" if the
    -- customer becomes a founding member again later (existing behavior,
    -- unchanged); founding_discount_used is intentionally left as-is (the
    -- 25% voucher, once used, stays used regardless of tier changes).
    UPDATE public.profiles
    SET is_founding_member = false, founding_tier = NULL, founding_hours_debt_min = 0
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'tier', v_tier);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.customer_discount_pct(p_customer_id uuid, p_mark_used boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile        public.profiles%ROWTYPE;
  v_month_start    date := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_played_min     int;
  v_required_min   int;
BEGIN
  IF p_customer_id IS NULL THEN RETURN 0; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_customer_id;
  IF NOT FOUND OR v_profile.founding_tier IS NULL THEN RETURN 0; END IF;

  IF NOT v_profile.founding_discount_used AND v_profile.created_at > now() - interval '60 days' THEN
    IF p_mark_used THEN
      UPDATE public.profiles SET founding_discount_used = true WHERE id = p_customer_id;
    END IF;
    RETURN 25;
  END IF;

  -- Lifetime 10% only exists for tier 'full' — 'welcome' members only ever
  -- get the 25% first-payment voucher above, nothing after that.
  IF v_profile.founding_tier <> 'full' THEN
    RETURN 0;
  END IF;

  -- Lifetime 10% requires 4h/month; a shortfall carries into next month's requirement
  -- (compounding) instead of losing the discount outright — cleared monthly by
  -- roll_founding_hours_debt(), evaluated live here against the current month so far.
  v_required_min := 240 + v_profile.founding_hours_debt_min;
  v_played_min := public.founding_minutes_played(p_customer_id, v_month_start);
  IF v_played_min >= v_required_min THEN
    RETURN 10;
  END IF;
  RETURN 0;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.my_founding_progress()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile      public.profiles%ROWTYPE;
  v_month_start  date := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_played_min   int;
  v_required_min int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('is_founding_member', false); END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_founding_member', false);
  END IF;

  IF NOT v_profile.is_founding_member OR v_profile.founding_tier IS NULL THEN
    RETURN jsonb_build_object('is_founding_member', COALESCE(v_profile.is_founding_member, false));
  END IF;

  IF v_profile.founding_tier = 'welcome' THEN
    RETURN jsonb_build_object(
      'is_founding_member', true,
      'founding_tier', 'welcome',
      'lifetime_slots_full', true
    );
  END IF;

  IF NOT v_profile.founding_discount_used THEN
    RETURN jsonb_build_object('is_founding_member', true, 'founding_tier', 'full');
  END IF;

  v_required_min := 240 + v_profile.founding_hours_debt_min;
  v_played_min := public.founding_minutes_played(auth.uid(), v_month_start);

  RETURN jsonb_build_object(
    'is_founding_member', true,
    'founding_tier', 'full',
    'lifetime_active_this_month', v_played_min >= v_required_min,
    'played_min', v_played_min,
    'required_min', v_required_min,
    'remaining_min', GREATEST(0, v_required_min - v_played_min)
  );
END;
$function$
;

-- founding_tier must be as protected as is_founding_member — otherwise a
-- customer could self-update via a direct table PATCH to grant themselves
-- 'full'.
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;
  IF NOT public.is_staff_or_admin() THEN
    NEW.role := OLD.role;
    NEW.credits_balance := OLD.credits_balance;
    NEW.is_founding_member := OLD.is_founding_member;
    NEW.founding_tier := OLD.founding_tier;
  END IF;
  RETURN NEW;
END;
$function$
;

-- roll_founding_hours_debt only makes sense for tier 'full' (welcome has no
-- lifetime discount to protect).
CREATE OR REPLACE FUNCTION public.roll_founding_hours_debt()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prev_month date := date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo') - interval '1 day')::date;
  v_row record;
  v_required int;
  v_played int;
BEGIN
  FOR v_row IN
    SELECT id, founding_hours_debt_min FROM public.profiles
    WHERE founding_tier = 'full' AND founding_discount_used
  LOOP
    v_required := 240 + v_row.founding_hours_debt_min;
    v_played := public.founding_minutes_played(v_row.id, v_prev_month);
    IF v_played >= v_required THEN
      UPDATE public.profiles SET founding_hours_debt_min = 0 WHERE id = v_row.id;
    ELSE
      UPDATE public.profiles SET founding_hours_debt_min = v_required - v_played WHERE id = v_row.id;
    END IF;
  END LOOP;
END;
$function$
;
