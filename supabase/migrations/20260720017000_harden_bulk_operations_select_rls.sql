-- Bulk operations are owned by the authenticated actor who created them.
-- Existing INSERT and UPDATE ownership policies remain unchanged.

DROP POLICY IF EXISTS "Users can view bulk operations"
ON public.bulk_operations;

CREATE POLICY "Users can view bulk operations"
ON public.bulk_operations
FOR SELECT
TO authenticated
USING (
  actor_id = (SELECT auth.uid())
);