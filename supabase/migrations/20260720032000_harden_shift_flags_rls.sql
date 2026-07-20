-- shift_flags inherits access scope from the related shift.
-- Assigned employees and scoped shift viewers may read flags.
-- Direct writes require shift.edit in both the old and new shift scope.

DROP POLICY IF EXISTS
  "Authenticated users can manage shift flags"
  ON public.shift_flags;

CREATE POLICY
  "Authenticated users can manage shift flags"
  ON public.shift_flags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      WHERE shift.id = shift_flags.shift_id
        AND public.user_has_action_in_scope(
          'shift.edit',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      WHERE shift.id = shift_flags.shift_id
        AND public.user_has_action_in_scope(
          'shift.edit',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
    )
  );

DROP POLICY IF EXISTS
  "Authenticated users can view shift flags"
  ON public.shift_flags;

CREATE POLICY
  "Authenticated users can view shift flags"
  ON public.shift_flags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      WHERE shift.id = shift_flags.shift_id
        AND (
          shift.assigned_employee_id = (SELECT auth.uid())
          OR public.user_has_action_in_scope(
            'shift.view',
            shift.organization_id,
            shift.department_id,
            shift.sub_department_id
          )
        )
    )
  );