-- Leave balances contain employee-specific sensitive data.
-- Direct reads are restricted to the employee who owns the row.

DROP POLICY IF EXISTS
  "Public read for employee_leave_balances"
  ON public.employee_leave_balances;

CREATE POLICY
  "Public read for employee_leave_balances"
  ON public.employee_leave_balances
  FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
  );