-- Employees may read their own rest-period violations.
-- Scoped managers may read violations only when both related shifts
-- are within their shift.view scope.
-- Authenticated inserts require shift.edit access to both shifts and
-- must reference the employee assigned to both shifts.
-- Backend service_role operations continue to bypass RLS.

DROP POLICY IF EXISTS
  "Authenticated users can view rest violations"
  ON public.rest_period_violations;

CREATE POLICY
  "Authenticated users can view rest violations"
  ON public.rest_period_violations
  FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.shifts AS first_shift
      JOIN public.shifts AS second_shift
        ON second_shift.id = rest_period_violations.second_shift_id
      WHERE first_shift.id = rest_period_violations.first_shift_id
        AND public.user_has_action_in_scope(
          'shift.view',
          first_shift.organization_id,
          first_shift.department_id,
          first_shift.sub_department_id
        )
        AND public.user_has_action_in_scope(
          'shift.view',
          second_shift.organization_id,
          second_shift.department_id,
          second_shift.sub_department_id
        )
    )
  );

DROP POLICY IF EXISTS
  "System can create rest violations"
  ON public.rest_period_violations;

CREATE POLICY
  "System can create rest violations"
  ON public.rest_period_violations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shifts AS first_shift
      JOIN public.shifts AS second_shift
        ON second_shift.id = rest_period_violations.second_shift_id
      WHERE first_shift.id = rest_period_violations.first_shift_id
        AND first_shift.assigned_employee_id =
            rest_period_violations.employee_id
        AND second_shift.assigned_employee_id =
            rest_period_violations.employee_id
        AND public.user_has_action_in_scope(
          'shift.edit',
          first_shift.organization_id,
          first_shift.department_id,
          first_shift.sub_department_id
        )
        AND public.user_has_action_in_scope(
          'shift.edit',
          second_shift.organization_id,
          second_shift.department_id,
          second_shift.sub_department_id
        )
    )
  );