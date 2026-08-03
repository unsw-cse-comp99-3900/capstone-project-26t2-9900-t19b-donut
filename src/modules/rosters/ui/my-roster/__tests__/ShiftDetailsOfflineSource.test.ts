import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('shift details offline handling', () => {
  it('keeps shift details read-only when My Roster is offline', () => {
    const dialogSource = readSource('src/modules/rosters/ui/my-roster/ShiftDetailsDialog.tsx');

    expect(dialogSource).toContain('isOffline?: boolean');
    expect(dialogSource).toContain('Offline - showing saved shift details');
    expect(dialogSource).toContain('Reconnect to swap or drop this shift.');
    expect(dialogSource).toContain('const isLockedFromActions = isOffline ||');
    expect(dialogSource).toContain('if (isOffline) {');
    expect(dialogSource).toContain('offlineActionToast');
  });

  it('passes the My Roster offline state into every roster detail entry point', () => {
    const pageSource = readSource('src/modules/rosters/pages/MyRosterPage.tsx');
    const calendarSource = readSource('src/modules/rosters/ui/my-roster/MyRosterCalendar.tsx');
    const daySource = readSource('src/modules/rosters/ui/my-roster/DayView.tsx');
    const threeDaySource = readSource('src/modules/rosters/ui/my-roster/ThreeDayView.tsx');
    const weekSource = readSource('src/modules/rosters/ui/my-roster/WeekView.tsx');
    const monthSource = readSource('src/modules/rosters/ui/my-roster/MonthView.tsx');

    expect(pageSource).toContain('offlineState, isOffline, dataUpdatedAt, getShiftsForDate');
    expect(pageSource).toContain('isOffline={isOffline}');
    expect(calendarSource).toContain('isOffline: boolean');

    for (const source of [calendarSource, daySource, threeDaySource, weekSource, monthSource]) {
      expect(source).toContain('isOffline={isOffline}');
    }
  });
});
