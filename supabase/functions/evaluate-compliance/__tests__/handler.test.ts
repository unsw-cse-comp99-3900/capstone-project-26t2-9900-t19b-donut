import { describe, expect, it, vi } from 'vitest';
import {
  createHandler,
  evaluateCompliance,
  type ComplianceDependencies,
  type RpcResult,
  type ShiftFacts,
} from '../handler.ts';

const EMPLOYEE_ID = '11111111-1111-4111-8111-111111111111';
const SHIFT_ID = '22222222-2222-4222-8222-222222222222';

function request(overrides: Record<string, unknown> = {}) {
  return {
    employee_id: EMPLOYEE_ID,
    shift_date: '2026-07-22',
    start_time: '09:00',
    end_time: '17:00',
    net_length_minutes: 480,
    shift_id: SHIFT_ID,
    ...overrides,
  };
}

function dependencies(overrides: Partial<ComplianceDependencies> = {}): ComplianceDependencies {
  return {
    rpc: vi.fn(async (name: string): Promise<RpcResult<unknown>> => {
      if (name === 'check_shift_overlap') return { data: false, error: null };
      if (name === 'calculate_weekly_hours') return { data: 1_920, error: null };
      if (name === 'validate_rest_period') return { data: true, error: null };
      if (name === 'check_shift_compliance') {
        return { data: [{ is_compliant: true, compliance_status: 'compliant', violations: [] }], error: null };
      }
      return { data: null, error: { message: `Unexpected RPC ${name}` } };
    }) as ComplianceDependencies['rpc'],
    getShiftFacts: vi.fn(async (): Promise<RpcResult<ShiftFacts[]>> => ({ data: [], error: null })),
    ...overrides,
  };
}

describe('evaluateCompliance', () => {
  it('passes and converts stored weekly minutes to projected hours', async () => {
    const result = await evaluateCompliance(request(), dependencies());

    expect(result.status).toBe('passed');
    expect(result.weeklyHours).toBe(40);
    expect(result.checksPerformed).toEqual(['overlap', 'weekly_hours', 'rest_period', 'qualification']);
    expect(result.violations).toEqual([]);
  });

  it('replaces an existing excluded shift instead of double-counting it', async () => {
    const deps = dependencies({
      getShiftFacts: vi.fn(async () => ({
        data: [{
          id: SHIFT_ID,
          assigned_employee_id: EMPLOYEE_ID,
          shift_date: '2026-07-22',
          net_length_minutes: 480,
          lifecycle_status: 'Draft',
          deleted_at: null,
        }],
        error: null,
      })),
    });

    const result = await evaluateCompliance(request({ shift_id: null, exclude_shift_id: SHIFT_ID }), deps);

    expect(result.weeklyHours).toBe(32);
    expect(result.status).toBe('passed');
    expect(deps.rpc).toHaveBeenCalledWith('check_shift_compliance', expect.objectContaining({
      p_roster_shift_id: SHIFT_ID,
    }));
  });

  it('uses Monday as the weekly boundary and explicitly requests an 11-hour rest gap', async () => {
    const deps = dependencies();

    await evaluateCompliance(request(), deps);

    expect(deps.rpc).toHaveBeenCalledWith('calculate_weekly_hours', expect.objectContaining({
      p_week_start_date: '2026-07-20',
    }));
    expect(deps.rpc).toHaveBeenCalledWith('validate_rest_period', expect.objectContaining({
      p_minimum_hours: 11,
    }));
  });

  it('blocks overlap, excessive weekly hours, insufficient rest, and qualifications', async () => {
    const deps = dependencies({
      rpc: vi.fn(async (name: string): Promise<RpcResult<unknown>> => {
        if (name === 'check_shift_overlap') return { data: true, error: null };
        if (name === 'calculate_weekly_hours') return { data: 2_640, error: null };
        if (name === 'validate_rest_period') return { data: false, error: null };
        return {
          data: [{
            is_compliant: false,
            compliance_status: 'violated',
            violations: [{ type: 'LICENSE_MISSING', message: 'First Aid license is required' }],
          }],
          error: null,
        };
      }) as ComplianceDependencies['rpc'],
    });

    const result = await evaluateCompliance(request(), deps);

    expect(result.status).toBe('violated');
    expect(result.weeklyHours).toBe(52);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.stringContaining('overlaps'),
      expect.stringContaining('48h limit'),
      expect.stringContaining('11h rest'),
      'First Aid license is required',
    ]));
    expect(result.qualificationViolations[0].type).toBe('LICENSE_MISSING');
  });

  it('warns when one RPC fails but preserves successful checks', async () => {
    const deps = dependencies({
      rpc: vi.fn(async (name: string): Promise<RpcResult<unknown>> => {
        if (name === 'check_shift_overlap') return { data: null, error: { message: 'timeout' } };
        if (name === 'calculate_weekly_hours') return { data: 1_200, error: null };
        if (name === 'validate_rest_period') return { data: true, error: null };
        return { data: [{ is_compliant: true, violations: [] }], error: null };
      }) as ComplianceDependencies['rpc'],
    });

    const result = await evaluateCompliance(request(), deps);

    expect(result.status).toBe('warned');
    expect(result.checksSkipped).toContain('overlap');
    expect(result.checksPerformed).toEqual(['weekly_hours', 'rest_period', 'qualification']);
  });

  it('returns unavailable when every attempted check fails', async () => {
    const deps = dependencies({
      rpc: vi.fn(async (): Promise<RpcResult<unknown>> => ({ data: null, error: { message: 'offline' } })) as ComplianceDependencies['rpc'],
    });

    const result = await evaluateCompliance(request(), deps);

    expect(result.status).toBe('unavailable');
    expect(result.checksPerformed).toEqual([]);
    expect(result.checksSkipped).toEqual(['overlap', 'weekly_hours', 'rest_period', 'qualification']);
  });
});

describe('HTTP handler', () => {
  it('answers CORS preflight without calling the database', async () => {
    const deps = dependencies();
    const response = await createHandler(deps)(new Request('http://localhost', { method: 'OPTIONS' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS');
    expect(deps.rpc).not.toHaveBeenCalled();
  });

  it('rejects malformed input with a CORS-enabled 400 response', async () => {
    const response = await createHandler(dependencies())(new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request({ employee_id: 'not-a-uuid' })),
    }));

    expect(response.status).toBe(400);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    await expect(response.json()).resolves.toEqual({ error: 'employee_id must be a UUID' });
  });

  it('rejects impossible calendar dates', async () => {
    const response = await createHandler(dependencies())(new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request({ shift_date: '2026-02-31' })),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'shift_date must be a valid YYYY-MM-DD date' });
  });
});
