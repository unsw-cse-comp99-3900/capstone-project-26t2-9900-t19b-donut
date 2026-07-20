import React from 'react';
import { CalendarDays, ChevronRight, Clock3, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Shift } from '@/modules/rosters';
import { cn } from '@/modules/core/lib/utils';
import ShiftDetailsDialog from './ShiftDetailsDialog';

interface ShiftWithDetails {
  shift: Shift;
  groupName: string;
  groupColor: string;
  subGroupName: string;
}

interface AccessibleRosterListProps {
  shifts: Shift[];
  isOffline: boolean;
}

const groupLabel = (shift: Shift) => shift.departments?.name
  || shift.roster_subgroup?.roster_group?.name
  || (shift.group_type === 'convention_centre' ? 'Convention Centre'
    : shift.group_type === 'exhibition_centre' ? 'Exhibition Centre'
      : shift.group_type === 'theatre' ? 'Theatre' : 'General');

const toDetails = (shift: Shift): ShiftWithDetails => ({
  shift,
  groupName: groupLabel(shift),
  groupColor: shift.group_type || 'default',
  subGroupName: shift.sub_departments?.name || shift.sub_group_name || '',
});

const AccessibleRosterList: React.FC<AccessibleRosterListProps> = ({ shifts, isOffline }) => {
  const [selectedShift, setSelectedShift] = React.useState<ShiftWithDetails | null>(null);
  const visibleShifts = React.useMemo(() => [...shifts]
    .filter((shift) => !(shift.lifecycle_status === 'Published'
      && shift.assignment_status === 'assigned'
      && !shift.assignment_outcome))
    .sort((a, b) => `${a.shift_date}T${a.start_time}`.localeCompare(`${b.shift_date}T${b.start_time}`)), [shifts]);

  const groups = React.useMemo(() => {
    const result = new Map<string, Shift[]>();
    visibleShifts.forEach((shift) => result.set(shift.shift_date, [...(result.get(shift.shift_date) || []), shift]));
    return [...result.entries()];
  }, [visibleShifts]);

  if (groups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center" role="status">
        <CalendarDays className="mb-4 h-12 w-12 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-bold text-foreground">No shifts this month</h2>
        <p className="mt-2 text-base text-muted-foreground">Your assigned shifts will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-y-auto px-4 pb-28 pt-3" aria-label="Roster shifts">
        <p className="mb-4 text-base text-muted-foreground" role="status">
          {visibleShifts.length} {visibleShifts.length === 1 ? 'shift' : 'shifts'} scheduled
        </p>
        <div className="space-y-6">
          {groups.map(([date, dateShifts]) => (
            <section key={date} aria-labelledby={`roster-date-${date}`}>
              <h2 id={`roster-date-${date}`} className="mb-3 text-lg font-extrabold text-foreground">
                {format(parseISO(date), 'EEEE, d MMMM')}
              </h2>
              <div className="space-y-3">
                {dateShifts.map((shift) => {
                  const role = shift.roles?.name || 'Shift';
                  const place = [groupLabel(shift), shift.sub_departments?.name || shift.sub_group_name]
                    .filter(Boolean).join(', ');
                  const status = shift.lifecycle_status;
                  const label = `${role}, ${format(parseISO(date), 'EEEE d MMMM')}, ${shift.start_time.slice(0, 5)} to ${shift.end_time.slice(0, 5)}, ${place}, status ${status}`;

                  return (
                    <button
                      key={shift.id}
                      type="button"
                      aria-label={`${label}. View details`}
                      onClick={() => setSelectedShift(toDetails(shift))}
                      className="min-h-[132px] w-full rounded-2xl border-2 border-border bg-card p-4 text-left shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xl font-extrabold text-foreground">{role}</span>
                            <span className={cn(
                              'rounded-full border px-2.5 py-1 text-sm font-bold',
                              status === 'Published'
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                : 'border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
                            )}>
                              {status}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-lg font-bold text-foreground">
                            <Clock3 className="h-5 w-5 shrink-0" aria-hidden="true" />
                            <span>{shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}</span>
                          </div>
                          <div className="mt-2 flex items-start gap-2 text-base text-muted-foreground">
                            <MapPin className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                            <span>{place || 'Location not provided'}</span>
                          </div>
                        </div>
                        <ChevronRight className="mt-1 h-6 w-6 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <ShiftDetailsDialog
        isOpen={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        shiftData={selectedShift}
        shiftDate={selectedShift ? parseISO(selectedShift.shift.shift_date) : new Date()}
        isOffline={isOffline}
      />
    </>
  );
};

export default AccessibleRosterList;
