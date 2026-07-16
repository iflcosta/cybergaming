-- Consolidate duplicate permissive RLS policies + wrap auth.uid() in (select ...) for init-plan caching.
-- No behavior change intended: ALL-cmd staff policies are split into INSERT/UPDATE/DELETE so they stop
-- overlapping with existing SELECT policies (which already cover staff via is_staff_or_admin() OR / separately).

-- ============ packages ============
DROP POLICY IF EXISTS "packages: staff write" ON public.packages;
CREATE POLICY "packages: staff insert" ON public.packages FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "packages: staff update" ON public.packages FOR UPDATE USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());
CREATE POLICY "packages: staff delete" ON public.packages FOR DELETE USING (is_staff_or_admin());

-- ============ pc_stations ============
DROP POLICY IF EXISTS "stations: staff write" ON public.pc_stations;
CREATE POLICY "stations: staff insert" ON public.pc_stations FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "stations: staff update" ON public.pc_stations FOR UPDATE USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());
CREATE POLICY "stations: staff delete" ON public.pc_stations FOR DELETE USING (is_staff_or_admin());

-- ============ tournaments ============
DROP POLICY IF EXISTS "tournaments: staff write" ON public.tournaments;
CREATE POLICY "tournaments: staff insert" ON public.tournaments FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "tournaments: staff update" ON public.tournaments FOR UPDATE USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());
CREATE POLICY "tournaments: staff delete" ON public.tournaments FOR DELETE USING (is_staff_or_admin());

-- ============ profiles ============
-- "own read" + "staff read" were two permissive SELECT policies -> merge into one with OR.
DROP POLICY IF EXISTS "profiles: own read" ON public.profiles;
DROP POLICY IF EXISTS "profiles: staff read" ON public.profiles;
CREATE POLICY "profiles: read" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id OR is_staff_or_admin());
ALTER POLICY "profiles: own update" ON public.profiles
  USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

-- ============ transactions ============
DROP POLICY IF EXISTS "transactions: staff write" ON public.transactions;
CREATE POLICY "transactions: staff insert" ON public.transactions FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "transactions: staff update" ON public.transactions FOR UPDATE USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());
CREATE POLICY "transactions: staff delete" ON public.transactions FOR DELETE USING (is_staff_or_admin());
DROP POLICY IF EXISTS "transactions: own read" ON public.transactions;
DROP POLICY IF EXISTS "transactions: staff read" ON public.transactions;
CREATE POLICY "transactions: read" ON public.transactions
  FOR SELECT USING ((select auth.uid()) = customer_id OR is_staff_or_admin());

-- ============ sessions ============
-- "staff all" (ALL) overlapped with both SELECT policies. Split staff into INSERT/UPDATE/DELETE.
-- Keep "sessions: public read while active" (anon-only) and "sessions: own read" separate: different
-- roles/semantics (anon-wide live status vs authenticated own history) — not safe to merge.
DROP POLICY IF EXISTS "sessions: staff all" ON public.sessions;
CREATE POLICY "sessions: staff insert" ON public.sessions FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "sessions: staff update" ON public.sessions FOR UPDATE USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());
CREATE POLICY "sessions: staff delete" ON public.sessions FOR DELETE USING (is_staff_or_admin());
ALTER POLICY "sessions: own read" ON public.sessions
  USING ((select auth.uid()) = customer_id);

-- ============ reservations ============
-- "staff all" overlapped with "own read" (SELECT) and "own cancel" (UPDATE). The UPDATE overlap with
-- "own cancel" is left as-is (different with_check semantics: staff can set any status, customer can
-- only self-cancel) — merging risks behavior change, so only removing the redundant SELECT overlap.
DROP POLICY IF EXISTS "reservations: staff all" ON public.reservations;
CREATE POLICY "reservations: staff insert" ON public.reservations FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "reservations: staff update" ON public.reservations FOR UPDATE USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());
CREATE POLICY "reservations: staff delete" ON public.reservations FOR DELETE USING (is_staff_or_admin());
ALTER POLICY "reservations: own read" ON public.reservations
  USING (customer_id = (select auth.uid()) OR is_staff_or_admin());
ALTER POLICY "reservations: own cancel" ON public.reservations
  USING (customer_id = (select auth.uid()) AND status = ANY (ARRAY['awaiting_payment'::text, 'confirmed'::text]))
  WITH CHECK (status = 'cancelled'::text);

-- ============ recurring_reservations ============
DROP POLICY IF EXISTS "recurring: staff all" ON public.recurring_reservations;
CREATE POLICY "recurring: staff insert" ON public.recurring_reservations FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "recurring: staff update" ON public.recurring_reservations FOR UPDATE USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());
CREATE POLICY "recurring: staff delete" ON public.recurring_reservations FOR DELETE USING (is_staff_or_admin());
ALTER POLICY "recurring: own read" ON public.recurring_reservations
  USING (customer_id = (select auth.uid()) OR is_staff_or_admin());

-- ============ Missing FK indexes (19) ============
CREATE INDEX IF NOT EXISTS idx_courtesy_pin_attempts_station_id ON public.courtesy_pin_attempts(station_id);
CREATE INDEX IF NOT EXISTS idx_leads_converted_profile_id ON public.leads(converted_profile_id);
CREATE INDEX IF NOT EXISTS idx_recurring_reservations_customer_id ON public.recurring_reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_reservations_transaction_id ON public.recurring_reservations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_station_id ON public.reservations(station_id);
CREATE INDEX IF NOT EXISTS idx_reservations_transaction_id ON public.reservations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_session_billing_segments_session_id ON public.session_billing_segments(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_customer_id ON public.sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_transaction_id ON public.sessions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_station_pairing_codes_station_id ON public.station_pairing_codes(station_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON public.stock_movements(created_by);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_team_members_profile_id ON public.team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_teams_captain_id ON public.teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_teams_tournament_id ON public.teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_teams_transaction_id ON public.teams(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_staff_id ON public.transactions(staff_id);
