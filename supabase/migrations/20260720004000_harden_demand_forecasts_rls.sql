DROP POLICY IF EXISTS "Allow anon insert on demand_forecasts"
ON public.demand_forecasts;

DROP POLICY IF EXISTS "Allow anon select on demand_forecasts"
ON public.demand_forecasts;

DROP POLICY IF EXISTS "authenticated_all_demand_forecasts"
ON public.demand_forecasts;

CREATE POLICY "authenticated_all_demand_forecasts"
ON public.demand_forecasts
FOR ALL
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.roles AS role
    LEFT JOIN public.sub_departments AS sub_department
      ON sub_department.id = role.sub_department_id
    JOIN public.departments AS department
      ON department.id = COALESCE(
        role.department_id,
        sub_department.department_id
      )
    WHERE role.id = demand_forecasts.role_id
      AND public.user_has_action_in_scope(
        'shift.create',
        department.organization_id,
        department.id,
        role.sub_department_id
      )
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.roles AS role
    LEFT JOIN public.sub_departments AS sub_department
      ON sub_department.id = role.sub_department_id
    JOIN public.departments AS department
      ON department.id = COALESCE(
        role.department_id,
        sub_department.department_id
      )
    WHERE role.id = demand_forecasts.role_id
      AND public.user_has_action_in_scope(
        'shift.create',
        department.organization_id,
        department.id,
        role.sub_department_id
      )
  )
);

DROP POLICY IF EXISTS "authenticated_read_demand_forecasts"
ON public.demand_forecasts;

CREATE POLICY "authenticated_read_demand_forecasts"
ON public.demand_forecasts
FOR SELECT
TO authenticated
USING (
  (
    demand_forecasts.role_id IS NULL
    AND public.user_has_any_contract((SELECT auth.uid()))
  )
  OR EXISTS (
    SELECT 1
    FROM public.roles AS role
    LEFT JOIN public.sub_departments AS sub_department
      ON sub_department.id = role.sub_department_id
    JOIN public.departments AS department
      ON department.id = COALESCE(
        role.department_id,
        sub_department.department_id
      )
    WHERE role.id = demand_forecasts.role_id
      AND public.user_has_action_in_scope(
        'roster.view',
        department.organization_id,
        department.id,
        role.sub_department_id
      )
  )
);