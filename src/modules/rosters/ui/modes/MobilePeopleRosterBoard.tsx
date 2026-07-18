import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Clock, UserRound } from 'lucide-react';
import type { Shift } from '@/modules/rosters/domain/shift.entity';

interface MobileRosterEmployee {
  id: string;
  first_name: string;
  last_name: string;
  department_name?: string;
  sub_department_name?: string;
}

interface MobilePeopleRosterBoardProps {
  employees: MobileRosterEmployee[];
  shifts: Shift[];
  dates: Date[];
  onViewShift?: (shift: Shift) => void;
}

/**
 * Native/mobile roster board.
 *
 * The desktop people grid depends on a Web Worker projection, react-virtual,
 * sticky grid columns and HTML5 DnD. WKWebView is unreliable when combining
 * those primitives inside nested overflow containers, so mobile renders a
 * direct card projection from the already-loaded employees and shifts.
 */
export const MobilePeopleRosterBoard: React.FC<MobilePeopleRosterBoardProps> = ({
  employees,
  shifts,
  dates,
  onViewShift,
}) => {
  const visibleDates = useMemo(
    () => new Set(dates.map((date) => format(date, 'yyyy-MM-dd'))),
    [dates],
  );

  const shiftsByEmployee = useMemo(() => {
    const result = new Map<string, Shift[]>();
    shifts.forEach((shift) => {
      if (!shift.assigned_employee_id || !visibleDates.has(shift.shift_date)) return;
      const current = result.get(shift.assigned_employee_id) || [];
      current.push(shift);
      result.set(shift.assigned_employee_id, current);
    });
    result.forEach((items) => items.sort((a, b) =>
      `${a.shift_date}-${a.start_time}`.localeCompare(`${b.shift_date}-${b.start_time}`)
    ));
    return result;
  }, [shifts, visibleDates]);

  return (
    <div className="h-full overflow-y-auto px-3 pb-28 pt-2 scrollbar-none">
      <div className="space-y-3">
        {employees.map((employee) => {
          const employeeShifts = shiftsByEmployee.get(employee.id) || [];
          const name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee';

          return (
            <section
              key={employee.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-foreground">{name}</h3>
                  <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {[employee.department_name, employee.sub_department_name].filter(Boolean).join(' · ') || 'Team member'}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
                  {employeeShifts.length} {employeeShifts.length === 1 ? 'shift' : 'shifts'}
                </span>
              </div>

              <div className="p-3">
                {employeeShifts.length > 0 ? (
                  <div className="space-y-2">
                    {employeeShifts.map((shift) => (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => onViewShift?.(shift)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left active:scale-[0.99]"
                      >
                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <span className="text-[9px] font-black uppercase">{format(new Date(`${shift.shift_date}T12:00:00`), 'EEE')}</span>
                          <span className="text-sm font-black leading-none">{format(new Date(`${shift.shift_date}T12:00:00`), 'd')}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black uppercase text-foreground">
                            {shift.roles?.name || shift.sub_group_name || 'Shift'}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase text-primary">
                          {shift.lifecycle_status}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-5 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-xs font-bold">No shifts in this period</span>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

