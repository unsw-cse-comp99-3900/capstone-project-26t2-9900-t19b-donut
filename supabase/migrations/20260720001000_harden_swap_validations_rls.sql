-- Harden swap_validations RLS.
-- Employees may access their own validation records.
-- Managers require shift-scoped permissions.

DROP POLICY IF EXISTS
  "Authenticated users can view validations"
  ON public.swap_validations;

CREATE POLICY
  "Authenticated users can view validations"
  ON public.swap_validations
  FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.swap_requests AS request
      WHERE request.id = swap_validations.swap_request_id
        AND EXISTS (
          SELECT 1
          FROM public.shifts AS managed_shift
          WHERE managed_shift.id IN (
            request.original_shift_id,
            request.offered_shift_id
          )
            AND public.user_has_action_in_scope(
              'shift.view',
              managed_shift.organization_id,
              managed_shift.department_id,
              managed_shift.sub_department_id
            )
        )
    )
  );

DROP POLICY IF EXISTS
  "System can create validations"
  ON public.swap_validations;

CREATE POLICY
  "System can create validations"
  ON public.swap_validations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.swap_requests AS request
      WHERE request.id = swap_validations.swap_request_id
        AND (
          swap_validations.employee_id = request.requested_by_employee_id
          OR swap_validations.employee_id = request.swap_with_employee_id
          OR EXISTS (
            SELECT 1
            FROM public.shifts AS participant_shift
            WHERE participant_shift.id IN (
              request.original_shift_id,
              request.offered_shift_id
            )
              AND participant_shift.assigned_employee_id =
                  swap_validations.employee_id
          )
        )
        AND (
          swap_validations.employee_id = (SELECT auth.uid())
          OR EXISTS (
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
    )
  );