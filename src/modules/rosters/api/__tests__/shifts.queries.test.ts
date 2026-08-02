import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shiftsQueries } from '../shifts.queries';
import { supabase } from '@/platform/supabase/client';

// Mock supabase client
vi.mock('@/platform/supabase/client', () => {
    const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn((resolve) => resolve({ data: [], error: null }))
    };

    return {
        supabase: {
            from: vi.fn(() => mockQueryBuilder)
        }
    };
});

vi.mock('../../services/eligibility.service', () => ({
    EligibilityService: {
        getEligibleEmployees: vi.fn().mockResolvedValue([{ id: 'emp-1' }])
    }
}));

// Provide a valid UUID for tests that require one
const VALID_UUID = '12345678-1234-1234-1234-123456789012';

describe('shiftsQueries', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockQueryBuilder = supabase.from('shifts');
    });

    it('getShiftById should return null on error', async () => {
        mockQueryBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: new Error('test error') });
        const result = await shiftsQueries.getShiftById(VALID_UUID);
        expect(result).toBeNull();
    });

    it('getShiftById should return formatted shift on success', async () => {
        mockQueryBuilder.maybeSingle.mockResolvedValueOnce({ data: { id: VALID_UUID, timesheets: [] }, error: null });
        const result = await shiftsQueries.getShiftById(VALID_UUID);
        expect(result?.id).toBe(VALID_UUID);
    });

    it('getShiftsForDate should handle invalid uuid', async () => {
        const result = await shiftsQueries.getShiftsForDate('invalid-uuid', '2026-01-01');
        expect(result).toEqual([]);
    });

    it('getShiftsForDate should call supabase and paginate', async () => {
        mockQueryBuilder.range.mockResolvedValueOnce({ data: [{ id: VALID_UUID, timesheets: [{ status: 'approved' }] }], error: null });
        const result = await shiftsQueries.getShiftsForDate(VALID_UUID, '2026-01-01', {
            departmentId: VALID_UUID,
            groupType: 'Standard',
            status: 'Draft'
        });
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(VALID_UUID);
        expect(result[0].timesheet_status).toBe('approved');
    });

    it('getShiftsForDateRange should paginate and return data', async () => {
        mockQueryBuilder.range.mockResolvedValueOnce({ data: [{ id: VALID_UUID }], error: null });
        const result = await shiftsQueries.getShiftsForDateRange(VALID_UUID, '2026-01-01', '2026-01-07', {
            departmentIds: [VALID_UUID],
            subDepartmentId: VALID_UUID
        });
        expect(result.length).toBe(1);
    });

    it('getShiftsForDateRange should handle pagination errors gracefully', async () => {
        mockQueryBuilder.range.mockResolvedValueOnce({ data: null, error: new Error('pag error') });
        const result = await shiftsQueries.getShiftsForDateRange(VALID_UUID, '2026-01-01', '2026-01-07');
        expect(result).toEqual([]);
    });

    it('getEmployeeShifts should return employee shifts', async () => {
        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: VALID_UUID }], error: null }));
        const result = await shiftsQueries.getEmployeeShifts(VALID_UUID, '2026-01-01', '2026-01-07');
        expect(result.length).toBe(1);
    });

    it('getEmployeeShiftsForAttendance should return shifts', async () => {
        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: VALID_UUID }], error: null }));
        const result = await shiftsQueries.getEmployeeShiftsForAttendance(VALID_UUID, '2026-01-01', '2026-01-07');
        expect(result.length).toBe(1);
    });

    it('getOrganizations should return orgs', async () => {
        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: VALID_UUID, name: 'Org' }], error: null }));
        const result = await shiftsQueries.getOrganizations();
        expect(result.length).toBe(1);
    });

    it('getDepartments should return depts', async () => {
        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: VALID_UUID }], error: null }));
        const result = await shiftsQueries.getDepartments(VALID_UUID);
        expect(result.length).toBe(1);
    });

    it('getSubDepartments should return sub depts', async () => {
        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: VALID_UUID }], error: null }));
        const result = await shiftsQueries.getSubDepartments(VALID_UUID);
        expect(result.length).toBe(1);
    });

    it('getRoles should fetch roles successfully', async () => {
        // mock multiple promise.all for subdept
        const m = mockQueryBuilder;
        m.then = vi.fn()
          .mockImplementationOnce((cb: any) => cb({ data: [{ id: 'role-1', name: 'Role A' }], error: null }))
          .mockImplementationOnce((cb: any) => cb({ data: [{ id: 'role-2', name: 'Role B' }], error: null }));
        
        const result = await shiftsQueries.getRoles(VALID_UUID, VALID_UUID, VALID_UUID);
        expect(result.length).toBe(2);
    });

    it('getTemplates should return templates', async () => {
        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: VALID_UUID }], error: null }));
        const result = await shiftsQueries.getTemplates(VALID_UUID, VALID_UUID);
        expect(result.length).toBe(1);
    });

    it('getRemunerationLevels should return levels', async () => {
        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: VALID_UUID }], error: null }));
        const result = await shiftsQueries.getRemunerationLevels();
        expect(result.length).toBe(1);
    });

    it('getEmployees should return employees via EligibilityService', async () => {
        const result = await shiftsQueries.getEmployees();
        expect(result.length).toBe(1);
    });

    it('getSkills should return skills', async () => {
        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: VALID_UUID }], error: null }));
        const result = await shiftsQueries.getSkills();
        expect(result.length).toBe(1);
    });

    it('getLicenses should return licenses', async () => {
        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: VALID_UUID }], error: null }));
        const result = await shiftsQueries.getLicenses();
        expect(result.length).toBe(1);
    });

    it('getEvents should return events', async () => {
        mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: VALID_UUID }], error: null }));
        const result = await shiftsQueries.getEvents(VALID_UUID);
        expect(result.length).toBe(1);
    });

});
