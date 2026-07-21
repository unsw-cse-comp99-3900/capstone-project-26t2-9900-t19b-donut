-- Restrict global VenueOps event reads
-- to users with an active contract.

ALTER POLICY "authenticated_read_venueops_events"
ON public.venueops_events
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);