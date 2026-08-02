import { describe, it, expect, vi } from 'vitest';
import * as autoApi from '../autoschedule.api';
import { supabase } from '@/platform/supabase/client';

vi.mock('@/platform/supabase/client', () => ({
    supabase: {
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            returns: vi.fn().mockResolvedValue({ data: [], error: null })
        })
    }
}));

describe('autoschedule.api', () => {
    it('exports correctly', () => {
        expect(typeof autoApi.fetchBaseline).toBe('function');
        expect(typeof autoApi.runSimulation).toBe('function');
        expect(typeof autoApi.saveAsDraft).toBe('function');
        expect(typeof autoApi.commitAssignments).toBe('function');
    });

    it('SnapshotConflictError works', () => {
        const error = new autoApi.SnapshotConflictError();
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Roster changed');
    });

    it('fetchBaseline mock call', async () => {
        const res = await autoApi.fetchBaseline({ organizationId: '1', departmentId: '1', subDepartmentId: '2', dateStart: '2026-01-01', dateEnd: '2026-01-07' } as any);
        expect(res).toBeDefined();
    });
});
