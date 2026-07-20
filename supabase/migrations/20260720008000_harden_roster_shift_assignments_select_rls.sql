-- roster_shift_assignments has no reliable organization, department,
-- or sub-department scope relationship.
-- Restrict direct reads to the employee who owns the assignment.
-- Existing INSERT, UPDATE, and DELETE policies are intentionally unchanged.

DROP POLICY IF EXISTS "roster_assignments_select"
ON public.roster_shift_assignments;

CREATE POLICY "roster_assignments_select"
ON public.roster_shift_assignments
FOR SELECT
TO authenticated
USING (
  employee_id = (SELECT auth.uid())
);