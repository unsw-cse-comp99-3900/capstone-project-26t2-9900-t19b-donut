-- R3: Harden swap_notifications INSERT policy.
--
-- Background service_role operations bypass RLS. Authenticated callers may
-- create notifications only for participants in a swap attached to a shift
-- they are authorised to edit or assign.

ALTER TABLE public.swap_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can create notifications"
ON public.swap_notifications;

CREATE POLICY "System can create notifications"
ON public.swap_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.swap_requests AS request
    WHERE request.id = swap_notifications.swap_request_id
      AND (
        swap_notifications.recipient_user_id =
          request.requested_by_employee_id

        OR swap_notifications.recipient_user_id =
          request.swap_with_employee_id

        OR EXISTS (
          SELECT 1
          FROM public.shifts AS recipient_shift
          WHERE recipient_shift.id IN (
            request.original_shift_id,
            request.offered_shift_id
          )
            AND recipient_shift.assigned_employee_id =
              swap_notifications.recipient_user_id
        )
      )
      AND EXISTS (
        SELECT 1
        FROM public.shifts AS managed_shift
        WHERE managed_shift.id IN (
          request.original_shift_id,
          request.offered_shift_id
        )
          AND (
            public.user_has_action_in_scope(
              'shift.edit',
              managed_shift.organization_id,
              managed_shift.department_id,
              managed_shift.sub_department_id
            )
            OR public.user_has_action_in_scope(
              'shift.assign',
              managed_shift.organization_id,
              managed_shift.department_id,
              managed_shift.sub_department_id
            )
          )
      )
  )
);

COMMENT ON POLICY "System can create notifications"
ON public.swap_notifications IS
  'R3: authenticated callers may notify only swap participants for swaps attached to shifts in their management scope; service_role bypasses RLS.';