-- Suitability scores contain employee-specific sensitive data.
-- Employees may read their own scores.
-- Direct authenticated writes require global admin access.
-- Backend SECURITY DEFINER functions and service_role access remain unaffected.

DROP POLICY IF EXISTS
  "Authenticated users can view all suitability scores"
  ON public.employee_suitability_scores;

CREATE POLICY
  "Authenticated users can view all suitability scores"
  ON public.employee_suitability_scores
  FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS
  "System can manage suitability scores"
  ON public.employee_suitability_scores;

CREATE POLICY
  "System can manage suitability scores"
  ON public.employee_suitability_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

DROP POLICY IF EXISTS
  "System can update suitability scores"
  ON public.employee_suitability_scores;

CREATE POLICY
  "System can update suitability scores"
  ON public.employee_suitability_scores
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );