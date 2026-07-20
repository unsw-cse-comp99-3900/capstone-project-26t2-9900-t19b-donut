-- leave_requests has no organization, department, sub-department,
-- or contract reference from which manager scope can be derived.
-- Restrict direct reads to the employee who owns the request.

DROP POLICY IF EXISTS "Public read for leave_requests"
ON public.leave_requests;

CREATE POLICY "Public read for leave_requests"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
  employee_id = (SELECT auth.uid())
);