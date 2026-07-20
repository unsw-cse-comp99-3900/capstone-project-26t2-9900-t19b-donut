-- Supervisor feedback is owned by the supervisor who submitted it.
-- The existing INSERT policy already enforces the same ownership rule
-- and is intentionally left unchanged.

DROP POLICY IF EXISTS "authenticated_read_supervisor_feedback"
ON public.supervisor_feedback;

CREATE POLICY "authenticated_read_supervisor_feedback"
ON public.supervisor_feedback
FOR SELECT
TO authenticated
USING (
  supervisor_id = (SELECT auth.uid())
);