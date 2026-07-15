-- R3: Harden employee_skills RLS policies.
--
-- Previous policies allowed every authenticated user to read, create,
-- update, and delete every employee's skill records.
--
-- Rules:
--   - employees can access only their own skill records;
--   - existing managers/admins retain management access through is_admin().

ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view employee skills" ON public.employee_skills;
DROP POLICY IF EXISTS "Authenticated users can manage employee skills" ON public.employee_skills;
DROP POLICY IF EXISTS "Authenticated users can update employee skills" ON public.employee_skills;
DROP POLICY IF EXISTS "Authenticated users can delete employee skills" ON public.employee_skills;

CREATE POLICY "Authenticated users can view employee skills"
ON public.employee_skills
FOR SELECT
TO authenticated
USING (
  employee_id = (SELECT auth.uid())
  OR public.is_manager_or_above()
  OR public.is_admin()
);


CREATE POLICY "Authenticated users can manage employee skills"
ON public.employee_skills
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = (SELECT auth.uid())
  OR public.is_admin()
);


CREATE POLICY "Authenticated users can update employee skills"
ON public.employee_skills
FOR UPDATE
TO authenticated
USING (
  employee_id = (SELECT auth.uid())
  OR public.is_admin()
)
WITH CHECK (
  employee_id = (SELECT auth.uid())
  OR public.is_admin()
);


CREATE POLICY "Authenticated users can delete employee skills"
ON public.employee_skills
FOR DELETE
TO authenticated
USING (
  employee_id = (SELECT auth.uid())
  OR public.is_admin()
);


COMMENT ON POLICY "Authenticated users can view employee skills" ON public.employee_skills
IS 'R3: authenticated employees can view only their own skills; admins retain management visibility.';

COMMENT ON POLICY "Authenticated users can manage employee skills" ON public.employee_skills
IS 'R3: authenticated employees can create skills only for themselves; admins retain management access.';

COMMENT ON POLICY "Authenticated users can update employee skills" ON public.employee_skills
IS 'R3: authenticated employees can update only their own skills and cannot transfer ownership; admins retain management access.';

COMMENT ON POLICY "Authenticated users can delete employee skills" ON public.employee_skills
IS 'R3: authenticated employees can delete only their own skills; admins retain management access.';