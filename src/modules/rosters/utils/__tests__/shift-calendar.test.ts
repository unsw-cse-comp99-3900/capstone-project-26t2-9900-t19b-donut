import { describe, expect, it } from 'vitest';
import type { Shift } from '@/modules/rosters/domain/shift.entity';
import { buildShiftCalendarFile } from '../shift-calendar';

const createShift = (overrides: Partial<Shift> = {}) => ({
  id: '7972e4cc-5857-4bc7-98c1-17d7564dbf44',
  shift_date: '2026-08-03',
  start_time: '09:00:00',
  end_time: '17:00:00',
  start_at: null,
  end_at: null,
  timezone: 'Australia/Sydney',
  tz_identifier: 'Australia/Sydney',
  is_overnight: false,
  is_cancelled: false,
  lifecycle_status: 'Published',
  version: 3,
  roles: { id: 'role-1', name: 'Team Member' },
  departments: { id: 'dept-1', name: 'Event Operations' },
  sub_departments: { id: 'subdept-1', name: 'Convention Services' },
  ...overrides,
} as Shift);

describe('buildShiftCalendarFile', () => {
  it('creates an importable UTC calendar event with a stable shift UID', () => {
    const result = buildShiftCalendarFile({
      shift: createShift(),
      shareUrl: 'https://shiftopia.example/shifts/7972e4cc-5857-4bc7-98c1-17d7564dbf44',
      groupName: 'Convention',
      now: new Date('2026-07-28T01:02:03Z'),
    });

    expect(result.filename).toBe('shiftopia-2026-08-03-team-member.ics');
    expect(result.content).toContain('UID:shift-7972e4cc-5857-4bc7-98c1-17d7564dbf44@shiftopia.app');
    expect(result.content).toContain('DTSTAMP:20260728T010203Z');
    expect(result.content).toContain('DTSTART:20260802T230000Z');
    expect(result.content).toContain('DTEND:20260803T070000Z');
    expect(result.content).toContain('SUMMARY:Shiftopia - Team Member');
    expect(result.content).toContain('SEQUENCE:3');
    expect(result.content).toContain('STATUS:CONFIRMED');
    expect(result.content.endsWith('\r\n')).toBe(true);
  });

  it('moves an overnight end time to the next calendar day', () => {
    const result = buildShiftCalendarFile({
      shift: createShift({ start_time: '22:30', end_time: '06:15', is_overnight: true }),
      shareUrl: 'https://shiftopia.example/shifts/overnight',
      now: new Date('2026-07-28T00:00:00Z'),
    });

    expect(result.content).toContain('DTSTART:20260803T123000Z');
    expect(result.content).toContain('DTEND:20260803T201500Z');
  });

  it('prefers canonical UTC timestamps and marks cancelled shifts', () => {
    const result = buildShiftCalendarFile({
      shift: createShift({
        start_at: '2026-08-03T01:15:00Z',
        end_at: '2026-08-03T09:45:00Z',
        lifecycle_status: 'Cancelled',
        is_cancelled: true,
      }),
      shareUrl: 'https://shiftopia.example/shifts/cancelled',
      now: new Date('2026-07-28T00:00:00Z'),
    });

    expect(result.content).toContain('DTSTART:20260803T011500Z');
    expect(result.content).toContain('DTEND:20260803T094500Z');
    expect(result.content).toContain('STATUS:CANCELLED');
  });

  it('escapes calendar text and folds every physical line to 75 UTF-8 bytes', () => {
    const result = buildShiftCalendarFile({
      shift: createShift({
        roles: { id: 'role-1', name: 'Lead, Events; Night \\ Shift 团队团队团队团队团队团队团队团队团队团队' },
      }),
      shareUrl: 'https://shiftopia.example/shifts/special',
      groupName: 'Convention, Hall; A',
      now: new Date('2026-07-28T00:00:00Z'),
    });

    expect(result.content).toContain('Lead\\, Events\\; Night \\\\ Shift');
    for (const line of result.content.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});

