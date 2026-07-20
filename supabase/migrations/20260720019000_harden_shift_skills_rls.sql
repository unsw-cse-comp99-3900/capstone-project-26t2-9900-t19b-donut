-- shift_skills inherits its access scope from the related shift.
-- Assigned employees and scoped shift viewers may read requirements.
-- Direct INSERT and DELETE operations require shift.edit access.

DROP POLICY IF EXISTS
  "Authenticated users can delete shift_skills"
  ON public.shift_skills;

CREATE POLICY
  "Authenticated users can delete shift_skills"
  ON public.shift_skills
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      WHERE shift.id = shift_skills.shift_id
        AND public.user_has_action_in_scope(
          'shift.edit',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
    )
  );

DROP POLICY IF EXISTS
  "Authenticated users can manage shift_skills"
  ON public.shift_skills;

CREATE POLICY
  "Authenticated users can manage shift_skills"
  ON public.shift_skills
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      WHERE shift.id = shift_skills.shift_id
        AND public.user_has_action_in_scope(
          'shift.edit',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
    )
  );

DROP POLICY IF EXISTS
  "Authenticated users can view shift_skills"
  ON public.shift_skills;

CREATE POLICY
  "Authenticated users can view shift_skills"
  ON public.shift_skills
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      WHERE shift.id = shift_skills.shift_id
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