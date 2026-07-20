-- Department budgets inherit organization and department scope from departments.
-- Reads require roster.view; writes require roster.edit.
-- Global administrators retain access through is_admin().

DROP POLICY IF EXISTS
  "Authenticated users can view budgets"
  ON public.department_budgets;

CREATE POLICY
  "Authenticated users can view budgets"
  ON public.department_budgets
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.departments AS department
      WHERE department.id = department_budgets.dept_id
        AND public.user_has_action_in_scope(
          'roster.view',
          department.organization_id,
          department.id,
          NULL::uuid
        )
    )
  );

DROP POLICY IF EXISTS
  "Managers can manage budgets"
  ON public.department_budgets;

CREATE POLICY
  "Managers can manage budgets"
  ON public.department_budgets
  FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.departments AS department
      WHERE department.id = department_budgets.dept_id
        AND public.user_has_action_in_scope(
          'roster.edit',
          department.organization_id,
          department.id,
          NULL::uuid
        )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.departments AS department
      WHERE department.id = department_budgets.dept_id
        AND public.user_has_action_in_scope(
          'roster.edit',
          department.organization_id,
          department.id,
          NULL::uuid
        )
    )
  );