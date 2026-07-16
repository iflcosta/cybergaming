-- Lightweight cron monitoring: staff-facing RPC that checks whether each expected pg_cron job has
-- run recently, based on cron.job_run_details. No automatic alerting (out of scope) — just a manual
-- check for the admin panel. Expected interval per job mirrors the schedules documented in CLAUDE.md.
CREATE OR REPLACE FUNCTION public.get_cron_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, cron
AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_job record;
  v_last_run timestamptz;
  v_last_status text;
  v_expected_interval interval;
  v_healthy boolean;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not authorized');
  END IF;

  FOR v_job IN
    SELECT * FROM (VALUES
      ('expire-stale-reservations', interval '10 minutes'),
      ('expire-finished-fixed-sessions', interval '10 minutes'),
      ('roll-founding-hours-debt', interval '35 days'),
      ('notify-expiring-reservations', interval '10 minutes')
    ) AS expected(jobname, max_gap)
  LOOP
    v_expected_interval := v_job.max_gap;

    SELECT jrd.status, jrd.end_time
    INTO v_last_status, v_last_run
    FROM cron.job_run_details jrd
    JOIN cron.job j ON j.jobid = jrd.jobid
    WHERE j.jobname = v_job.jobname
    ORDER BY jrd.end_time DESC
    LIMIT 1;

    v_healthy := v_last_run IS NOT NULL AND v_last_run > now() - v_expected_interval;

    v_result := v_result || jsonb_build_object(
      'jobname', v_job.jobname,
      'exists', EXISTS(SELECT 1 FROM cron.job j WHERE j.jobname = v_job.jobname),
      'last_run_at', v_last_run,
      'last_status', v_last_status,
      'expected_max_gap_minutes', extract(epoch FROM v_expected_interval) / 60,
      'healthy', COALESCE(v_healthy, false)
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'jobs', v_result, 'checked_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cron_health() TO authenticated;
