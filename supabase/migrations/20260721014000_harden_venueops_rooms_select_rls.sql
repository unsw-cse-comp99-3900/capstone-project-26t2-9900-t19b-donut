-- Restrict global VenueOps room reference-data reads
-- to users with an active contract.

ALTER POLICY "authenticated_read_venueops_rooms"
ON public.venueops_rooms
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);