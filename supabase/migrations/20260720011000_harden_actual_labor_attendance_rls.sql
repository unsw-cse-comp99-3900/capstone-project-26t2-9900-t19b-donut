-- actual_labor_attendance is a global ML/attendance input table.
-- It has no organization, department, or sub-department scope relationship.
-- Authenticated reads require an active contract.
-- Authenticated writes require global admin access.
-- Backend service_role operations continue to bypass RLS.

DROP POLICY IF EXISTS "authenticated_insert_actual_labor_attendance"
ON public.actual_labor_attendance;

CREATE POLICY "authenticated_insert_actual_labor_attendance"
ON public.actual_labor_attendance
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

DROP POLICY IF EXISTS "authenticated_read_actual_labor_attendance"
ON public.actual_labor_attendance;

CREATE POLICY "authenticated_read_actual_labor_attendance"
ON public.actual_labor_attendance
FOR SELECT
TO authenticated
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);