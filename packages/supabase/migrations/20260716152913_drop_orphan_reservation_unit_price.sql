-- Confirmed no other function calls reservation_unit_price (searched prosrc). Orphan overloads, user-approved removal.
DROP FUNCTION IF EXISTS public.reservation_unit_price(timestamptz, integer, boolean);
DROP FUNCTION IF EXISTS public.reservation_unit_price(timestamptz, integer, uuid);
