-- demand_rules is a global read-only demand-engine rule library.
-- Administrators and authenticated users with an active contract may read it.

DROP POLICY IF EXISTS
  "authenticated_read_demand_rules"
  ON public.demand_rules;

CREATE POLICY
  "authenticated_read_demand_rules"
  ON public.demand_rules
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.user_has_any_contract((SELECT auth.uid()))
  );