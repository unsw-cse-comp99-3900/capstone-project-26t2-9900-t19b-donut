-- predicted_labor_demand is a global legacy ML-output table.
-- Authenticated users with a contract may read it.
-- Authenticated writes require global admin access.
-- Backend service_role operations bypass RLS.

DROP POLICY IF EXISTS
  "Allow anon insert on predicted_labor_demand"
  ON public.predicted_labor_demand;

DROP POLICY IF EXISTS
  "Allow anon select on predicted_labor_demand"
  ON public.predicted_labor_demand;

DROP POLICY IF EXISTS
  "authenticated_insert_predicted_labor_demand"
  ON public.predicted_labor_demand;

CREATE POLICY
  "authenticated_insert_predicted_labor_demand"
  ON public.predicted_labor_demand
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

DROP POLICY IF EXISTS
  "authenticated_read_predicted_labor_demand"
  ON public.predicted_labor_demand;

CREATE POLICY
  "authenticated_read_predicted_labor_demand"
  ON public.predicted_labor_demand
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_any_contract((SELECT auth.uid()))
  );