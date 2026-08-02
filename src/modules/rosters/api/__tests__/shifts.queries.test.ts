import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shiftsQueries } from '../shifts.queries';
import { supabase } from '@/platform/supabase/client';
import * as rpcClient from '@/platform/supabase/rpc/client';

class MockQueryBuilder {
    _data: any = null;
    _error: any = null;

    select = vi.fn().mockReturnThis();
    eq = vi.fn().mockReturnThis();
    in = vi.fn().mockReturnThis();
    neq = vi.fn().mockReturnThis();
    is = vi.fn().mockReturnThis();
    order = vi.fn().mockReturnThis();
    limit = vi.fn().mockReturnThis();
    gte = vi.fn().mockReturnThis();
    lte = vi.fn().mockReturnThis();
    range = vi.fn().mockReturnThis();
    or = vi.fn().mockReturnThis();
    not = vi.fn().mockReturnThis();
    single = vi.fn().mockImplementation(() => Promise.resolve({ data: this._data, error: this._error }));
    maybeSingle = vi.fn().mockImplementation(() => Promise.resolve({ data: this._data, error: this._error }));

    then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
        return Promise.resolve({ data: this._data, error: this._error }).then(onfulfilled, onrejected);
    }
}

let builderQueue: MockQueryBuilder[] = [];

vi.mock('@/platform/supabase/client', () => ({
    supabase: {
        rpc: vi.fn(),
        from: vi.fn(() => {
            if (builderQueue.length > 0) {
                return builderQueue.shift();
            }
            return new MockQueryBuilder();
        })
    }
}));

vi.mock('@/platform/supabase/rpc/client', () => ({
    callAuthenticatedRpc: vi.fn()
}));

describe('shiftsQueries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        builderQueue = [];
    });

    describe('getShiftById', () => {
        it('should return shift if found', async () => {
            const b = new MockQueryBuilder();
            b._data = { id: '22222222-2222-2222-2222-222222222222', start_time: '10:00' };
            builderQueue.push(b);

            const result = await shiftsQueries.getShiftById('22222222-2222-2222-2222-222222222222');
            
            expect(result).toMatchObject({ id: '22222222-2222-2222-2222-222222222222', start_time: '10:00' });
            expect(b.select).toHaveBeenCalled();
            expect(b.eq).toHaveBeenCalledWith('id', '22222222-2222-2222-2222-222222222222');
            expect(b.maybeSingle).toHaveBeenCalled();
        });

        it('should return null if error occurs', async () => {
            const b = new MockQueryBuilder();
            b._data = null;
            b._error = { message: 'Not found' };
            builderQueue.push(b);

            const result = await shiftsQueries.getShiftById('22222222-2222-2222-2222-222222222222');
            
            expect(result).toBeNull();
        });
    });

    describe('getShiftsForDateRange', () => {
        it('should fetch shifts with pagination', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = Array.from({ length: 1000 }, (_, i) => ({ id: `s${i}` }));
            builderQueue.push(b1);

            const b2 = new MockQueryBuilder();
            b2._data = Array.from({ length: 5 }, (_, i) => ({ id: `s${i + 1000}` }));
            builderQueue.push(b2);

            const result = await shiftsQueries.getShiftsForDateRange('33333333-3333-3333-3333-333333333333', '2026-01-01', '2026-01-07');
            
            expect(result.length).toBe(1005);
            expect(b1.range).toHaveBeenCalledWith(0, 999);
            expect(b2.range).toHaveBeenCalledWith(1000, 1999);
        });

        it('should return empty array if error occurs on first page', async () => {
            const b = new MockQueryBuilder();
            b._error = { message: 'Failed to fetch' };
            builderQueue.push(b);

            const result = await shiftsQueries.getShiftsForDateRange('33333333-3333-3333-3333-333333333333', '2026-01-01', '2026-01-07');
            expect(result.length).toBe(0);
        });
    });

    describe('getOrganizations', () => {
        it('should fetch and return organizations', async () => {
            const b = new MockQueryBuilder();
            b._data = [{ id: 'org1', name: 'Org 1' }];
            builderQueue.push(b);

            const result = await shiftsQueries.getOrganizations();
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('org1');
            expect(b.select).toHaveBeenCalledWith('id, name');
        });
    });

    describe('getDepartments', () => {
        it('should fetch and return departments filtered by organizationId', async () => {
            const b = new MockQueryBuilder();
            b._data = [{ id: '22222222-2222-2222-2222-222222222222', name: 'Dep 1' }];
            builderQueue.push(b);

            const result = await shiftsQueries.getDepartments('11111111-1111-1111-1111-111111111111');
            expect(result).toHaveLength(1);
            expect(b.eq).toHaveBeenCalledWith('organization_id', '11111111-1111-1111-1111-111111111111');
        });
    });

    describe('getSubDepartments', () => {
        it('should fetch and return sub-departments', async () => {
            const b = new MockQueryBuilder();
            b._data = [{ id: '33333333-3333-3333-3333-333333333333', name: 'Sub 1' }];
            builderQueue.push(b);

            const result = await shiftsQueries.getSubDepartments('22222222-2222-2222-2222-222222222222');
            expect(result).toHaveLength(1);
            expect(b.eq).toHaveBeenCalledWith('department_id', '22222222-2222-2222-2222-222222222222');
        });
    });

    describe('getTemplates', () => {
        it('should fetch and return templates', async () => {
            const b = new MockQueryBuilder();
            b._data = [{ id: '44444444-4444-4444-4444-444444444444', name: 'Template 1' }];
            builderQueue.push(b);

            const result = await shiftsQueries.getTemplates('33333333-3333-3333-3333-333333333333');
            expect(result).toHaveLength(1);
            expect(b.eq).toHaveBeenCalledWith('sub_department_id', '33333333-3333-3333-3333-333333333333');
        });
    });

    describe('getRemunerationLevels', () => {
        it('should fetch and return remuneration levels', async () => {
            const b = new MockQueryBuilder();
            b._data = [{ id: '55555555-5555-5555-5555-555555555555', level_name: 'Level 1' }];
            builderQueue.push(b);

            const result = await shiftsQueries.getRemunerationLevels();
            expect(result).toHaveLength(1);
            expect(b.select).toHaveBeenCalled();
        });
    });

    describe('getSkills', () => {
        it('should fetch and return skills', async () => {
            const b = new MockQueryBuilder();
            b._data = [{ id: '66666666-6666-6666-6666-666666666666', name: 'Skill 1' }];
            builderQueue.push(b);

            const result = await shiftsQueries.getSkills();
            expect(result).toHaveLength(1);
            expect(b.select).toHaveBeenCalled();
        });
    });

    describe('getLicenses', () => {
        it('should fetch and return licenses', async () => {
            const b = new MockQueryBuilder();
            b._data = [{ id: '77777777-7777-7777-7777-777777777777', name: 'License 1' }];
            builderQueue.push(b);

            const result = await shiftsQueries.getLicenses();
            expect(result).toHaveLength(1);
            expect(b.select).toHaveBeenCalled();
        });
    });

    describe('getEmployeeShifts', () => {
        it('should fetch shifts for an employee', async () => {
            const b = new MockQueryBuilder();
            b._data = [{ id: '22222222-2222-2222-2222-222222222222' }];
            builderQueue.push(b);

            const result = await shiftsQueries.getEmployeeShifts('55555555-5555-5555-5555-555555555555', '2026-01-01', '2026-01-07', '33333333-3333-3333-3333-333333333333');
            
            expect(result.length).toBe(1);
            expect(b.eq).toHaveBeenCalledWith('assigned_employee_id', '55555555-5555-5555-5555-555555555555');
        });
    });

    describe('getRoles', () => {
        it('should fetch roles with appropriate filters', async () => {
            const b1 = new MockQueryBuilder(); // the initial query object that is discarded
            builderQueue.push(b1);
            
            const b2 = new MockQueryBuilder(); // explicitSubDept
            b2._data = [{ id: '44444444-4444-4444-4444-444444444444', name: 'Role 1' }];
            builderQueue.push(b2);
            
            const b3 = new MockQueryBuilder(); // parentDeptAndGlobal
            b3._data = [];
            builderQueue.push(b3);

            const result = await shiftsQueries.getRoles('33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777');
            
            expect(result.length).toBe(1);
            expect(b2.eq).toHaveBeenCalledWith('sub_department_id', '77777777-7777-7777-7777-777777777777');
        });
    });

    describe('getPendingOfferCount', () => {
        it('should return count from Supabase', async () => {
            const b = new MockQueryBuilder();
            (b as any).count = 5;
            b.then = function(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
                return Promise.resolve({ data: this._data, error: this._error, count: (this as any).count }).then(onfulfilled, onrejected);
            };
            builderQueue.push(b);

            const result = await shiftsQueries.getPendingOfferCount('55555555-5555-5555-5555-555555555555');
            
            expect(result).toBe(5);
            expect(b.eq).toHaveBeenCalledWith('assigned_employee_id', '55555555-5555-5555-5555-555555555555');
        });
    });

    describe('getTimecardMultipliers', () => {
        it('should fetch multipliers and parse correctly', async () => {
            const b = new MockQueryBuilder();
            b._data = [
                { role_id: 'r1', scheduled_length_minutes: 400, actual_net_minutes: 480 },
                { role_id: 'r1', scheduled_length_minutes: 200, actual_net_minutes: 240 },
                { role_id: 'r2', scheduled_length_minutes: 600, actual_net_minutes: 600 }
            ];
            builderQueue.push(b);

            const result = await shiftsQueries.getTimecardMultipliers('33333333-3333-3333-3333-333333333333');
            
            expect(result.get('r1')).toBe(1.2); // (480 + 240) / (400 + 200) = 720 / 600 = 1.2
            expect(result.get('r2')).toBe(1.0); // 600 / 600 = 1.0
        });
    });

    describe('getShiftDelta', () => {
        it('should fetch shifted items since last sync via RPC', async () => {
            (supabase.rpc as any).mockResolvedValueOnce({
                data: [{ id: '22222222-2222-2222-2222-222222222222' }],
                error: null
            });

            const result = await shiftsQueries.getShiftDelta({ 
                orgId: '33333333-3333-3333-3333-333333333333', 
                since: '2026-01-01T00:00:00Z' 
            });
            
            expect(result).toMatchObject([{ id: '22222222-2222-2222-2222-222222222222' }]);
            expect(supabase.rpc).toHaveBeenCalledWith('get_shift_delta', expect.any(Object));
        });
    });
});
