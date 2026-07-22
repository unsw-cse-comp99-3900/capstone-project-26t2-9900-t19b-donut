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

export interface RpcResponse {
  data: unknown;
  error: { message: string } | null;
}

export type RpcInvoker = (
  functionName: string,
  args: Record<string, unknown>,
) => Promise<RpcResponse>;

type CheckResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

interface QualificationRpcResult {
  is_compliant: boolean;
  compliance_status: string;
  violations: QualificationViolation[];
  eligibility_snapshot: Record<string, unknown> | null;
}

const MAX_WEEKLY_HOURS = 48;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isUuidArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isUuid);
}

export function validateRequestBody(value: unknown): value is ComplianceRequest {
  if (!value || typeof value !== 'object') return false;
  const input = value as Partial<ComplianceRequest>;

  return isUuid(input.employee_id)
    && isIsoDate(input.shift_date)
    && typeof input.start_time === 'string'
    && TIME_RE.test(input.start_time)
    && typeof input.end_time === 'string'
    && TIME_RE.test(input.end_time)
    && typeof input.net_length_minutes === 'number'
    && Number.isFinite(input.net_length_minutes)
    && input.net_length_minutes >= 0
    && (input.exclude_shift_id == null || isUuid(input.exclude_shift_id))
    && (input.shift_id == null || isUuid(input.shift_id))
    && (input.override_role_id == null || isUuid(input.override_role_id))
    && (input.override_skill_ids == null || isUuidArray(input.override_skill_ids))
    && (input.override_license_ids == null || isUuidArray(input.override_license_ids));
}

export function getWeekStart(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

async function invokeBoolean(
  rpc: RpcInvoker,
  functionName: string,
  args: Record<string, unknown>,
): Promise<CheckResult<boolean>> {
  try {
    const { data, error } = await rpc(functionName, args);
    if (error) return { ok: false, error: error.message };
    if (typeof data !== 'boolean') {
      return { ok: false, error: `${functionName} returned unexpected data` };
    }
    return { ok: true, value: data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function invokeWeeklyHours(
  rpc: RpcInvoker,
  input: ComplianceRequest,
): Promise<CheckResult<number>> {
  try {
    const { data, error } = await rpc('calculate_weekly_hours', {
      p_employee_id: input.employee_id,
      p_week_start_date: getWeekStart(input.shift_date),
    });
    if (error) return { ok: false, error: error.message };

    const minutes = typeof data === 'number' ? data : Number(data);
    if (!Number.isFinite(minutes)) {
      return { ok: false, error: 'calculate_weekly_hours returned unexpected data' };
    }
    return { ok: true, value: minutes };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function invokeQualification(
  rpc: RpcInvoker,
  input: ComplianceRequest,
): Promise<CheckResult<QualificationRpcResult> | null> {
  if (!input.shift_id || !isUuid(input.shift_id)) return null;

  try {
    const { data, error } = await rpc('check_shift_compliance', {
      p_roster_shift_id: input.shift_id,
      p_employee_id: input.employee_id,
      p_role_id_override: input.override_role_id ?? null,
      p_skill_ids_override: input.override_skill_ids ?? null,
      p_license_ids_override: input.override_license_ids ?? null,
    });
    if (error) return { ok: false, error: error.message };

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== 'object' || typeof (row as { is_compliant?: unknown }).is_compliant !== 'boolean') {
      return { ok: false, error: 'check_shift_compliance returned unexpected data' };
    }

    const raw = row as Partial<QualificationRpcResult>;
    const violations = Array.isArray(raw.violations)
      ? raw.violations.filter(
          (violation): violation is QualificationViolation =>
            !!violation
            && typeof violation === 'object'
            && typeof (violation as QualificationViolation).message === 'string',
        )
      : [];

    return {
      ok: true,
      value: {
        is_compliant: raw.is_compliant!,
        compliance_status: typeof raw.compliance_status === 'string' ? raw.compliance_status : '',
        violations,
        eligibility_snapshot:
          raw.eligibility_snapshot && typeof raw.eligibility_snapshot === 'object'
            ? raw.eligibility_snapshot
            : null,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function evaluateCompliance(
  input: ComplianceRequest,
  rpc: RpcInvoker,
): Promise<ComplianceResult> {
  const overlapArgs: Record<string, unknown> = {
    p_employee_id: input.employee_id,
    p_shift_date: input.shift_date,
    p_start_time: input.start_time,
    p_end_time: input.end_time,
  };
  if (input.exclude_shift_id) overlapArgs.p_exclude_shift_id = input.exclude_shift_id;

  const [overlapResult, weeklyResult, restResult, qualificationResult] = await Promise.all([
    invokeBoolean(rpc, 'check_shift_overlap', overlapArgs),
    invokeWeeklyHours(rpc, input),
    invokeBoolean(rpc, 'validate_rest_period', {
      p_employee_id: input.employee_id,
      p_shift_date: input.shift_date,
      p_start_time: input.start_time,
      p_end_time: input.end_time,
      p_minimum_hours: 11,
    }),
    invokeQualification(rpc, input),
  ]);

  const violations: string[] = [];
  const warnings: string[] = [];
  const checksPerformed: string[] = [];
  const checksSkipped: string[] = [];
  const qualificationViolations: QualificationViolation[] = [];
  let weeklyHours = 0;

  if (overlapResult.ok) {
    checksPerformed.push('overlap');
    if (overlapResult.value) {
      violations.push('This shift overlaps with an existing shift for the employee');
    }
  } else {
    checksSkipped.push('overlap');
    warnings.push(`Overlap check unavailable — ${overlapResult.error}`);
  }

  if (weeklyResult.ok) {
    checksPerformed.push('weekly_hours');
    weeklyHours = weeklyResult.value / 60 + input.net_length_minutes / 60;
    if (weeklyHours > MAX_WEEKLY_HOURS) {
      violations.push(
        `Shift would exceed the weekly hours limit (${weeklyHours.toFixed(1)}h / ${MAX_WEEKLY_HOURS}h)`,
      );
    } else if (weeklyHours > MAX_WEEKLY_HOURS * 0.9) {
      warnings.push(
        `Employee is approaching the weekly hours limit (${weeklyHours.toFixed(1)}h / ${MAX_WEEKLY_HOURS}h)`,
      );
    }
  } else {
    checksSkipped.push('weekly_hours');
    warnings.push(`Weekly hours check unavailable — ${weeklyResult.error}`);
  }

  if (restResult.ok) {
    checksPerformed.push('rest_period');
    if (!restResult.value) {
      violations.push('Minimum rest period of 11 hours between consecutive shifts is not met');
    }
  } else {
    checksSkipped.push('rest_period');
    warnings.push(`Rest period check unavailable — ${restResult.error}`);
  }

  if (qualificationResult === null) {
    checksSkipped.push('qualification');
  } else if (qualificationResult.ok) {
    checksPerformed.push('qualification');
    if (!qualificationResult.value.is_compliant) {
      qualificationViolations.push(...qualificationResult.value.violations);
      violations.push(...qualificationResult.value.violations.map((violation) => violation.message));
    }
  } else {
    checksSkipped.push('qualification');
    warnings.push(`Qualification check unavailable — ${qualificationResult.error}`);
  }

  let status: ComplianceStatus;
  if (violations.length > 0) status = 'violated';
  else if (checksSkipped.length === 4) status = 'unavailable';
  else if (warnings.length > 0) status = 'warned';
  else status = 'passed';

  return {
    status,
    violations,
    warnings,
    weeklyHours,
    maxWeeklyHours: MAX_WEEKLY_HOURS,
    checksPerformed,
    checksSkipped,
    qualificationViolations,
  };
}
