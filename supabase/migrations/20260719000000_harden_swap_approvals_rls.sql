-- R3: Harden swap_approvals RLS.
--
-- Rules:
--   - approvals inherit visibility from their parent swap_request;
--   - only an in-scope manager may create an approval;
--   - approver_id must identify the authenticated caller.

ALTER TABLE public.swap_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view approvals"
ON public.swap_approvals;

DROP POLICY IF EXISTS "Managers can create approvals"
ON public.swap_approvals;

CREATE POLICY "Authenticated users can view approvals"
ON public.swap_approvals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.swap_requests AS request
    WHERE request.id = swap_approvals.swap_request_id
  )
);

CREATE POLICY "Managers can create approvals"
ON public.swap_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  approver_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.swap_requests AS request
    WHERE request.id = swap_approvals.swap_request_id
      AND EXISTS (
        SELECT 1
        FROM public.shifts AS shift
        WHERE shift.id IN (
          request.original_shift_id,
          request.offered_shift_id
        )
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
);

COMMENT ON POLICY "Authenticated users can view approvals"
ON public.swap_approvals IS
  'R3: approval visibility is inherited from the parent swap_request RLS policy.';

COMMENT ON POLICY "Managers can create approvals"
ON public.swap_approvals IS
  'R3: only the authenticated in-scope shift manager may record a swap approval.';