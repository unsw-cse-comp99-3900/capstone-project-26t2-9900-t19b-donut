import React from 'react';
import { CalendarDays } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/modules/core/ui/primitives/button';
import { useShiftDetail } from '@/modules/rosters/state/useRosterShifts';
import ShiftDetailsDialog from '@/modules/rosters/ui/my-roster/ShiftDetailsDialog';
import type { Shift } from '@/modules/rosters';
import { PageState } from '@/modules/core/ui/components/PageState';

const getGroupMeta = (shift: Shift) => {
  if (shift.group_type === 'convention_centre') {
    return { groupName: 'Convention', groupColor: 'convention' };
  }
  if (shift.group_type === 'exhibition_centre') {
    return { groupName: 'Exhibition', groupColor: 'exhibition' };
  }
  if (shift.group_type === 'theatre') {
    return { groupName: 'Theatre', groupColor: 'theatre' };
  }
  return { groupName: 'General', groupColor: 'default' };
};

const ShiftDeepLinkPage: React.FC = () => {
  const { shiftId } = useParams<{ shiftId: string }>();
  const navigate = useNavigate();
  const { data: shift, isLoading, error } = useShiftDetail(shiftId ?? null);

  const goToRoster = () => navigate('/my-roster', { replace: true });

  if (isLoading) {
    return <PageState isLoading loadingMsg="Opening shift..." className="min-h-[60vh]" />;
  }

  if (error || !shift) {
    return (
      <PageState
        isError
        errorTitle="Shift link unavailable"
        errorMsg="This shift could not be opened. It may have been removed, or your account may not have access to it."
        onRetry={goToRoster}
        retryLabel="Go to My Roster"
        className="min-h-[60vh]"
      />
    );
  }

  const groupMeta = getGroupMeta(shift);
  const shiftData = {
    shift,
    ...groupMeta,
    subGroupName: shift.sub_group_name || '',
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CalendarDays className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Opening shift</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The shared shift details are open in the dialog.
        </p>
      </div>
      <ShiftDetailsDialog
        isOpen
        onClose={goToRoster}
        shiftData={shiftData}
        shiftDate={new Date(shift.shift_date)}
      />
    </div>
  );
};

export default ShiftDeepLinkPage;
