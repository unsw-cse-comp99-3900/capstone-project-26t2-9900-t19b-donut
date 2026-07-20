-- Break the shifts <-> shift_swaps RLS recursion.
-- The helper runs as the function owner, so reading shifts does not
-- re-enter the shifts RLS policies.

CREATE OR REPLACE FUNCTION public.can_view_related_swap_shift(
  p_requester_shift_id uuid,
  p_target_shift_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shifts AS shift
    WHERE shift.id IN (
      p_requester_shift_id,
      p_target_shift_id
    )
      AND (
        shift.assigned_employee_id = (SELECT auth.uid())
        OR public.user_has_action_in_scope(
          'shift.view',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
      )
  );
$$;

REVOKE ALL
ON FUNCTION public.can_view_related_swap_shift(uuid, uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.can_view_related_swap_shift(uuid, uuid)
TO authenticated, service_role;


DROP POLICY IF EXISTS "swaps_select_all"
ON public.shift_swaps;

CREATE POLICY "swaps_select_all"
ON public.shift_swaps
FOR SELECT
TO authenticated
USING (
  requester_id = (SELECT auth.uid())
  OR target_id = (SELECT auth.uid())
  OR public.can_view_related_swap_shift(
    requester_shift_id,
    target_shift_id
  )
);

COMMENT ON POLICY "swaps_select_all"
ON public.shift_swaps
IS 'Swap participants and employees assigned to related shifts may read the swap; managers require scoped shift.view access.';