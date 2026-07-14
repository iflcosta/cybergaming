-- ============================================================
-- Cyber Brasil Arena — functions/triggers/cron RECOVERY SNAPSHOT
-- ============================================================
-- This is NOT an incremental migration. It is a point-in-time dump of
-- every function, trigger, and pg_cron job that existed in the
-- `scrswxgvlwfndsqrclgb` remote Supabase project as of 2026-07-14,
-- captured via `pg_get_functiondef`/`pg_get_triggerdef`/`cron.job`.
--
-- Context: until this file, ~50 SQL functions (SECURITY DEFINER RPCs,
-- triggers, etc.) that run in production existed ONLY in the remote
-- database — the git history in this directory only had the initial
-- table DDL (20260713000001_init.sql), so there was no code-reviewable,
-- diffable, versioned copy of the actual logic running in prod. This
-- file closes that gap by capturing the full current state in one shot.
--
-- Going forward: every schema/function change should be applied via the
-- Supabase MCP `apply_migration` tool (which versions it on the Supabase
-- side automatically) AND mirrored as a new file here in
-- packages/supabase/migrations/, so this migrations directory stays a
-- second source of truth alongside the Supabase-side history. Do not
-- hand-edit this snapshot file for new changes — add a new migration
-- file instead.
--
-- Running this file against a fresh database (after init.sql) should
-- reproduce the current function/trigger/cron surface. It uses
-- CREATE OR REPLACE / DROP ... IF EXISTS so it is safe to re-run.
-- ============================================================

-- ── Functions ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.adjust_stock(p_product_id uuid, p_qty_delta integer, p_reason text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_qty int;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;
  IF p_qty_delta = 0 OR p_reason NOT IN ('purchase','adjustment','loss') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid input');
  END IF;

  UPDATE public.products
  SET stock_qty = stock_qty + p_qty_delta
  WHERE id = p_product_id AND stock_qty + p_qty_delta >= 0
  RETURNING stock_qty INTO v_new_qty;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'product not found or would go negative');
  END IF;

  INSERT INTO public.stock_movements (product_id, qty_delta, reason, note, created_by)
  VALUES (p_product_id, p_qty_delta, p_reason, p_note, auth.uid());

  RETURN jsonb_build_object('ok', true, 'stock_qty', v_new_qty);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.agent_heartbeat(p_station_id uuid, p_agent_secret text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_station public.pc_stations%ROWTYPE;
  v_session public.sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_station FROM public.pc_stations
  WHERE id = p_station_id AND agent_secret = p_agent_secret;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid station or secret');
  END IF;

  UPDATE public.pc_stations SET last_seen_at = now() WHERE id = p_station_id;

  SELECT * INTO v_session FROM public.sessions
  WHERE station_id = p_station_id AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'session', NULL);
  END IF;

  RETURN jsonb_build_object('ok', true, 'session', jsonb_build_object(
    'id', v_session.id,
    'status', v_session.status,
    'started_at', v_session.started_at,
    'planned_end_at', v_session.planned_end_at,
    'package_type', v_session.package_type
  ));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_founding_discount(p_base_cents integer, p_customer_id uuid, p_mark_used boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pct int := public.customer_discount_pct(p_customer_id, p_mark_used);
BEGIN
  RETURN ROUND(p_base_cents::numeric * (100 - v_pct) / 100.0)::int;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_my_reservation(p_reservation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_res public.reservations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not authenticated'); END IF;
  SELECT * INTO v_res FROM public.reservations WHERE id = p_reservation_id AND customer_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not found'); END IF;
  IF v_res.status <> 'confirmed' OR v_res.starts_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not cancellable');
  END IF;
  UPDATE public.reservations SET status = 'cancelled' WHERE id = p_reservation_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.close_fixed_session(p_session_id uuid, p_payment_method text DEFAULT NULL::text, p_ended_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session public.sessions%ROWTYPE;
  v_tx_id   uuid;
  v_label   text;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;

  SELECT * INTO v_session
  FROM public.sessions
  WHERE id = p_session_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session not found or not active');
  END IF;

  IF v_session.package_type IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'open sessions must use close_open_session');
  END IF;

  -- Avulso (no upfront transaction, not courtesy): collect payment now, atomically
  IF v_session.transaction_id IS NULL AND v_session.customer_id IS NULL AND NOT v_session.is_courtesy THEN
    IF p_payment_method IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'payment method required for avulso');
    END IF;
    SELECT label INTO v_label FROM public.pc_stations WHERE id = v_session.station_id;
    INSERT INTO public.transactions
      (customer_id, amount_cents, type, payment_method, status, description)
    VALUES
      (NULL, v_session.price_cents, 'purchase', p_payment_method::public.payment_method, 'paid',
       v_session.package_type || ' — ' || COALESCE(v_label, 'PC') || ' (avulso)')
    RETURNING id INTO v_tx_id;
  END IF;

  UPDATE public.sessions
  SET status = 'completed',
      ended_at = p_ended_at,
      transaction_id = COALESCE(v_tx_id, transaction_id)
  WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true, 'transaction_id', COALESCE(v_tx_id, v_session.transaction_id));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.close_open_session(p_session_id uuid, p_payment_method text, p_ended_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session       public.sessions%ROWTYPE;
  v_cursor        timestamptz;
  v_boundary      timestamptz;
  v_total_cents   int := 0;
  v_segs          jsonb := '[]'::jsonb;
  v_seg_minutes   int;
  v_rate_type     text;
  v_rate_cents    int;
  v_seg_amount    int;
  v_tx_id         uuid;
  v_dow           int;
  v_hour          int;
  v_rate_vale     int;
  v_rate_pico     int;
  v_pct           int;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;

  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session not found or not active');
  END IF;

  IF v_session.is_courtesy THEN
    UPDATE public.sessions SET status = 'completed', ended_at = p_ended_at, price_cents = 0
    WHERE id = p_session_id;
    RETURN jsonb_build_object('ok', true, 'total_cents', 0, 'segments', '[]'::jsonb, 'transaction_id', NULL, 'discount_pct', 0, 'courtesy', true);
  END IF;

  SELECT price_cents INTO v_rate_vale FROM public.packages WHERE code = 'hora_vale';
  SELECT price_cents INTO v_rate_pico FROM public.packages WHERE code = 'hora_pico';
  v_rate_vale := COALESCE(v_rate_vale, 1200);
  v_rate_pico := COALESCE(v_rate_pico, 1500);

  -- Determine once (marks the one-time voucher used if this session qualifies)
  v_pct := public.customer_discount_pct(v_session.customer_id, true);

  v_cursor := v_session.started_at;
  WHILE v_cursor < p_ended_at LOOP
    v_dow  := EXTRACT(DOW FROM v_cursor AT TIME ZONE 'America/Sao_Paulo')::int;
    v_hour := EXTRACT(HOUR FROM v_cursor AT TIME ZONE 'America/Sao_Paulo')::int;

    IF v_dow BETWEEN 1 AND 5 AND v_hour < 18 THEN
      v_rate_type  := 'hora_vale';
      v_rate_cents := v_rate_vale;
      v_boundary := (date_trunc('day', v_cursor AT TIME ZONE 'America/Sao_Paulo') + interval '18 hours') AT TIME ZONE 'America/Sao_Paulo';
    ELSE
      v_rate_type  := 'hora_pico';
      v_rate_cents := v_rate_pico;
      v_boundary := (date_trunc('day', v_cursor AT TIME ZONE 'America/Sao_Paulo') + interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    IF v_boundary > p_ended_at THEN v_boundary := p_ended_at; END IF;

    v_seg_minutes := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_boundary - v_cursor)) / 60.0)::int);
    v_seg_amount  := ROUND((v_rate_cents::numeric * v_seg_minutes / 60.0) * (100 - v_pct) / 100.0)::int;

    INSERT INTO public.session_billing_segments
      (session_id, rate_type, started_at, ended_at, minutes, rate_cents, amount_cents)
    VALUES
      (p_session_id, v_rate_type, v_cursor, v_boundary, v_seg_minutes, v_rate_cents, v_seg_amount);

    v_segs := v_segs || jsonb_build_object('rate_type', v_rate_type, 'minutes', v_seg_minutes, 'amount_cents', v_seg_amount);
    v_total_cents := v_total_cents + v_seg_amount;
    v_cursor := v_boundary;
  END LOOP;

  INSERT INTO public.transactions (customer_id, amount_cents, type, payment_method, status, description)
  VALUES (v_session.customer_id, v_total_cents, 'purchase', p_payment_method::public.payment_method, 'paid',
          'Sessão aberta — ' || COALESCE((SELECT label FROM public.pc_stations WHERE id = v_session.station_id), 'PC'))
  RETURNING id INTO v_tx_id;

  UPDATE public.sessions SET status = 'completed', ended_at = p_ended_at, price_cents = v_total_cents, transaction_id = v_tx_id
  WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true, 'total_cents', v_total_cents, 'segments', v_segs, 'transaction_id', v_tx_id, 'discount_pct', v_pct);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.compute_off_hours(ts timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_local timestamp := ts AT TIME ZONE 'America/Sao_Paulo';
  v_dow   int := EXTRACT(DOW FROM v_local)::int;   -- 0=Sun … 6=Sat
  v_hour  int := EXTRACT(HOUR FROM v_local)::int;
BEGIN
  -- Monday closed; open hours Tue–Sun 10h–22h; holidays always off-hours
  RETURN v_dow = 1
      OR v_hour < 10
      OR v_hour >= 22
      OR EXISTS (SELECT 1 FROM public.holidays WHERE day = v_local::date);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_asaas_payment(p_asaas_payment_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx public.transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_tx FROM public.transactions
  WHERE asaas_payment_id = p_asaas_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'transaction not found');
  END IF;

  IF v_tx.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true);
  END IF;

  UPDATE public.transactions
  SET status = 'paid', description = 'Compra de créditos (Asaas)'
  WHERE id = v_tx.id;

  UPDATE public.profiles
  SET credits_balance = credits_balance + v_tx.amount_cents
  WHERE id = v_tx.customer_id;

  RETURN jsonb_build_object('ok', true, 'amount_cents', v_tx.amount_cents, 'customer_id', v_tx.customer_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_credit_purchase(p_transaction_id uuid, p_payment_method text DEFAULT 'pix'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx public.transactions%ROWTYPE;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;

  SELECT * INTO v_tx FROM public.transactions
  WHERE id = p_transaction_id AND type = 'credit_purchase' AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pending credit purchase not found');
  END IF;

  UPDATE public.transactions
  SET status = 'paid', payment_method = p_payment_method::public.payment_method,
      description = 'Compra de créditos'
  WHERE id = p_transaction_id;

  UPDATE public.profiles
  SET credits_balance = credits_balance + v_tx.amount_cents
  WHERE id = v_tx.customer_id;

  RETURN jsonb_build_object('ok', true, 'amount_cents', v_tx.amount_cents);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_recurring_payment(p_recurring_id uuid, p_payment_method text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_rec public.recurring_reservations%ROWTYPE;
  v_tx_id uuid;
  v_min_starts timestamptz;
BEGIN
  IF NOT public.is_staff_or_admin() THEN RETURN jsonb_build_object('ok', false, 'error', 'not authorized'); END IF;
  SELECT * INTO v_rec FROM public.recurring_reservations WHERE id = p_recurring_id FOR UPDATE;
  IF NOT FOUND OR v_rec.status <> 'awaiting_payment' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not awaiting payment');
  END IF;

  INSERT INTO public.transactions (customer_id, amount_cents, type, payment_method, status, description)
  VALUES (v_rec.customer_id, v_rec.price_cents, 'reservation_payment', p_payment_method::public.payment_method, 'paid',
          'Plano recorrente ' || v_rec.occurrence_count || 'x (caixa)')
  RETURNING id INTO v_tx_id;

  PERFORM public.customer_discount_pct(v_rec.customer_id, true);
  UPDATE public.recurring_reservations SET status = 'active', transaction_id = v_tx_id WHERE id = p_recurring_id;
  PERFORM public.materialize_recurring(p_recurring_id);

  SELECT MIN(starts_at) INTO v_min_starts FROM public.reservations WHERE recurring_group_id = p_recurring_id;
  IF v_min_starts IS NOT NULL THEN
    UPDATE public.transactions SET is_off_hours = public.compute_off_hours(v_min_starts) WHERE id = v_tx_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'transaction_id', v_tx_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_reservation_payment(p_reservation_id uuid, p_payment_method text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_res public.reservations%ROWTYPE;
  v_free int;
  v_tx_id uuid;
BEGIN
  IF NOT public.is_staff_or_admin() THEN RETURN jsonb_build_object('ok', false, 'error', 'not authorized'); END IF;
  SELECT * INTO v_res FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND OR v_res.status <> 'awaiting_payment' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not awaiting payment');
  END IF;

  PERFORM 1 FROM public.pc_stations WHERE is_active FOR UPDATE;
  v_free := public.stations_free_at(v_res.starts_at, v_res.duration_min);
  IF v_free < v_res.station_count THEN
    UPDATE public.reservations SET status = 'expired' WHERE id = p_reservation_id;
    RETURN jsonb_build_object('ok', false, 'error', 'slot no longer available');
  END IF;

  INSERT INTO public.transactions (customer_id, amount_cents, type, payment_method, status, description)
  VALUES (v_res.customer_id, v_res.price_cents, 'reservation_payment', p_payment_method::public.payment_method, 'paid', 'Reserva paga no caixa')
  RETURNING id INTO v_tx_id;

  UPDATE public.transactions SET is_off_hours = public.compute_off_hours(v_res.starts_at) WHERE id = v_tx_id;

  PERFORM public.customer_discount_pct(v_res.customer_id, true);
  UPDATE public.reservations SET status = 'confirmed', transaction_id = v_tx_id WHERE id = p_reservation_id;
  RETURN jsonb_build_object('ok', true, 'transaction_id', v_tx_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.consume_founding_voucher(p_customer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;
  UPDATE public.profiles SET founding_discount_used = true WHERE id = p_customer_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_asaas_transaction(p_amount_cents integer, p_asaas_payment_id text, p_asaas_customer_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authenticated');
  END IF;
  IF p_amount_cents < 500 OR p_amount_cents > 50000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount must be between R$5 and R$500');
  END IF;

  UPDATE public.profiles SET asaas_customer_id = p_asaas_customer_id
  WHERE id = auth.uid() AND (asaas_customer_id IS NULL OR asaas_customer_id <> p_asaas_customer_id);

  INSERT INTO public.transactions
    (customer_id, amount_cents, type, payment_method, status, description, asaas_payment_id)
  VALUES
    (auth.uid(), p_amount_cents, 'credit_purchase', 'pix', 'pending', 'Compra de créditos (aguardando pagamento Asaas)', p_asaas_payment_id)
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('ok', true, 'transaction_id', v_tx_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_recurring_reservation(p_day_of_week integer, p_start_time time without time zone, p_duration_min integer, p_month date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_unit     int;
  v_total    int;
  v_count    int := 0;
  v_cursor   date;
  v_month_start date := date_trunc('month', p_month)::date;
  v_month_end   date := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
  v_first_valid timestamptz;
  v_starts   timestamptz;
  v_rec_id   uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not authenticated'); END IF;
  IF p_day_of_week = 1 THEN RETURN jsonb_build_object('ok', false, 'error', 'segunda-feira fechado'); END IF;
  IF p_duration_min IS NULL OR p_duration_min NOT IN (30,60,90,120,150,180) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid duration (max 3h)');
  END IF;
  IF EXTRACT(HOUR FROM p_start_time) < 10 OR EXTRACT(HOUR FROM p_start_time) >= 22 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'outside business hours');
  END IF;

  PERFORM 1 FROM public.pc_stations WHERE is_active FOR UPDATE;

  v_cursor := v_month_start;
  WHILE v_cursor <= v_month_end LOOP
    IF EXTRACT(DOW FROM v_cursor)::int = p_day_of_week THEN
      v_starts := (v_cursor + p_start_time) AT TIME ZONE 'America/Sao_Paulo';
      IF v_starts >= now() + interval '4 hours' THEN
        IF public.stations_free_at(v_starts, p_duration_min) < 1 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'no room on ' || v_cursor::text, 'conflict_date', v_cursor);
        END IF;
        v_count := v_count + 1;
        IF v_first_valid IS NULL THEN v_first_valid := v_starts; END IF;
      END IF;
    END IF;
    v_cursor := v_cursor + 1;
  END LOOP;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no valid occurrences left this month (4h advance required)');
  END IF;

  -- Preview only — voucher consumed on actual payment, not on creation.
  v_unit := public.apply_founding_discount(public.package_base_price(v_first_valid, p_duration_min), auth.uid(), false);
  v_total := CASE WHEN p_duration_min = 180 THEN v_unit ELSE v_unit * v_count END;

  INSERT INTO public.recurring_reservations
    (customer_id, day_of_week, start_time, duration_min, month, occurrence_count, price_cents, payment_deadline_at)
  VALUES
    (auth.uid(), p_day_of_week, p_start_time, p_duration_min, v_month_start, v_count, v_total, now() + interval '1 hour')
  RETURNING id INTO v_rec_id;

  RETURN jsonb_build_object('ok', true, 'recurring_id', v_rec_id, 'occurrence_count', v_count,
                            'price_cents', v_total, 'payment_deadline_at', now() + interval '1 hour');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_recurring_reservation(p_day_of_week integer, p_start_time time without time zone, p_duration_min integer, p_month date, p_station_count integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_unit     int;
  v_total    int;
  v_count    int := 0;
  v_cursor   date;
  v_month_start date := date_trunc('month', p_month)::date;
  v_month_end   date := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
  v_first_valid timestamptz;
  v_starts   timestamptz;
  v_rec_id   uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not authenticated'); END IF;
  IF p_day_of_week = 1 THEN RETURN jsonb_build_object('ok', false, 'error', 'segunda-feira fechado'); END IF;
  IF p_duration_min IS NULL OR p_duration_min NOT IN (30,60,90,120,150,180) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid duration (max 3h)');
  END IF;
  IF EXTRACT(HOUR FROM p_start_time) < 10 OR EXTRACT(HOUR FROM p_start_time) >= 22 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'outside business hours');
  END IF;
  IF p_station_count IS NULL OR p_station_count < 5 OR p_station_count > 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reservations require at least 5 stations (group only)');
  END IF;

  PERFORM 1 FROM public.pc_stations WHERE is_active FOR UPDATE;

  v_cursor := v_month_start;
  WHILE v_cursor <= v_month_end LOOP
    IF EXTRACT(DOW FROM v_cursor)::int = p_day_of_week THEN
      v_starts := (v_cursor + p_start_time) AT TIME ZONE 'America/Sao_Paulo';
      IF v_starts >= now() + interval '4 hours' THEN
        IF public.stations_free_at(v_starts, p_duration_min) < p_station_count THEN
          RETURN jsonb_build_object('ok', false, 'error', 'no room on ' || v_cursor::text, 'conflict_date', v_cursor);
        END IF;
        v_count := v_count + 1;
        IF v_first_valid IS NULL THEN v_first_valid := v_starts; END IF;
      END IF;
    END IF;
    v_cursor := v_cursor + 1;
  END LOOP;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no valid occurrences left this month (4h advance required)');
  END IF;

  -- 3h/session: flat package price for the whole month. Otherwise: hourly rate x occurrences.
  -- Both scaled by station_count since recurring is now group-only too.
  v_unit := public.apply_founding_discount(public.package_base_price(v_first_valid, p_duration_min), auth.uid(), false);
  v_total := (CASE WHEN p_duration_min = 180 THEN v_unit ELSE v_unit * v_count END) * p_station_count;

  INSERT INTO public.recurring_reservations
    (customer_id, day_of_week, start_time, duration_min, month, occurrence_count, price_cents, payment_deadline_at, station_count)
  VALUES
    (auth.uid(), p_day_of_week, p_start_time, p_duration_min, v_month_start, v_count, v_total, now() + interval '1 hour', p_station_count)
  RETURNING id INTO v_rec_id;

  RETURN jsonb_build_object('ok', true, 'recurring_id', v_rec_id, 'occurrence_count', v_count,
                            'price_cents', v_total, 'payment_deadline_at', now() + interval '1 hour');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_reservation(p_starts_at timestamp with time zone, p_duration_min integer, p_station_count integer DEFAULT 5, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_local  timestamp;
  v_dow    int;
  v_hour   int;
  v_unit   int;
  v_total  int;
  v_free   int;
  v_res_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not authenticated'); END IF;
  IF p_starts_at < now() + interval '4 hours' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'minimum 4h advance notice required');
  END IF;
  IF p_duration_min IS NULL OR p_duration_min NOT IN (30,60,90,120,150,180,240) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid duration');
  END IF;
  IF p_station_count IS NULL OR p_station_count < 5 OR p_station_count > 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reservations require at least 5 stations (group only)');
  END IF;

  v_local := p_starts_at AT TIME ZONE 'America/Sao_Paulo';
  v_dow   := EXTRACT(DOW FROM v_local)::int;
  v_hour  := EXTRACT(HOUR FROM v_local)::int;
  IF v_dow = 1 OR v_hour < 10 OR v_hour >= 22 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'outside business hours (ter-dom 10h-22h)');
  END IF;

  PERFORM 1 FROM public.pc_stations WHERE is_active FOR UPDATE;
  v_free := public.stations_free_at(p_starts_at, p_duration_min);
  IF v_free < p_station_count THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not enough stations available', 'free', v_free);
  END IF;

  v_unit  := public.apply_founding_discount(public.package_base_price(p_starts_at, p_duration_min), auth.uid(), false);
  v_total := v_unit * p_station_count;

  INSERT INTO public.reservations
    (customer_id, starts_at, duration_min, station_count, status, note, price_cents, payment_deadline_at)
  VALUES
    (auth.uid(), p_starts_at, p_duration_min, p_station_count, 'awaiting_payment', p_note, v_total, now() + interval '1 hour')
  RETURNING id INTO v_res_id;

  RETURN jsonb_build_object('ok', true, 'reservation_id', v_res_id, 'price_cents', v_total,
                            'payment_deadline_at', now() + interval '1 hour');
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
  IF NOT FOUND OR NOT v_profile.is_founding_member THEN RETURN 0; END IF;

  IF NOT v_profile.founding_discount_used AND v_profile.created_at > now() - interval '60 days' THEN
    IF p_mark_used THEN
      UPDATE public.profiles SET founding_discount_used = true WHERE id = p_customer_id;
    END IF;
    RETURN 25;
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
CREATE OR REPLACE FUNCTION public.expire_finished_fixed_sessions()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Only auto-closes sessions that are already settled (paid upfront or courtesy) —
  -- avulso walk-ins without a transaction still need staff to collect payment in person.
  UPDATE public.sessions
  SET status = 'completed', ended_at = planned_end_at
  WHERE status = 'active'
    AND package_type IS NOT NULL
    AND planned_end_at IS NOT NULL
    AND planned_end_at < now()
    AND (transaction_id IS NOT NULL OR is_courtesy);
$function$
;

CREATE OR REPLACE FUNCTION public.expire_stale_reservations()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.reservations SET status = 'expired'
  WHERE status = 'awaiting_payment' AND payment_deadline_at < now();
  UPDATE public.recurring_reservations SET status = 'expired'
  WHERE status = 'awaiting_payment' AND payment_deadline_at < now();
$function$
;

CREATE OR REPLACE FUNCTION public.founding_minutes_played(p_customer_id uuid, p_month_start date)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) / 60)::int, 0)
  FROM public.sessions s
  WHERE s.customer_id = p_customer_id
    AND s.status = 'completed'
    AND s.started_at >= (p_month_start AT TIME ZONE 'America/Sao_Paulo')
    AND s.started_at < ((p_month_start + interval '1 month')::date AT TIME ZONE 'America/Sao_Paulo');
$function$
;

CREATE OR REPLACE FUNCTION public.generate_pairing_code(p_station_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;

  DELETE FROM public.station_pairing_codes
  WHERE station_id = p_station_id AND redeemed_at IS NULL;

  v_code := lpad((floor(random() * 1000000))::text, 6, '0');

  INSERT INTO public.station_pairing_codes (station_id, code, expires_at)
  VALUES (p_station_id, v_code, now() + interval '30 minutes');

  -- Clear any previous pairing so a re-pair fully replaces it
  UPDATE public.pc_stations SET agent_secret = NULL WHERE id = p_station_id;

  RETURN jsonb_build_object('ok', true, 'code', v_code, 'expires_at', now() + interval '30 minutes');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_customer_discount_pct(p_customer_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT public.customer_discount_pct(p_customer_id, false);
$function$
;

CREATE OR REPLACE FUNCTION public.get_lead_count()
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT count(*) FROM public.leads;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_station_status()
 RETURNS TABLE(station_number integer, label text, is_occupied boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.station_number, s.label,
         EXISTS (SELECT 1 FROM public.sessions ss WHERE ss.station_id = s.id AND ss.status = 'active')
  FROM public.pc_stations s
  WHERE s.is_active
  ORDER BY s.station_number;
$function$
;

CREATE OR REPLACE FUNCTION public.get_secret(secret_name text)
 RETURNS TABLE(secret text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT decrypted_secret AS secret
  FROM vault.decrypted_secrets
  WHERE name = secret_name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_station_availability(p_day date)
 RETURNS TABLE(hour integer, free_count integer, total_count integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total int;
  h int;
BEGIN
  SELECT count(*) INTO v_total FROM public.pc_stations WHERE is_active;
  FOR h IN 10..21 LOOP
    RETURN QUERY
    SELECT h, GREATEST(0, v_total - COALESCE((
      SELECT SUM(r.station_count)::int FROM public.reservations r
      WHERE r.status = 'confirmed'
        AND (p_day + (h || ':00')::time) AT TIME ZONE 'America/Sao_Paulo'
            < r.starts_at + (r.duration_min || ' minutes')::interval
        AND r.starts_at
            < (p_day + ((h+1) || ':00')::time) AT TIME ZONE 'America/Sao_Paulo'
    ), 0))::int, v_total;
  END LOOP;
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
BEGIN
  SELECT id INTO v_lead_id FROM public.leads
  WHERE lower(email) = lower(new.email) AND converted_profile_id IS NULL
  LIMIT 1;

  INSERT INTO public.profiles (id, email, full_name, is_founding_member)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_lead_id IS NOT NULL
  );

  IF v_lead_id IS NOT NULL THEN
    UPDATE public.leads SET converted_profile_id = new.id WHERE id = v_lead_id;
  END IF;

  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('staff', 'admin')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.materialize_recurring(p_recurring_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rec public.recurring_reservations%ROWTYPE;
  v_cursor date;
  v_month_end date;
  v_starts timestamptz;
  v_unit_price int;
BEGIN
  SELECT * INTO v_rec FROM public.recurring_reservations WHERE id = p_recurring_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.reservations WHERE recurring_group_id = p_recurring_id) THEN
    RETURN; -- already materialized, don't duplicate
  END IF;

  v_month_end := (v_rec.month + interval '1 month' - interval '1 day')::date;
  v_unit_price := v_rec.price_cents / GREATEST(v_rec.occurrence_count, 1);
  v_cursor := v_rec.month;
  WHILE v_cursor <= v_month_end LOOP
    IF EXTRACT(DOW FROM v_cursor)::int = v_rec.day_of_week THEN
      v_starts := (v_cursor + v_rec.start_time) AT TIME ZONE 'America/Sao_Paulo';
      IF v_starts >= now() THEN
        INSERT INTO public.reservations
          (customer_id, starts_at, duration_min, station_count, status, price_cents,
           transaction_id, is_recurring, recurring_group_id)
        VALUES
          (v_rec.customer_id, v_starts, v_rec.duration_min, v_rec.station_count, 'confirmed', v_unit_price,
           v_rec.transaction_id, true, v_rec.id);
      END IF;
    END IF;
    v_cursor := v_cursor + 1;
  END LOOP;
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
  IF NOT FOUND OR NOT v_profile.is_founding_member OR NOT v_profile.founding_discount_used THEN
    RETURN jsonb_build_object('is_founding_member', COALESCE(v_profile.is_founding_member, false));
  END IF;

  v_required_min := 240 + v_profile.founding_hours_debt_min;
  v_played_min := public.founding_minutes_played(auth.uid(), v_month_start);

  RETURN jsonb_build_object(
    'is_founding_member', true,
    'lifetime_active_this_month', v_played_min >= v_required_min,
    'played_min', v_played_min,
    'required_min', v_required_min,
    'remaining_min', GREATEST(0, v_required_min - v_played_min)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_reservation_email(p_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_url text := 'https://scrswxgvlwfndsqrclgb.supabase.co/functions/v1/notify-reservation';
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_key, '')
    ),
    body := p_payload
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_reservation_email failed: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_welcome_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  payload jsonb;
  service_key text;
BEGIN
  -- Skip seed data
  IF NEW.is_seed = true THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object('record', to_jsonb(NEW));

  -- Get service role key from vault
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  PERFORM net.http_post(
    url := 'https://scrswxgvlwfndsqrclgb.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, '')
    ),
    body := payload
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.package_base_price(p_starts_at timestamp with time zone, p_duration_min integer)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hour int := EXTRACT(HOUR FROM (p_starts_at AT TIME ZONE 'America/Sao_Paulo'))::int;
  v_base int;
BEGIN
  IF p_duration_min = 180 THEN
    SELECT price_cents INTO v_base FROM public.packages WHERE code = 'pacote_3h';
    RETURN COALESCE(v_base, 4990);
  END IF;
  SELECT price_cents INTO v_base FROM public.packages
  WHERE code = (CASE WHEN v_hour < 18 THEN 'hora_vale' ELSE 'hora_pico' END);
  RETURN ROUND(COALESCE(v_base, 1200)::numeric * p_duration_min / 60.0)::int;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.pair_agent(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_row public.station_pairing_codes%ROWTYPE;
  v_secret text;
  v_station public.pc_stations%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.station_pairing_codes
  WHERE code = p_code AND redeemed_at IS NULL AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid or expired code');
  END IF;
  v_secret := encode(gen_random_bytes(24), 'hex');
  UPDATE public.pc_stations SET agent_secret = v_secret, last_seen_at = now()
  WHERE id = v_row.station_id RETURNING * INTO v_station;
  UPDATE public.station_pairing_codes SET redeemed_at = now() WHERE id = v_row.id;
  RETURN jsonb_build_object('ok', true, 'station_id', v_station.id, 'station_number', v_station.station_number,
                             'label', v_station.label, 'agent_secret', v_secret);
END; $function$
;

CREATE OR REPLACE FUNCTION public.pay_recurring_with_credits(p_recurring_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_rec public.recurring_reservations%ROWTYPE;
  v_balance int;
  v_tx_id uuid;
  v_min_starts timestamptz;
BEGIN
  SELECT * INTO v_rec FROM public.recurring_reservations
  WHERE id = p_recurring_id AND customer_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not found'); END IF;
  IF v_rec.status <> 'awaiting_payment' THEN RETURN jsonb_build_object('ok', false, 'error', 'not awaiting payment'); END IF;
  IF v_rec.payment_deadline_at < now() THEN
    UPDATE public.recurring_reservations SET status = 'expired' WHERE id = p_recurring_id;
    RETURN jsonb_build_object('ok', false, 'error', 'payment window expired');
  END IF;

  SELECT credits_balance INTO v_balance FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF v_balance < v_rec.price_cents THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient credits', 'balance', v_balance);
  END IF;

  UPDATE public.profiles SET credits_balance = credits_balance - v_rec.price_cents WHERE id = auth.uid();
  INSERT INTO public.transactions (customer_id, amount_cents, type, payment_method, status, description)
  VALUES (auth.uid(), v_rec.price_cents, 'reservation_payment', 'credits', 'paid',
          'Plano recorrente ' || v_rec.occurrence_count || 'x')
  RETURNING id INTO v_tx_id;

  PERFORM public.customer_discount_pct(v_rec.customer_id, true);
  UPDATE public.recurring_reservations SET status = 'active', transaction_id = v_tx_id WHERE id = p_recurring_id;
  PERFORM public.materialize_recurring(p_recurring_id);

  SELECT MIN(starts_at) INTO v_min_starts FROM public.reservations WHERE recurring_group_id = p_recurring_id;
  IF v_min_starts IS NOT NULL THEN
    UPDATE public.transactions SET is_off_hours = public.compute_off_hours(v_min_starts) WHERE id = v_tx_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'transaction_id', v_tx_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pay_reservation_with_credits(p_reservation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_res public.reservations%ROWTYPE;
  v_balance int;
  v_free int;
  v_tx_id uuid;
BEGIN
  SELECT * INTO v_res FROM public.reservations
  WHERE id = p_reservation_id AND customer_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not found'); END IF;
  IF v_res.status <> 'awaiting_payment' THEN RETURN jsonb_build_object('ok', false, 'error', 'not awaiting payment'); END IF;
  IF v_res.payment_deadline_at < now() THEN
    UPDATE public.reservations SET status = 'expired' WHERE id = p_reservation_id;
    RETURN jsonb_build_object('ok', false, 'error', 'payment window expired');
  END IF;

  PERFORM 1 FROM public.pc_stations WHERE is_active FOR UPDATE;
  v_free := public.stations_free_at(v_res.starts_at, v_res.duration_min);
  IF v_free < v_res.station_count THEN
    UPDATE public.reservations SET status = 'expired' WHERE id = p_reservation_id;
    RETURN jsonb_build_object('ok', false, 'error', 'slot no longer available');
  END IF;

  SELECT credits_balance INTO v_balance FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF v_balance < v_res.price_cents THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient credits', 'balance', v_balance);
  END IF;

  UPDATE public.profiles SET credits_balance = credits_balance - v_res.price_cents WHERE id = auth.uid();
  INSERT INTO public.transactions (customer_id, amount_cents, type, payment_method, status, description)
  VALUES (auth.uid(), v_res.price_cents, 'reservation_payment', 'credits', 'paid', 'Reserva pré-paga')
  RETURNING id INTO v_tx_id;

  UPDATE public.transactions SET is_off_hours = public.compute_off_hours(v_res.starts_at) WHERE id = v_tx_id;

  PERFORM public.customer_discount_pct(v_res.customer_id, true);
  UPDATE public.reservations SET status = 'confirmed', transaction_id = v_tx_id WHERE id = p_reservation_id;
  RETURN jsonb_build_object('ok', true, 'transaction_id', v_tx_id);
END;
$function$
;

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
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_credit_purchase(p_amount_cents integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authenticated');
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents < 500 OR p_amount_cents > 50000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount must be between R$5 and R$500');
  END IF;

  INSERT INTO public.transactions (customer_id, amount_cents, type, payment_method, status, description)
  VALUES (auth.uid(), p_amount_cents, 'credit_purchase', 'pix', 'pending', 'Compra de créditos (aguardando pagamento)')
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('ok', true, 'transaction_id', v_tx_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reservation_unit_price(p_starts_at timestamp with time zone, p_duration_min integer, p_founding boolean)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_local timestamp := p_starts_at AT TIME ZONE 'America/Sao_Paulo';
  v_hour  int := EXTRACT(HOUR FROM v_local)::int;
  v_pkg   public.packages%ROWTYPE;
  v_rate  int;
BEGIN
  IF p_duration_min = 180 THEN
    SELECT * INTO v_pkg FROM public.packages WHERE code = 'pacote_3h';
    RETURN COALESCE(
      CASE WHEN p_founding THEN v_pkg.founding_price_cents ELSE NULL END,
      v_pkg.price_cents, 4990
    );
  END IF;

  SELECT price_cents INTO v_rate FROM public.packages
  WHERE code = (CASE WHEN v_hour < 18 THEN 'hora_vale' ELSE 'hora_pico' END);
  v_rate := COALESCE(v_rate, 1200);
  RETURN ROUND(v_rate::numeric * p_duration_min / 60.0)::int;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reservation_unit_price(p_starts_at timestamp with time zone, p_duration_min integer, p_customer_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT public.apply_founding_discount(public.package_base_price(p_starts_at, p_duration_min), p_customer_id, false);
$function$
;

CREATE OR REPLACE FUNCTION public.roll_founding_hours_debt()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prev_month  date := (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') - interval '1 month')::date;
  v_row         record;
  v_required    int;
  v_played      int;
BEGIN
  FOR v_row IN
    SELECT id, founding_hours_debt_min FROM public.profiles
    WHERE is_founding_member AND founding_discount_used
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
CREATE OR REPLACE FUNCTION public.sell_product(p_product_id uuid, p_qty integer, p_payment_method text, p_customer_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product public.products%ROWTYPE;
  v_total   int;
  v_tx_id   uuid;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid qty');
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND OR NOT v_product.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'product not found');
  END IF;
  IF v_product.stock_qty < p_qty THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient stock', 'stock', v_product.stock_qty);
  END IF;

  v_total := v_product.price_cents * p_qty;

  UPDATE public.products SET stock_qty = stock_qty - p_qty WHERE id = p_product_id;

  INSERT INTO public.stock_movements (product_id, qty_delta, reason, created_by)
  VALUES (p_product_id, -p_qty, 'sale', auth.uid());

  INSERT INTO public.transactions (customer_id, amount_cents, type, payment_method, status, description)
  VALUES (p_customer_id, v_total, 'product_sale', p_payment_method::public.payment_method, 'paid',
          p_qty || 'x ' || v_product.name)
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('ok', true, 'total_cents', v_total, 'transaction_id', v_tx_id,
                            'stock_left', v_product.stock_qty - p_qty);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_agent_staff_pin(p_pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;
  IF p_pin IS NULL OR length(p_pin) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pin too short');
  END IF;
  INSERT INTO public.app_settings (key, value)
  VALUES ('agent_staff_pin_hash', to_jsonb(crypt(p_pin, gen_salt('bf'))))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_founding_member(p_user_id uuid, p_value boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;
  UPDATE public.profiles SET is_founding_member = p_value WHERE id = p_user_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_reservation_status(p_reservation_id uuid, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_res public.reservations%ROWTYPE;
  v_allowed text[];
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;

  SELECT * INTO v_res FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not found');
  END IF;

  v_allowed := CASE v_res.status
    WHEN 'confirmed' THEN ARRAY['completed', 'no_show', 'cancelled']
    WHEN 'awaiting_payment' THEN ARRAY['cancelled', 'expired']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_status = ANY(v_allowed)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid transition', 'from', v_res.status, 'to', p_status);
  END IF;

  UPDATE public.reservations SET status = p_status WHERE id = p_reservation_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_transaction_off_hours()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.is_off_hours := public.compute_off_hours(COALESCE(NEW.created_at, now()));
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role <> 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'only admins can change roles');
  END IF;
  IF p_role NOT IN ('customer','staff','admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid role');
  END IF;
  IF p_user_id = auth.uid() AND p_role <> 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot demote yourself');
  END IF;

  UPDATE public.profiles SET role = p_role WHERE id = p_user_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.start_courtesy_session(p_station_id uuid, p_pin text, p_package_type text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_hash          text;
  v_station       public.pc_stations%ROWTYPE;
  v_pkg           public.packages%ROWTYPE;
  v_planned_end   timestamptz := NULL;
  v_session_id    uuid;
  v_local         timestamptz;
  v_recent_fails  int;
BEGIN
  IF p_package_type IS NOT NULL AND p_package_type NOT IN ('pacote_3h', 'corujao') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid package');
  END IF;

  -- Lockout: 5+ failed attempts anywhere in the last 10 minutes blocks all attempts
  -- for 10 minutes (global, since the PIN itself is shared across the whole arena).
  SELECT count(*) INTO v_recent_fails FROM public.courtesy_pin_attempts
  WHERE success = false AND created_at > now() - interval '10 minutes';
  IF v_recent_fails >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pin locked');
  END IF;

  SELECT value #>> '{}' INTO v_hash FROM public.app_settings WHERE key = 'agent_staff_pin_hash';
  IF v_hash IS NULL OR crypt(p_pin, v_hash) <> v_hash THEN
    INSERT INTO public.courtesy_pin_attempts (station_id, success) VALUES (p_station_id, false);
    RETURN jsonb_build_object('ok', false, 'error', 'invalid pin');
  END IF;

  INSERT INTO public.courtesy_pin_attempts (station_id, success) VALUES (p_station_id, true);

  SELECT * INTO v_station FROM public.pc_stations WHERE id = p_station_id FOR UPDATE;
  IF NOT FOUND OR NOT v_station.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'station unavailable');
  END IF;

  IF EXISTS (SELECT 1 FROM public.sessions WHERE station_id = p_station_id AND status = 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'station already in use');
  END IF;

  IF p_package_type IS NOT NULL THEN
    SELECT * INTO v_pkg FROM public.packages WHERE code = p_package_type AND is_active;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid package');
    END IF;
    v_planned_end := now() + make_interval(mins => v_pkg.duration_min);
    IF p_package_type = 'corujao' THEN
      v_local := now() AT TIME ZONE 'America/Sao_Paulo';
      v_planned_end := (date_trunc('day', v_local) + CASE WHEN EXTRACT(HOUR FROM v_local) >= 6 THEN interval '1 day' ELSE interval '0' END + interval '6 hours') AT TIME ZONE 'America/Sao_Paulo';
    END IF;
  END IF;

  INSERT INTO public.sessions (customer_id, station_id, package_type, planned_end_at, status, price_cents, transaction_id, is_courtesy)
  VALUES (NULL, p_station_id, p_package_type::public.package_type, v_planned_end, 'active', 0, NULL, true)
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object('ok', true, 'session_id', v_session_id, 'planned_end_at', v_planned_end);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.start_own_session(p_station_id uuid, p_package_type text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id   uuid := auth.uid();
  v_station       public.pc_stations%ROWTYPE;
  v_pkg           public.packages%ROWTYPE;
  v_pct           int;
  v_balance       int;
  v_price_cents   int := 0;
  v_planned_end   timestamptz := NULL;
  v_tx_id         uuid := NULL;
  v_session_id    uuid;
  v_local         timestamptz;
BEGIN
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authenticated');
  END IF;

  IF p_package_type IS NOT NULL AND p_package_type NOT IN ('pacote_3h', 'corujao') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid package');
  END IF;

  SELECT * INTO v_station FROM public.pc_stations WHERE id = p_station_id FOR UPDATE;
  IF NOT FOUND OR NOT v_station.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'station unavailable');
  END IF;

  IF EXISTS (SELECT 1 FROM public.sessions WHERE station_id = p_station_id AND status = 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'station already in use');
  END IF;

  IF EXISTS (SELECT 1 FROM public.sessions WHERE customer_id = v_customer_id AND status = 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'customer already has an active session');
  END IF;

  IF p_package_type IS NOT NULL THEN
    SELECT * INTO v_pkg FROM public.packages WHERE code = p_package_type AND is_active FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid package');
    END IF;

    v_pct := public.customer_discount_pct(v_customer_id, false);
    v_price_cents := CASE WHEN v_pct > 0 THEN ROUND(v_pkg.price_cents * (100 - v_pct) / 100.0)::int ELSE v_pkg.price_cents END;

    SELECT credits_balance INTO v_balance FROM public.profiles WHERE id = v_customer_id FOR UPDATE;
    IF v_balance IS NULL OR v_balance < v_price_cents THEN
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient credits', 'balance', v_balance, 'price_cents', v_price_cents);
    END IF;

    v_planned_end := now() + make_interval(mins => v_pkg.duration_min);

    IF p_package_type = 'corujao' THEN
      v_local := now() AT TIME ZONE 'America/Sao_Paulo';
      v_planned_end := (date_trunc('day', v_local) + CASE WHEN EXTRACT(HOUR FROM v_local) >= 6 THEN interval '1 day' ELSE interval '0' END + interval '6 hours') AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    UPDATE public.profiles SET credits_balance = credits_balance - v_price_cents WHERE id = v_customer_id;

    INSERT INTO public.transactions (customer_id, amount_cents, type, payment_method, status, description)
    VALUES (v_customer_id, v_price_cents, 'purchase', 'credits'::public.payment_method, 'paid', v_pkg.label || ' — ' || v_station.label || ' (self-service)')
    RETURNING id INTO v_tx_id;

    IF v_pct = 25 THEN
      UPDATE public.profiles SET founding_discount_used = true WHERE id = v_customer_id;
    END IF;
  END IF;

  INSERT INTO public.sessions (customer_id, station_id, package_type, planned_end_at, status, price_cents, transaction_id)
  VALUES (v_customer_id, p_station_id, p_package_type::public.package_type, v_planned_end, 'active', v_price_cents, v_tx_id)
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object('ok', true, 'session_id', v_session_id, 'price_cents', v_price_cents, 'planned_end_at', v_planned_end);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.stations_free_at(p_starts_at timestamp with time zone, p_duration_min integer)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total int;
  v_taken int;
  v_ends timestamptz := p_starts_at + (p_duration_min || ' minutes')::interval;
BEGIN
  SELECT count(*) INTO v_total FROM public.pc_stations WHERE is_active;

  SELECT COALESCE(SUM(r.station_count), 0) INTO v_taken
  FROM public.reservations r
  WHERE r.status = 'confirmed'
    AND r.starts_at < v_ends
    AND r.starts_at + (r.duration_min || ' minutes')::interval > p_starts_at;

  RETURN GREATEST(0, v_total - v_taken);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_recurring_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_name  text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'awaiting_payment' THEN
    SELECT email, full_name INTO v_email, v_name FROM public.profiles WHERE id = NEW.customer_id;
    PERFORM public.notify_reservation_email(jsonb_build_object(
      'type', 'recurring_awaiting_payment', 'email', v_email, 'name', v_name,
      'day_of_week', NEW.day_of_week, 'start_time', NEW.start_time,
      'occurrence_count', NEW.occurrence_count, 'price_cents', NEW.price_cents
    ));
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status <> 'active' THEN
    SELECT email, full_name INTO v_email, v_name FROM public.profiles WHERE id = NEW.customer_id;
    PERFORM public.notify_reservation_email(jsonb_build_object(
      'type', 'recurring_active', 'email', v_email, 'name', v_name,
      'day_of_week', NEW.day_of_week, 'start_time', NEW.start_time,
      'occurrence_count', NEW.occurrence_count
    ));
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_reservation_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_name  text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'awaiting_payment' THEN
    SELECT email, full_name INTO v_email, v_name FROM public.profiles WHERE id = NEW.customer_id;
    PERFORM public.notify_reservation_email(jsonb_build_object(
      'type', 'awaiting_payment', 'email', v_email, 'name', v_name,
      'starts_at', NEW.starts_at, 'duration_min', NEW.duration_min,
      'price_cents', NEW.price_cents, 'station_count', NEW.station_count
    ));
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND OLD.status <> 'confirmed' AND NOT NEW.is_recurring THEN
    SELECT email, full_name INTO v_email, v_name FROM public.profiles WHERE id = NEW.customer_id;
    PERFORM public.notify_reservation_email(jsonb_build_object(
      'type', 'confirmed', 'email', v_email, 'name', v_name,
      'starts_at', NEW.starts_at, 'duration_min', NEW.duration_min,
      'price_cents', NEW.price_cents, 'station_count', NEW.station_count
    ));
  END IF;
  RETURN NEW;
END;
$function$
;

-- ── Triggers ─────────────────────────────────────────────────────────────

CREATE TRIGGER on_lead_insert_welcome AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION notify_welcome_email();
CREATE TRIGGER trg_prevent_self_privilege_escalation BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION prevent_self_privilege_escalation();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_recurring_notify AFTER INSERT OR UPDATE ON public.recurring_reservations FOR EACH ROW EXECUTE FUNCTION trg_recurring_notify();
CREATE TRIGGER trg_reservations_notify AFTER INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION trg_reservation_notify();
CREATE TRIGGER trg_tournaments_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tx_off_hours BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION set_transaction_off_hours();

-- ── pg_cron jobs ─────────────────────────────────────────────────────────
-- Reproduced here for documentation/recovery purposes. Requires pg_cron
-- extension + superuser/cron-owner privileges to actually schedule;
-- running this section is idempotent via the unschedule-then-schedule
-- pattern below.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'expire-stale-reservations';
    PERFORM cron.schedule('expire-stale-reservations', '*/5 * * * *', 'SELECT public.expire_stale_reservations();');

    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'expire-finished-fixed-sessions';
    PERFORM cron.schedule('expire-finished-fixed-sessions', '*/5 * * * *', 'SELECT public.expire_finished_fixed_sessions();');

    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'roll-founding-hours-debt';
    PERFORM cron.schedule('roll-founding-hours-debt', '5 3 1 * *', 'SELECT public.roll_founding_hours_debt();');
  END IF;
END $$;
