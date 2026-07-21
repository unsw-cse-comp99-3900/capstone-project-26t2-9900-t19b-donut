-- Restrict global VenueOps booked-space reads
-- to users with an active contract.

ALTER POLICY "authenticated_read_venueops_booked_spaces"
ON public.venueops_booked_spaces
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);