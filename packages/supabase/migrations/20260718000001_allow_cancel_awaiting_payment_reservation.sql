-- Extend cancel_my_reservation to also allow cancelling reservations still
-- awaiting payment (status = 'awaiting_payment'), regardless of starts_at,
-- since an unpaid reservation can be cancelled anytime before its payment
-- deadline. Previously only 'confirmed' + future reservations were cancellable,
-- leaving the customer with no way to cancel and only wait for the payment
-- deadline to expire.
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
  IF v_res.status = 'awaiting_payment' THEN
    UPDATE public.reservations SET status = 'cancelled' WHERE id = p_reservation_id;
    RETURN jsonb_build_object('ok', true);
  END IF;
  IF v_res.status <> 'confirmed' OR v_res.starts_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not cancellable');
  END IF;
  UPDATE public.reservations SET status = 'cancelled' WHERE id = p_reservation_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$
