DROP POLICY IF EXISTS "Enable insert for all users"
ON public.shift_offers;

CREATE POLICY "Enable insert for all users"
ON public.shift_offers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.shifts AS shift
    WHERE shift.id = shift_offers.shift_id
      AND shift.assigned_employee_id = shift_offers.employee_id
      AND (
        public.user_has_action_in_scope(
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

DROP POLICY IF EXISTS "Enable read access for all users"
ON public.shift_offers;

CREATE POLICY "Enable read access for all users"
ON public.shift_offers
FOR SELECT
TO authenticated
USING (
  employee_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.shifts AS shift
    WHERE shift.id = shift_offers.shift_id
      AND public.user_has_action_in_scope(
        'shift.view',
        shift.organization_id,
        shift.department_id,
        shift.sub_department_id
      )
  )
);

DROP POLICY IF EXISTS "Enable update for all users"
ON public.shift_offers;

CREATE POLICY "Enable update for all users"
ON public.shift_offers
FOR UPDATE
TO authenticated
USING (
  (
    employee_id = (SELECT auth.uid())
    AND status = 'Pending'
    AND EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      WHERE shift.id = shift_offers.shift_id
        AND shift.assigned_employee_id = (SELECT auth.uid())
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.shifts AS shift
    WHERE shift.id = shift_offers.shift_id
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
      )
  )
)
WITH CHECK (
  (
    employee_id = (SELECT auth.uid())
    AND status IN ('Accepted', 'Declined')
    AND EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      WHERE shift.id = shift_offers.shift_id
        AND shift.assigned_employee_id = (SELECT auth.uid())
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.shifts AS shift
    WHERE shift.id = shift_offers.shift_id
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
      )
  )
);