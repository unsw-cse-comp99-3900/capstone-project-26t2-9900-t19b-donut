-- Performance metrics contain employee-specific sensitive data.
-- Employees may read their own metrics.
-- Direct authenticated writes require global admin access.
-- Locked metrics cannot be updated through the authenticated UPDATE policy.
-- Backend SECURITY DEFINER functions and service_role access remain unaffected.

DROP POLICY IF EXISTS
  "Authenticated users can view performance metrics"
  ON public.employee_performance_metrics;

CREATE POLICY
  "Authenticated users can view performance metrics"
  ON public.employee_performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS
  "System can manage performance metrics"
  ON public.employee_performance_metrics;

CREATE POLICY
  "System can manage performance metrics"
  ON public.employee_performance_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

DROP POLICY IF EXISTS
  "System can update unlocked performance metrics"
  ON public.employee_performance_metrics;

CREATE POLICY
  "System can update unlocked performance metrics"
  ON public.employee_performance_metrics
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    AND is_locked IS NOT TRUE
  )
  WITH CHECK (
    public.is_admin()
  );