export type ComplianceStatus = 'passed' | 'violated' | 'warned' | 'unavailable';

export interface QualificationViolation {
  type: 'ROLE_MISMATCH' | 'LICENSE_MISSING' | 'LICENSE_EXPIRED' | 'SKILL_MISSING' | 'SKILL_EXPIRED';
  message: string;
  role_id?: string;
  license_id?: string;
  license_name?: string;
  skill_id?: string;
  skill_name?: string;
  expiration_date?: string;
}

export interface ComplianceResult {
  status: ComplianceStatus;
  violations: string[];
  warnings: string[];
  weeklyHours: number;
  maxWeeklyHours: number;
  checksPerformed: string[];
  checksSkipped: string[];
  qualificationViolations: QualificationViolation[];
}

export interface ComplianceRequest {
  employee_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  net_length_minutes: number;
  exclude_shift_id?: string | null;
  shift_id?: string | null;
  override_role_id?: string | null;
  override_skill_ids?: string[] | null;
  override_license_ids?: string[] | null;
}

export interface ShiftFacts {
  id: string;
  assigned_employee_id: string | null;
  shift_date: string;
  net_length_minutes: number | null;
  lifecycle_status: string | null;
  deleted_at: string | null;
}

export interface RpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface ComplianceDependencies {
  rpc<T>(name: string, args: Record<string, unknown>): Promise<RpcResult<T>>;
  getShiftFacts(ids: string[]): Promise<RpcResult<ShiftFacts[]>>;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MAX_WEEKLY_HOURS = 48;
const MINIMUM_REST_HOURS = 11;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function isUuidArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isUuid);
}

function isCalendarDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateBody(value: unknown): { body?: ComplianceRequest; error?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Request body must be an object' };
  const body = value as Record<string, unknown>;

  if (!isUuid(body.employee_id)) return { error: 'employee_id must be a UUID' };
  if (typeof body.shift_date !== 'string' || !isCalendarDate(body.shift_date)) return { error: 'shift_date must be a valid YYYY-MM-DD date' };
  if (typeof body.start_time !== 'string' || !TIME_RE.test(body.start_time)) return { error: 'start_time must be HH:mm or HH:mm:ss' };
  if (typeof body.end_time !== 'string' || !TIME_RE.test(body.end_time)) return { error: 'end_time must be HH:mm or HH:mm:ss' };
  if (typeof body.net_length_minutes !== 'number' || !Number.isFinite(body.net_length_minutes) || body.net_length_minutes < 0) {
    return { error: 'net_length_minutes must be a non-negative number' };
  }

  for (const key of ['exclude_shift_id', 'shift_id', 'override_role_id'] as const) {
    if (body[key] != null && !isUuid(body[key])) return { error: `${key} must be a UUID or null` };
  }
  for (const key of ['override_skill_ids', 'override_license_ids'] as const) {
    if (body[key] != null && !isUuidArray(body[key])) return { error: `${key} must be an array of UUIDs or null` };
  }

  return { body: body as unknown as ComplianceRequest };
}

function mondayFor(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

function isWithinWeek(date: string, monday: string): boolean {
  const end = new Date(`${monday}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return date >= monday && date <= end.toISOString().slice(0, 10);
}

function isCountedShift(shift: ShiftFacts, employeeId: string, weekStart: string): boolean {
  return shift.assigned_employee_id === employeeId
    && shift.lifecycle_status !== 'Cancelled'
    && shift.deleted_at == null
    && isWithinWeek(shift.shift_date, weekStart);
}

function errorMessage(check: string): string {
  return `${check} check could not be completed`;
}

function qualificationRows(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) ?? null;
  return data && typeof data === 'object' ? data as Record<string, unknown> : null;
}

function qualificationViolations(row: Record<string, unknown> | null): QualificationViolation[] {
  if (!row || !Array.isArray(row.violations)) return [];
  return row.violations.filter((item): item is QualificationViolation => {
    return Boolean(item && typeof item === 'object' && typeof item.type === 'string' && typeof item.message === 'string');
  });
}

export async function evaluateCompliance(
  body: ComplianceRequest,
  dependencies: ComplianceDependencies,
): Promise<ComplianceResult> {
  const violations: string[] = [];
  const warnings: string[] = [];
  const checksPerformed: string[] = [];
  const checksSkipped: string[] = [];
  let weeklyHours = 0;
  let structuredQualificationViolations: QualificationViolation[] = [];

  const weekStart = mondayFor(body.shift_date);
  const qualificationShiftId = body.shift_id ?? body.exclude_shift_id ?? null;

  const overlapPromise = dependencies.rpc<boolean>('check_shift_overlap', {
    p_employee_id: body.employee_id,
    p_shift_date: body.shift_date,
    p_start_time: body.start_time,
    p_end_time: body.end_time,
    p_exclude_shift_id: body.exclude_shift_id ?? null,
  });

  const weeklyPromise = (async () => {
    const ids = [...new Set([body.exclude_shift_id, body.shift_id].filter(isUuid))];
    const [weekly, shifts] = await Promise.all([
      dependencies.rpc<number | string>('calculate_weekly_hours', {
        p_employee_id: body.employee_id,
        p_week_start_date: weekStart,
      }),
      ids.length > 0
        ? dependencies.getShiftFacts(ids)
        : Promise.resolve<RpcResult<ShiftFacts[]>>({ data: [], error: null }),
    ]);
    if (weekly.error) return { error: weekly.error };
    if (shifts.error) return { error: shifts.error };

    const currentMinutes = Number(weekly.data);
    if (!Number.isFinite(currentMinutes)) return { error: { message: 'Invalid weekly minutes returned by database' } };

    const facts = shifts.data ?? [];
    const excluded = body.exclude_shift_id ? facts.find((shift) => shift.id === body.exclude_shift_id) : undefined;
    const candidate = body.shift_id ? facts.find((shift) => shift.id === body.shift_id) : undefined;

    let projectedMinutes = currentMinutes;
    if (excluded && isCountedShift(excluded, body.employee_id, weekStart)) {
      projectedMinutes -= excluded.net_length_minutes ?? 0;
    }

    const candidateAlreadyCounted = candidate
      && candidate.id !== excluded?.id
      && isCountedShift(candidate, body.employee_id, weekStart);
    if (!candidateAlreadyCounted) projectedMinutes += body.net_length_minutes;

    return { data: Math.max(0, projectedMinutes) / 60, error: null };
  })();

  const restPromise = dependencies.rpc<boolean>('validate_rest_period', {
    p_employee_id: body.employee_id,
    p_shift_date: body.shift_date,
    p_start_time: body.start_time,
    p_end_time: body.end_time,
    p_minimum_hours: MINIMUM_REST_HOURS,
  });

  const qualificationPromise = qualificationShiftId
    ? dependencies.rpc<unknown>('check_shift_compliance', {
      p_roster_shift_id: qualificationShiftId,
      p_employee_id: body.employee_id,
      p_role_id_override: body.override_role_id ?? null,
      p_skill_ids_override: body.override_skill_ids ?? null,
      p_license_ids_override: body.override_license_ids ?? null,
    })
    : Promise.resolve<RpcResult<unknown>>({ data: null, error: null });

  const [overlap, weekly, rest, qualification] = await Promise.all([
    overlapPromise,
    weeklyPromise,
    restPromise,
    qualificationPromise,
  ]);

  if (overlap.error || typeof overlap.data !== 'boolean') {
    checksSkipped.push('overlap');
    warnings.push(errorMessage('Overlap'));
  } else {
    checksPerformed.push('overlap');
    if (overlap.data) violations.push('Shift overlaps with an existing employee shift');
  }

  if (weekly.error || typeof weekly.data !== 'number') {
    checksSkipped.push('weekly_hours');
    warnings.push(errorMessage('Weekly hours'));
  } else {
    checksPerformed.push('weekly_hours');
    weeklyHours = weekly.data;
    if (weeklyHours > MAX_WEEKLY_HOURS) {
      violations.push(`Projected weekly hours (${weeklyHours.toFixed(2)}h) exceed the ${MAX_WEEKLY_HOURS}h limit`);
    }
  }

  if (rest.error || typeof rest.data !== 'boolean') {
    checksSkipped.push('rest_period');
    warnings.push(errorMessage('Rest period'));
  } else {
    checksPerformed.push('rest_period');
    if (!rest.data) violations.push(`Minimum ${MINIMUM_REST_HOURS}h rest period is not met`);
  }

  if (!qualificationShiftId) {
    checksSkipped.push('qualification');
  } else if (qualification.error) {
    checksSkipped.push('qualification');
    warnings.push(errorMessage('Qualification'));
  } else {
    const row = qualificationRows(qualification.data);
    if (!row) {
      checksSkipped.push('qualification');
      warnings.push(errorMessage('Qualification'));
    } else {
      checksPerformed.push('qualification');
      structuredQualificationViolations = qualificationViolations(row);
      violations.push(...structuredQualificationViolations.map((item) => item.message));
    }
  }

  const attemptedChecks = qualificationShiftId ? 4 : 3;
  const status: ComplianceStatus = violations.length > 0
    ? 'violated'
    : checksPerformed.length === 0 && attemptedChecks > 0
      ? 'unavailable'
      : warnings.length > 0
        ? 'warned'
        : 'passed';

  return {
    status,
    violations,
    warnings,
    weeklyHours,
    maxWeeklyHours: MAX_WEEKLY_HOURS,
    checksPerformed,
    checksSkipped,
    qualificationViolations: structuredQualificationViolations,
  };
}

export function createHandler(dependencies: ComplianceDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return json({ error: 'Request body must be valid JSON' }, 400);
    }

    const validated = validateBody(rawBody);
    if (!validated.body) return json({ error: validated.error }, 400);

    try {
      return json(await evaluateCompliance(validated.body, dependencies));
    } catch (error) {
      console.error('[evaluate-compliance] Unhandled error', error);
      return json({ error: 'Compliance engine failed unexpectedly' }, 500);
    }
  };
}
