import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shiftsCommands } from '../shifts.commands';
import { supabase } from '@/platform/supabase/client';
import { complianceService } from '../../services/compliance.service';
import { shiftsQueries } from '../shifts.queries';

// Mock dependencies
vi.mock('@/platform/supabase/client', () => {
    const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ id: 'mock-id' }], error: null }),
    };

    return {
        supabase: {
            rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
            from: vi.fn(() => mockQueryBuilder)
        }
    };
});

vi.mock('@/platform/supabase/rpc/client', () => ({
    callRpc: vi.fn().mockResolvedValue('mock-shift-id'),
    callAuthenticatedRpc: vi.fn().mockResolvedValue({ success: true, success_count: 1 }),
    callAuthenticatedVoidRpc: vi.fn().mockResolvedValue(undefined),
    requireUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
}));

vi.mock('../../services/compliance.service', () => ({
    complianceService: {
        validateShiftCompliance: vi.fn().mockResolvedValue({ isValid: true, violations: [] })
    }
}));

vi.mock('../shifts.queries', () => ({
    shiftsQueries: {
        getShiftById: vi.fn().mockResolvedValue({ id: 'mock-shift-id', assigned_employee_id: 'emp-1' })
    }
}));

vi.mock('../domain/bulk-action-engine', () => ({
    processInChunks: vi.fn(async (items, processor) => {
        return Promise.all(items.map(async (item: any) => {
            try {
                const res = await processor(item);
                return { ok: true, id: item, result: res };
            } catch (err) {
                return { ok: false, id: item, error: err };
            }
        }));
    })
}));

const VALID_UUID = '12345678-1234-1234-1234-123456789012';

describe('shiftsCommands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('moveShift should move shift successfully', async () => {
        const res = await shiftsCommands.moveShift(VALID_UUID, { shiftDate: '2026-01-01' });
        expect(res.success).toBe(true);
    });

    it('createShift should create shift successfully', async () => {
        const res = await shiftsCommands.createShift({
            roster_id: VALID_UUID,
            department_id: VALID_UUID,
            shift_date: '2026-01-01',
            start_time: '09:00',
            end_time: '17:00'
        });
        expect(res.id).toBe('mock-shift-id');
    });

    it('createShift should throw compliance error', async () => {
        vi.mocked(complianceService.validateShiftCompliance).mockResolvedValueOnce({ isValid: false, violations: ['rule'] });
        
        await expect(shiftsCommands.createShift({
            roster_id: VALID_UUID,
            department_id: VALID_UUID,
            shift_date: '2026-01-01',
            start_time: '09:00',
            end_time: '17:00',
            assigned_employee_id: VALID_UUID
        })).rejects.toThrow();
    });

    it('updateShift should update shift successfully', async () => {
        const res = await shiftsCommands.updateShift(VALID_UUID, { start_time: '10:00' });
        expect(res.id).toBe('mock-shift-id');
    });

    it('bulkAssignShifts should handle empty array', async () => {
        const res = await shiftsCommands.bulkAssignShifts(VALID_UUID, []);
        expect(res.success).toBe(true);
    });

    it('bulkAssignShiftsAtomic should handle empty array', async () => {
        const res = await shiftsCommands.bulkAssignShiftsAtomic([]);
        expect(res.success).toBe(true);
    });

    it('bulkUnassignShifts should handle empty array', async () => {
        const res = await shiftsCommands.bulkUnassignShifts([]);
        expect(res).toEqual([]);
    });

    it('publishShift should publish successfully', async () => {
        const res = await shiftsCommands.publishShift(VALID_UUID);
        expect(res.success).toBe(true);
    });

    it('bulkPublishShifts should handle valid shifts', async () => {
        vi.mocked(shiftsQueries.getShiftById).mockResolvedValueOnce({ id: VALID_UUID, assigned_employee_id: null });
        const res = await shiftsCommands.bulkPublishShifts([VALID_UUID]);
        expect(res.publishedIds).toContain(VALID_UUID);
    });

    it('bulkUnpublishShifts should handle empty array', async () => {
        const res = await shiftsCommands.bulkUnpublishShifts([]);
        expect(res.unpublishedIds).toEqual([]);
    });

    it('bulkUnpublishShifts should handle valid shifts', async () => {
        const res = await shiftsCommands.bulkUnpublishShifts([VALID_UUID]);
        expect(res.unpublishedIds).toContain(VALID_UUID);
    });

    it('deleteShift should delete successfully', async () => {
        const res = await shiftsCommands.deleteShift(VALID_UUID);
        expect(res).toBe(true);
    });

    it('bulkDeleteShifts should return success count', async () => {
        const res = await shiftsCommands.bulkDeleteShifts([VALID_UUID]);
        expect(res).toBe(1);
    });

    it('bulkDeleteShiftsPerItem should return deletedIds', async () => {
        const res = await shiftsCommands.bulkDeleteShiftsPerItem([VALID_UUID]);
        expect(res.deletedIds).toContain(VALID_UUID);
    });

    it('checkIn should call rpc', async () => {
        await expect(shiftsCommands.checkIn(VALID_UUID)).resolves.not.toThrow();
    });

    it('withdrawShiftFromBidding should withdraw successfully', async () => {
        const res = await shiftsCommands.withdrawShiftFromBidding(VALID_UUID);
        expect(res.success).toBe(true);
    });

    it('cancelShift should cancel successfully', async () => {
        const res = await shiftsCommands.cancelShift(VALID_UUID, 'reason');
        expect(res.success).toBe(true);
    });

    it('validateBulkPublishCompliance should check compliance', async () => {
        const res = await shiftsCommands.validateBulkPublishCompliance([{
            id: VALID_UUID,
            lifecycle_status: 'Draft',
            assigned_employee_id: VALID_UUID,
            start_time: '09:00',
            end_time: '17:00'
        } as any]);
        expect(res.eligible).toContain(VALID_UUID);
    });
});
