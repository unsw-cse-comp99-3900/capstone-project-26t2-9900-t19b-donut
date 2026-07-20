-- employee_licenses follows the same ownership model as employee_skills.
-- Employees may manage their own license records.
-- Global admins retain management access to all employee license records.

DROP POLICY IF EXISTS
  "Authenticated users can delete employee licenses"
  ON public.employee_licenses;

CREATE POLICY
  "Authenticated users can delete employee licenses"
  ON public.employee_licenses
  FOR DELETE
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS
  "Authenticated users can manage employee licenses"
  ON public.employee_licenses;

CREATE POLICY
  "Authenticated users can manage employee licenses"
  ON public.employee_licenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (SELECT auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS
  "Authenticated users can update employee licenses"
  ON public.employee_licenses;

CREATE POLICY
  "Authenticated users can update employee licenses"
  ON public.employee_licenses
  FOR UPDATE
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    employee_id = (SELECT auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS
  "Authenticated users can view employee licenses"
  ON public.employee_licenses;

CREATE POLICY
  "Authenticated users can view employee licenses"
  ON public.employee_licenses
  FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR public.is_admin()
  );