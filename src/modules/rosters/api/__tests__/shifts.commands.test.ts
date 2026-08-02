import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shiftsCommands } from '../shifts.commands';
import { supabase } from '@/platform/supabase/client';
import { complianceService } from '../../services/compliance.service';
import * as rpcClient from '@/platform/supabase/rpc/client';
import { shiftsQueries } from '../shifts.queries';

// A mock builder that is thenable
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
    insert = vi.fn().mockReturnThis();
    update = vi.fn().mockReturnThis();
    gte = vi.fn().mockReturnThis();
    lte = vi.fn().mockReturnThis();

    single = vi.fn().mockImplementation(() => Promise.resolve({ data: this._data, error: this._error }));
    maybeSingle = vi.fn().mockImplementation(() => Promise.resolve({ data: this._data, error: this._error }));

    then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
        return Promise.resolve({ data: this._data, error: this._error }).then(onfulfilled, onrejected);
    }
    catch(onrejected?: (reason: any) => any): Promise<any> {
        return Promise.resolve({ data: this._data, error: this._error }).catch(onrejected);
    }
    finally(onfinally?: () => void): Promise<any> {
        return Promise.resolve({ data: this._data, error: this._error }).finally(onfinally);
    }

    mockResultOnce(data: any, error: any = null) {
        this._data = data;
        this._error = error;
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

vi.mock('../../services/compliance.service', () => ({
    complianceService: {
        validateShiftCompliance: vi.fn()
    }
}));

vi.mock('../shifts.queries', () => ({
    shiftsQueries: {
        getShiftById: vi.fn()
    }
}));

vi.mock('@/platform/supabase/rpc/client', () => ({
    callRpc: vi.fn(),
    callAuthenticatedRpc: vi.fn(),
    callAuthenticatedVoidRpc: vi.fn(),
    requireUser: vi.fn().mockResolvedValue({ id: '11111111-1111-1111-1111-111111111111' })
}));

describe('shiftsCommands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        builderQueue = [];
        
        // Setup global default mock for callAuthenticatedRpc
        (rpcClient.callAuthenticatedRpc as any).mockResolvedValue({ success: true });
    });

    describe('moveShift', () => {
        it('should move shift successfully', async () => {
            (supabase.rpc as any).mockResolvedValueOnce({ data: { success: true }, error: null });
            
            const result = await shiftsCommands.moveShift('22222222-2222-2222-2222-222222222222', { groupType: 'Group', shiftDate: '2026-01-01' });
            
            expect(result.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledWith('sm_move_shift', expect.any(Object));
        });

        it('should throw if RPC fails', async () => {
            (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: { message: 'Failed' } });
            
            await expect(shiftsCommands.moveShift('22222222-2222-2222-2222-222222222222', {})).rejects.toThrow('Failed');
        });
    });

    describe('createShift', () => {
        it('should validate compliance and create shift via RPC', async () => {
            (complianceService.validateShiftCompliance as any).mockResolvedValueOnce({ isValid: true, violations: [] });
            (rpcClient.callRpc as any).mockResolvedValueOnce('22222222-2222-2222-2222-222222222222');
            (shiftsQueries.getShiftById as any).mockResolvedValueOnce({ id: '22222222-2222-2222-2222-222222222222' });

            const result = await shiftsCommands.createShift({
                roster_id: '33333333-3333-3333-3333-333333333333',
                department_id: '44444444-4444-4444-4444-444444444444',
                shift_date: '2026-01-01',
                start_time: '09:00',
                end_time: '17:00',
                assigned_employee_id: '55555555-5555-5555-5555-555555555555'
            });

            expect(result.id).toBe('22222222-2222-2222-2222-222222222222');
            expect(complianceService.validateShiftCompliance).toHaveBeenCalled();
            expect(rpcClient.callRpc).toHaveBeenCalledWith('sm_create_shift', expect.any(Object), expect.any(Object));
        });

        it('should throw compliance error if validation fails', async () => {
            (complianceService.validateShiftCompliance as any).mockResolvedValueOnce({ isValid: false, violations: [{ summary: 'Too many hours' }] });

            await expect(shiftsCommands.createShift({
                roster_id: '33333333-3333-3333-3333-333333333333',
                department_id: '44444444-4444-4444-4444-444444444444',
                shift_date: '2026-01-01',
                start_time: '09:00',
                end_time: '17:00',
                assigned_employee_id: '55555555-5555-5555-5555-555555555555'
            })).rejects.toThrow();
        });
    });

    describe('updateShift', () => {
        it('should update shift via direct update and select', async () => {
            const updateBuilder = new MockQueryBuilder();
            updateBuilder._data = [{ id: '22222222-2222-2222-2222-222222222222' }];
            builderQueue.push(updateBuilder);

            (shiftsQueries.getShiftById as any).mockResolvedValueOnce({ id: '22222222-2222-2222-2222-222222222222' });

            const result = await shiftsCommands.updateShift('22222222-2222-2222-2222-222222222222', {
                start_time: '10:00'
            });

            expect(result.id).toBe('22222222-2222-2222-2222-222222222222');
            expect(updateBuilder.update).toHaveBeenCalled();
        });
    });

    describe('bulkAssignShiftsAtomic', () => {
        it('should call atomic RPC', async () => {
            (rpcClient.callAuthenticatedRpc as any).mockResolvedValueOnce({
                success: true,
                total_requested: 1,
                success_count: 1,
                conflict_count: 0,
                conflicts: [],
                per_employee: [],
                assigned: ['22222222-2222-2222-2222-222222222222'],
                compliance_failed: [] 
            });

            const result = await shiftsCommands.bulkAssignShiftsAtomic([{ employeeId: '55555555-5555-5555-5555-555555555555', shiftIds: ['22222222-2222-2222-2222-222222222222'] }]);

            expect(result.success).toBe(true);
            expect(rpcClient.callAuthenticatedRpc).toHaveBeenCalledWith('sm_bulk_assign_atomic', expect.any(Function), expect.any(Object));
        });
    });

    describe('bulkUnassignShifts', () => {
        it('should fetch preState and update shifts', async () => {
            // preState builder
            const preStateBuilder = new MockQueryBuilder();
            preStateBuilder._data = [{ id: '22222222-2222-2222-2222-222222222222', assigned_employee_id: '55555555-5555-5555-5555-555555555555', shift_date: '2026-01-01', start_time: '09:00', end_time: '17:00' }];
            builderQueue.push(preStateBuilder);

            // update builder
            const updateBuilder = new MockQueryBuilder();
            updateBuilder._data = [{ id: '22222222-2222-2222-2222-222222222222' }];
            builderQueue.push(updateBuilder);

            const result = await shiftsCommands.bulkUnassignShifts(['22222222-2222-2222-2222-222222222222']);

            expect(result).toHaveLength(1);
            expect(updateBuilder.update).toHaveBeenCalled();
        });
    });

    describe('publishShift', () => {
        it('should publish shift via RPC', async () => {
            (shiftsQueries.getShiftById as any).mockResolvedValueOnce(null); // No existing shift returned
            (rpcClient.callAuthenticatedRpc as any).mockResolvedValueOnce({ success: true });

            await shiftsCommands.publishShift('22222222-2222-2222-2222-222222222222');

            expect(rpcClient.callAuthenticatedRpc).toHaveBeenCalledWith('sm_publish_shift', expect.any(Function), expect.any(Object));
        });
    });

    describe('deleteShift', () => {
        it('should call sm_delete_shift', async () => {
            (rpcClient.callAuthenticatedRpc as any).mockResolvedValueOnce({ success: true });

            const result = await shiftsCommands.deleteShift('22222222-2222-2222-2222-222222222222');

            expect(result).toBe(true);
            expect(rpcClient.callAuthenticatedRpc).toHaveBeenCalledWith('sm_delete_shift', expect.any(Function), expect.any(Object));
        });
    });

    describe('bulkDeleteShifts', () => {
        it('should call sm_bulk_delete_shifts', async () => {
            (rpcClient.callAuthenticatedRpc as any).mockResolvedValueOnce({ success_count: 2 });

            const result = await shiftsCommands.bulkDeleteShifts(['22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333']);

            expect(result).toBe(2);
            expect(rpcClient.callAuthenticatedRpc).toHaveBeenCalledWith('sm_bulk_delete_shifts', expect.any(Function), expect.any(Object));
        });
    });

    describe('requestTrade', () => {
        it('should call sm_request_trade', async () => {
            (rpcClient.callAuthenticatedRpc as any).mockResolvedValueOnce({ success: true });

            await shiftsCommands.requestTrade('22222222-2222-2222-2222-222222222222');

            expect(rpcClient.callAuthenticatedRpc).toHaveBeenCalledWith('sm_request_trade', expect.any(Function), expect.any(Object));
        });
    });

    describe('acceptOffer', () => {
        it('should call sm_accept_offer', async () => {
            (rpcClient.callAuthenticatedRpc as any).mockResolvedValueOnce({ success: true });

            await shiftsCommands.acceptOffer('22222222-2222-2222-2222-222222222222');

            expect(rpcClient.callAuthenticatedRpc).toHaveBeenCalledWith('sm_accept_offer', expect.any(Function), expect.any(Object));
        });
    });

    describe('rejectOffer', () => {
        it('should call sm_reject_offer', async () => {
            (rpcClient.callAuthenticatedRpc as any).mockResolvedValueOnce({ success: true });

            // Shift mock for rejectOffer
            const shiftBuilder = new MockQueryBuilder();
            // TTS > 4h
            const farFuture = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
            shiftBuilder._data = { shift_date: farFuture.split('T')[0], start_time: '12:00', start_at: farFuture };
            builderQueue.push(shiftBuilder);

            await shiftsCommands.rejectOffer('22222222-2222-2222-2222-222222222222', 'Reason');

            expect(rpcClient.callAuthenticatedRpc).toHaveBeenCalledWith('sm_reject_offer', expect.any(Function), expect.any(Object));
        });
        
        it('should call expireOfferNow if TTS < 4h', async () => {
            // Shift mock for rejectOffer
            const shiftBuilder = new MockQueryBuilder();
            // TTS < 4h
            const nearFuture = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
            shiftBuilder._data = { shift_date: nearFuture.split('T')[0], start_time: '12:00', start_at: nearFuture };
            builderQueue.push(shiftBuilder);
            
            (supabase.rpc as any).mockResolvedValueOnce({ data: { success: true }, error: null });

            await shiftsCommands.rejectOffer('22222222-2222-2222-2222-222222222222', 'Reason');

            expect(supabase.rpc).toHaveBeenCalledWith('sm_expire_offer_now', expect.any(Object));
        });
    });

    describe('expireOfferNow', () => {
        it('should call sm_expire_offer_now', async () => {
            (supabase.rpc as any).mockResolvedValueOnce({ data: { success: true }, error: null });
            await shiftsCommands.expireOfferNow('22222222-2222-2222-2222-222222222222');
            expect(supabase.rpc).toHaveBeenCalledWith('sm_expire_offer_now', expect.any(Object));
        });
    });
});
