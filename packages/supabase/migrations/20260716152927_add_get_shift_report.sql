-- Shift/cash-close report: aggregates paid transactions in a period by payment_method and (optionally) by staff.
-- Default period: since last BRT midnight until now, when p_since/p_until are not provided.
-- (Mirrors the final state after the same-day fix migration 20260716153002_fix_get_shift_report_null_staff_label,
-- folded in here — NULL staff_id rows are labeled "Automático / sem staff" instead of crashing jsonb_object_agg.)
CREATE OR REPLACE FUNCTION public.get_shift_report(
  p_staff_id uuid DEFAULT NULL,
  p_since timestamptz DEFAULT NULL,
  p_until timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_since timestamptz;
  v_until timestamptz;
  v_by_method jsonb;
  v_by_staff jsonb;
  v_total_cents bigint;
  v_count bigint;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;

  v_until := COALESCE(p_until, now());
  v_since := COALESCE(
    p_since,
    (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')
  );

  SELECT jsonb_object_agg(payment_method, sub.total), SUM(sub.total), SUM(sub.cnt)
  INTO v_by_method, v_total_cents, v_count
  FROM (
    SELECT payment_method, SUM(amount_cents) AS total, COUNT(*) AS cnt
    FROM public.transactions
    WHERE status = 'paid'
      AND created_at >= v_since AND created_at < v_until
      AND (p_staff_id IS NULL OR staff_id = p_staff_id)
    GROUP BY payment_method
  ) sub;

  v_by_staff := NULL;
  IF p_staff_id IS NULL THEN
    -- NULL staff_id = automatic transaction (webhook, close_open_session, courtesy, etc.), labeled distinctly.
    SELECT jsonb_object_agg(COALESCE(p.full_name, p.email, 'Automático / sem staff'), sub.total)
    INTO v_by_staff
    FROM (
      SELECT staff_id AS staff_key, SUM(amount_cents) AS total
      FROM public.transactions
      WHERE status = 'paid'
        AND created_at >= v_since AND created_at < v_until
      GROUP BY staff_id
    ) sub
    LEFT JOIN public.profiles p ON p.id = sub.staff_key;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'since', v_since,
    'until', v_until,
    'staff_id', p_staff_id,
    'total_cents', COALESCE(v_total_cents, 0),
    'count', COALESCE(v_count, 0),
    'by_payment_method', COALESCE(v_by_method, '{}'::jsonb),
    'by_staff', v_by_staff
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_shift_report(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shift_report(uuid, timestamptz, timestamptz) TO authenticated;
