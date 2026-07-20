-- Reliability metrics contain employee-specific sensitive data.
-- Employees may read their own metrics.
-- Direct authenticated writes require global admin access.
-- Backend SECURITY DEFINER functions and service_role access remain unaffected.

DROP POLICY IF EXISTS
  "Authenticated users can view reliability metrics"
  ON public.employee_reliability_metrics;

CREATE POLICY
  "Authenticated users can view reliability metrics"
  ON public.employee_reliability_metrics
  FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS
  "System can manage reliability metrics"
  ON public.employee_reliability_metrics;

CREATE POLICY
  "System can manage reliability metrics"
  ON public.employee_reliability_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

DROP POLICY IF EXISTS
  "System can update reliability metrics"
  ON public.employee_reliability_metrics;

CREATE POLICY
  "System can update reliability metrics"
  ON public.employee_reliability_metrics
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );