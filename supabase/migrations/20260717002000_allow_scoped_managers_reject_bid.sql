-- Allow managers to reject bids within their certified scope while keeping
-- user/contract administration restricted to Epsilon/Zeta admins.

CREATE OR REPLACE FUNCTION public.auth_can_manage_bid_shift(p_shift_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shifts AS shift
    JOIN public.app_access_certificates AS certificate
      ON certificate.user_id = auth.uid()
     AND certificate.is_active = true
     AND certificate.certificate_type = 'Y'
    WHERE shift.id = p_shift_id
      AND (
        certificate.access_level = 'zeta'
        OR (
          certificate.access_level = 'epsilon'
          AND certificate.organization_id = shift.organization_id
        )
        OR (
          certificate.access_level = 'delta'
          AND certificate.organization_id = shift.organization_id
          AND certificate.department_id = shift.department_id
        )
        OR (
          certificate.access_level = 'gamma'
          AND certificate.organization_id = shift.organization_id
          AND certificate.department_id = shift.department_id
          AND certificate.sub_department_id = shift.sub_department_id
        )
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.legacy_system_role IN ('admin', 'manager')
  );
$$;

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

  IF NOT public.auth_can_manage_bid_shift(v_shift.id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'MANAGER_SCOPE_REQUIRED');
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
      last_modified_reason = 'Bid rejected by management; shift reopened for bidding',
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

REVOKE ALL ON FUNCTION public.auth_can_manage_bid_shift(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_can_manage_bid_shift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_can_manage_bid_shift(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.admin_reject_shift_bid(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_shift_bid(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_shift_bid(uuid, text) TO service_role;

COMMENT ON FUNCTION public.auth_can_manage_bid_shift(uuid) IS
  'Checks Gamma/Delta/Epsilon/Zeta management authority against the target shift scope.';
COMMENT ON FUNCTION public.admin_reject_shift_bid(uuid, text) IS
  'Scoped manager/admin bid rejection with notification and atomic shift reopening.';
