import { describe, expect, it, vi } from 'vitest';
import {
  evaluateCompliance,
  getWeekStart,
  validateRequestBody,
  type ComplianceRequest,
  type RpcInvoker,
} from '../../../../../supabase/functions/evaluate-compliance/logic';
import { complianceFailureReason } from '../compliance.service';

const employeeId = '10000000-0000-4000-8000-000000000001';
const shiftId = '20000000-0000-4000-8000-000000000002';

const input: ComplianceRequest = {
  employee_id: employeeId,
  shift_date: '2026-07-22',
  start_time: '09:00',
  end_time: '17:00',
  net_length_minutes: 480,
  exclude_shift_id: shiftId,
  shift_id: shiftId,
};

function successfulRpc(overrides: Record<string, unknown> = {}): RpcInvoker {
  return vi.fn(async (functionName) => ({
    data: overrides[functionName] ?? {
      check_shift_overlap: false,
      calculate_weekly_hours: 1_920,
      validate_rest_period: true,
      check_shift_compliance: [{
        is_compliant: true,
        compliance_status: 'compliant',
        violations: [],
        eligibility_snapshot: null,
      }],
    }[functionName],
    error: null,
  }));
}

describe('evaluate-compliance Edge Function logic', () => {
  it('runs all four checks and returns a passed result', async () => {
    const rpc = successfulRpc();
    const result = await evaluateCompliance(input, rpc);

    expect(result.status).toBe('passed');
    expect(result.weeklyHours).toBe(40);
    expect(result.checksPerformed).toEqual([
      'overlap',
      'weekly_hours',
      'rest_period',
      'qualification',
    ]);
    expect(result.violations).toEqual([]);
    expect(rpc).toHaveBeenCalledWith('check_shift_overlap', expect.objectContaining({
      p_exclude_shift_id: shiftId,
    }));
    expect(rpc).toHaveBeenCalledWith('check_shift_compliance', expect.objectContaining({
      p_roster_shift_id: shiftId,
      p_employee_id: employeeId,
    }));
  });

  it('collects hard violations from every authoritative check', async () => {
    const rpc = successfulRpc({
      check_shift_overlap: true,
      calculate_weekly_hours: 2_700,
      validate_rest_period: false,
      check_shift_compliance: [{
        is_compliant: false,
        compliance_status: 'non_compliant',
        violations: [{ type: 'ROLE_MISMATCH', message: 'Employee role does not match' }],
        eligibility_snapshot: null,
      }],
    });

    const result = await evaluateCompliance(input, rpc);

    expect(result.status).toBe('violated');
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.stringContaining('overlaps'),
      expect.stringContaining('weekly hours limit'),
      expect.stringContaining('11 hours'),
      'Employee role does not match',
    ]));
    expect(result.qualificationViolations).toHaveLength(1);
  });

  it('fails closed as unavailable when every executable check fails', async () => {
    const rpc: RpcInvoker = vi.fn(async () => ({
      data: null,
      error: { message: 'database unavailable' },
    }));

    const result = await evaluateCompliance({ ...input, shift_id: null }, rpc);

    expect(result.status).toBe('unavailable');
    expect(result.violations).toEqual([]);
    expect(result.warnings).toHaveLength(3);
    expect(result.checksSkipped).toEqual([
      'overlap',
      'weekly_hours',
      'rest_period',
      'qualification',
    ]);
  });

  it('returns warned when only part of the engine is unavailable', async () => {
    const rpc = successfulRpc();
    const partialRpc: RpcInvoker = vi.fn(async (functionName, args) => {
      if (functionName === 'calculate_weekly_hours') {
        return { data: null, error: { message: 'weekly RPC offline' } };
      }
      return rpc(functionName, args);
    });

    const result = await evaluateCompliance(input, partialRpc);

    expect(result.status).toBe('warned');
    expect(result.checksSkipped).toEqual(['weekly_hours']);
    expect(result.warnings).toContain('Weekly hours check unavailable — weekly RPC offline');
  });

  it('validates request shape and computes Monday without timezone drift', () => {
    expect(validateRequestBody(input)).toBe(true);
    expect(validateRequestBody({ ...input, employee_id: 'not-a-uuid' })).toBe(false);
    expect(validateRequestBody({ ...input, start_time: '25:00' })).toBe(false);
    expect(validateRequestBody({ ...input, shift_date: '2026-02-30' })).toBe(false);
    expect(validateRequestBody({ ...input, override_skill_ids: 'not-an-array' })).toBe(false);
    expect(getWeekStart('2026-07-22')).toBe('2026-07-20');
    expect(getWeekStart('2026-07-26')).toBe('2026-07-20');
  });

  it('preserves an unavailable engine warning as the user-facing failure reason', () => {
    expect(complianceFailureReason({
      status: 'unavailable',
      violations: [],
      warnings: ['Compliance engine unreachable — checks could not be performed'],
    })).toBe('Compliance engine unreachable — checks could not be performed');
  });
});
