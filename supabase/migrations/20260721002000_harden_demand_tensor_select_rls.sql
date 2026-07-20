-- demand_tensor rows normally inherit scope from their synthesis run.
-- Scoped reads use the same shift.create permission as synthesis_runs.
-- Legacy event-based rows without a synthesis_run_id remain available to
-- administrators and authenticated users with an active contract.
-- Existing manager INSERT, UPDATE, and DELETE policies remain unchanged.

DROP POLICY IF EXISTS
  "authenticated_read_demand_tensor"
  ON public.demand_tensor;

CREATE POLICY
  "authenticated_read_demand_tensor"
  ON public.demand_tensor
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (
      synthesis_run_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.synthesis_runs AS synthesis_run
        WHERE synthesis_run.id = demand_tensor.synthesis_run_id
          AND public.user_has_action_in_scope(
            'shift.create',
            synthesis_run.organization_id,
            synthesis_run.department_id,
            synthesis_run.sub_department_id
          )
      )
    )
    OR (
      synthesis_run_id IS NULL
      AND public.user_has_any_contract((SELECT auth.uid()))
    )
  );