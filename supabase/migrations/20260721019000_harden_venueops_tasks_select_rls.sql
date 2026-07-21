-- Restrict VenueOps operational-task reads
-- to users with an active contract.

ALTER POLICY "authenticated_read_venueops_tasks"
ON public.venueops_tasks
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);