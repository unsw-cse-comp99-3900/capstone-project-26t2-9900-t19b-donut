-- Atomically reject one employee bid, notify the employee with the admin's
-- reason, and keep the unfilled published shift open to all other employees.

CREATE OR REPLACE FUNCTION public.admin_reject_shift_bid(
  p_bid_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_bid public.shift_bids%ROWTYPE;
  v_shift public.shifts%ROWTYPE;
  v_reason text := btrim(COALESCE(p_reason, ''));
BEGIN
  IF NOT public.auth_can_manage_certificates() THEN
    RETURN jsonb_build_object('success', false, 'error', 'ADMIN_REQUIRED');
  END IF;

  IF v_reason = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'REASON_REQUIRED');
  END IF;

  SELECT * INTO v_bid
  FROM public.shift_bids
  WHERE id = p_bid_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BID_NOT_FOUND');
  END IF;

  IF v_bid.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'BID_NOT_PENDING');
  END IF;

  SELECT * INTO v_shift
  FROM public.shifts
  WHERE id = v_bid.shift_id
    AND deleted_at IS NULL
    AND is_cancelled = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'SHIFT_NOT_AVAILABLE');
  END IF;

  IF v_shift.assigned_employee_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SHIFT_ALREADY_ASSIGNED');
  END IF;

  IF v_shift.lifecycle_status <> 'Published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'SHIFT_NOT_PUBLISHED');
  END IF;

  UPDATE public.shift_bids
  SET status = 'rejected',
      allocation_reason = v_reason,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  WHERE id = v_bid.id;

  UPDATE public.shifts
  SET bidding_status = 'on_bidding'::public.shift_bidding_status,
      is_on_bidding = true,
      bidding_enabled = true,
      assignment_status = 'unassigned'::public.shift_assignment_status,
      fulfillment_status = 'bidding'::public.shift_fulfillment_status,
      last_modified_by = auth.uid(),
      last_modified_reason = 'Bid rejected by admin; shift reopened for bidding',
      version = version + 1,
      updated_at = now()
  WHERE id = v_shift.id;

  PERFORM public.notify_user(
    v_bid.employee_id,
    'bid_rejected',
    'Bid application withdrawn',
    'Your bid was not approved and has been withdrawn. Reason: ' || v_reason,
    v_shift.id,
    'shift',
    '/my-bids',
    'admin-bid-rejected:' || v_bid.id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'bid_id', v_bid.id,
    'shift_id', v_shift.id,
    'employee_id', v_bid.employee_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_shift_bid(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_shift_bid(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_shift_bid(uuid, text) TO service_role;

COMMENT ON FUNCTION public.admin_reject_shift_bid(uuid, text) IS
  'Admin-only atomic rejection: records the reason, notifies the bidder, and keeps the unfilled shift open for bidding.';
