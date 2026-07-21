-- Restrict global VenueOps event-type lookup reads
-- to users with an active contract.

ALTER POLICY "authenticated_read_venueops_event_types"
ON public.venueops_event_types
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);