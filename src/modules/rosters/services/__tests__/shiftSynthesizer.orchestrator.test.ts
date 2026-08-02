import { describe, it, expect, vi, beforeEach } from 'vitest';
import { synthesizeAndInsertShifts, rollbackSynthesisRun } from '../shiftSynthesizer.orchestrator';
import { shiftsCommands } from '../../api/shifts.commands';
import { synthesisRunsQueries } from '../../api/synthesisRuns.queries';
import { supabase } from '@/platform/supabase/client';
import * as shiftSynthesizerService from '../shiftSynthesizer.service';

vi.mock('../../api/shifts.commands', () => ({
    shiftsCommands: {
        bulkDeleteShifts: vi.fn().mockResolvedValue(1),
        createShift: vi.fn().mockResolvedValue({ id: 'new-shift-1' })
    }
}));

vi.mock('../../api/synthesisRuns.queries', () => ({
    synthesisRunsQueries: {
        rollbackRun: vi.fn().mockResolvedValue({ deletedCount: 1, skippedAssigned: 0, failedDeletes: [], orphaned: false })
    }
}));

vi.mock('@/platform/supabase/client', () => {
    const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'group-1' }, error: null })
    };
    return {
        supabase: {
            from: vi.fn(() => mockQueryBuilder)
        }
    };
});

vi.mock('../shiftSynthesizer.service', () => ({
    synthesizeShifts: vi.fn().mockReturnValue([{
        roleId: 'role-1',
        startMinutes: 540,
        endMinutes: 600,
        subDepartmentId: 'sub-1',
        buildingType: 'convention_centre',
        headcount: 2
    }]),
    getCoverageWindow: vi.fn().mockReturnValue({ start: 540, end: 600 })
}));

vi.mock('../../api/workRules.queries', () => ({
    fetchSupervisoryRatios: vi.fn().mockResolvedValue([]),
    fetchMinimumStaffRules: vi.fn().mockResolvedValue([])
}));

vi.mock('../domain/bulk-action-engine', () => ({
    processInChunks: vi.fn(async (items, fn) => {
        const results = [];
        for (let i = 0; i < items.length; i++) {
            results.push({ id: items[i], ok: true, value: await fn(i) });
        }
        return results;
    })
}));

describe('shiftSynthesizer.orchestrator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('synthesizeAndInsertShifts', () => {
        it('should synthesize shifts, insert them and return created count', async () => {
            const params = {
                rosterId: 'roster-1',
                departmentId: 'dept-1',
                shiftDate: '2026-01-01',
                demandTensors: [
                    {
                        roleId: 'role-1',
                        subDepartmentId: 'sub-1',
                        buildingType: 'convention_centre',
                        demandSource: 'ml_predicted' as any,
                        slots: []
                    }
                ],
                enableTemplateBuilder: false
            };

            const result = await synthesizeAndInsertShifts(params);
            
            expect(shiftSynthesizerService.synthesizeShifts).toHaveBeenCalled();
            // 2 headcount => 2 shift payloads created
            expect(result.createdCount).toBe(2);
            expect(shiftsCommands.createShift).toHaveBeenCalledTimes(2);
        });

        it('should handle suggestedDeletions', async () => {
            const params = {
                rosterId: 'roster-1',
                departmentId: 'dept-1',
                shiftDate: '2026-01-01',
                demandTensors: [],
                suggestedDeletions: ['shift-to-delete'],
                enableTemplateBuilder: false
            };

            const result = await synthesizeAndInsertShifts(params);
            
            expect(shiftsCommands.bulkDeleteShifts).toHaveBeenCalledWith(['shift-to-delete']);
            expect(result.deletedCount).toBe(1);
        });

        it('should process demandTensorRows correctly', async () => {
            // Because mapRowsToTensors is tested inside the function and hits supabase
            // we mocked supabase.from('function_map') and 'roles' to return empty
            // so it returns empty mapped tensors, thus 0 created.
            const params = {
                rosterId: 'roster-1',
                departmentId: 'dept-1',
                shiftDate: '2026-01-01',
                demandTensorRows: [
                    { event_id: 'ev-1', function_code: 'F&B', level: 1, slice_idx: 0, headcount: 1 } as any
                ],
                enableTemplateBuilder: false
            };

            const result = await synthesizeAndInsertShifts(params);
            
            // with empty mappings it will generate no shifts
            expect(result.createdCount).toBe(0);
        });
    });

    describe('rollbackSynthesisRun', () => {
        it('should delegate to synthesisRunsQueries.rollbackRun', async () => {
            const res = await rollbackSynthesisRun('run-123');
            expect(synthesisRunsQueries.rollbackRun).toHaveBeenCalledWith('run-123');
            expect(res.deletedCount).toBe(1);
        });
    });
});
