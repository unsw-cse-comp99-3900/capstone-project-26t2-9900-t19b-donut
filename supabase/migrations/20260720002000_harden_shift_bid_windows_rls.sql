DROP POLICY IF EXISTS "Public Access"
ON public.shift_bid_windows;

CREATE POLICY "Authenticated users can view scoped bid windows"
ON public.shift_bid_windows
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.shifts AS shift
    WHERE shift.id = shift_bid_windows.shift_id
      AND (
        public.user_has_action_in_scope(
          'shift.view',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
        OR (
          shift_bid_windows.status = 'open'
          AND shift_bid_windows.opens_at <= now()
          AND shift_bid_windows.closes_at > now()
          AND shift.bidding_status IN (
            'on_bidding',
            'on_bidding_normal',
            'on_bidding_urgent'
          )
          AND EXISTS (
            SELECT 1
            FROM public.user_contracts AS contract
            WHERE contract.user_id = (SELECT auth.uid())
              AND contract.status = 'Active'
              AND contract.organization_id = shift.organization_id
          )
        )
      )
  )
);

CREATE POLICY "Managers can create scoped bid windows"
ON public.shift_bid_windows
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.shifts AS shift
    WHERE shift.id = shift_bid_windows.shift_id
      AND (
        public.user_has_action_in_scope(
          'shift.edit',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
        OR public.user_has_action_in_scope(
          'shift.publish',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
      )
  )
);

CREATE POLICY "Managers can update scoped bid windows"
ON public.shift_bid_windows
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.shifts AS shift
    WHERE shift.id = shift_bid_windows.shift_id
      AND (
        public.user_has_action_in_scope(
          'shift.edit',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
        OR public.user_has_action_in_scope(
          'shift.assign',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
        OR public.user_has_action_in_scope(
          'shift.publish',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.shifts AS shift
    WHERE shift.id = shift_bid_windows.shift_id
      AND (
        public.user_has_action_in_scope(
          'shift.edit',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
        OR public.user_has_action_in_scope(
          'shift.assign',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
        OR public.user_has_action_in_scope(
          'shift.publish',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
      )
  )
);

CREATE POLICY "Managers can delete scoped bid windows"
ON public.shift_bid_windows
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.shifts AS shift
    WHERE shift.id = shift_bid_windows.shift_id
      AND public.user_has_action_in_scope(
        'shift.delete',
        shift.organization_id,
        shift.department_id,
        shift.sub_department_id
      )
  )
);