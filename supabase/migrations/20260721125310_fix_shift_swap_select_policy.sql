DROP POLICY IF EXISTS "swaps_select_all"
ON public.shift_swaps;

CREATE POLICY "swaps_select_all"
ON public.shift_swaps
FOR SELECT
TO authenticated
USING (
  requester_id = (SELECT auth.uid())
  OR target_id = (SELECT auth.uid())
  OR public.is_admin()
);

COMMENT ON POLICY "swaps_select_all"
ON public.shift_swaps
IS 'Swap participants and users recognized by public.is_admin() may view swap requests.';