import { parseZonedDateTime, SYDNEY_TZ } from '@/modules/core/lib/date.utils';
import type { Shift } from '@/modules/rosters/domain/shift.entity';

const PRODUCT_ID = '-//Shiftopia//Shift Calendar//EN';

export interface ShiftCalendarOptions {
  shift: Shift;
  shareUrl: string;
  groupName?: string;
  subGroupName?: string;
  now?: Date;
}

export interface ShiftCalendarFile {
  content: string;
  filename: string;
}

const escapeIcsText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');

const formatUtc = (date: Date) => {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Cannot create a calendar event from an invalid shift time.');
  }

  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
};

const addCalendarDay = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
};

const validTimestamp = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveShiftTimes = (shift: Shift) => {
  const timezone = shift.tz_identifier || shift.timezone || SYDNEY_TZ;
  const storedStart = validTimestamp(shift.start_at);
  const storedEnd = validTimestamp(shift.end_at);
  const start = storedStart ?? parseZonedDateTime(shift.shift_date, shift.start_time, timezone);

  let end: Date;
  if (storedEnd) {
    end = storedEnd;
  } else {
    const sameDayEnd = parseZonedDateTime(shift.shift_date, shift.end_time, timezone);
    const crossesMidnight = shift.is_overnight || sameDayEnd.getTime() <= start.getTime();
    end = crossesMidnight
      ? parseZonedDateTime(addCalendarDay(shift.shift_date), shift.end_time, timezone)
      : sameDayEnd;
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    throw new Error('The shift end time must be after its start time.');
  }

  return { start, end };
};

/** RFC 5545 content lines are limited to 75 UTF-8 octets, including folds. */
const foldLine = (line: string) => {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let chunk = '';
  let byteLength = 0;

  for (const character of line) {
    const characterBytes = encoder.encode(character).length;
    const limit = chunks.length === 0 ? 75 : 74;

    if (chunk && byteLength + characterBytes > limit) {
      chunks.push(chunk);
      chunk = character;
      byteLength = characterBytes;
    } else {
      chunk += character;
      byteLength += characterBytes;
    }
  }

  if (chunk || chunks.length === 0) chunks.push(chunk);
  return chunks.join('\r\n ');
};

export const buildShiftCalendarFile = ({
  shift,
  shareUrl,
  groupName,
  subGroupName,
  now = new Date(),
}: ShiftCalendarOptions): ShiftCalendarFile => {
  const { start, end } = resolveShiftTimes(shift);
  const roleName = shift.roles?.name || 'Shift';
  const departmentName = shift.departments?.name;
  const teamName = shift.sub_departments?.name || subGroupName;
  const location = [groupName, teamName].filter(Boolean).join(' - ');
  const description = [
    departmentName ? `Department: ${departmentName}` : null,
    teamName ? `Team: ${teamName}` : null,
    `Open in Shiftopia: ${shareUrl}`,
  ].filter((value): value is string => Boolean(value)).join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODUCT_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:shift-${shift.id}@shiftopia.app`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeIcsText(`Shiftopia - ${roleName}`)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    ...(location ? [`LOCATION:${escapeIcsText(location)}`] : []),
    `URL:${escapeIcsText(shareUrl)}`,
    `SEQUENCE:${Math.max(0, shift.version || 0)}`,
    `STATUS:${shift.is_cancelled || shift.lifecycle_status === 'Cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const safeRole = roleName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'shift';

  return {
    content: `${lines.map(foldLine).join('\r\n')}\r\n`,
    filename: `shiftopia-${shift.shift_date}-${safeRole}.ics`,
  };
};

