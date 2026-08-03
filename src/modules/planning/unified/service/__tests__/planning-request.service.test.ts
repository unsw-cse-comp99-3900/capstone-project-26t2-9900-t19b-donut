import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planningRequestService } from '../planning-request.service';
import { supabase } from '@/platform/supabase/client';

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
    insert = vi.fn().mockReturnThis();
    update = vi.fn().mockReturnThis();
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

vi.mock('@/modules/compliance/employee-context', () => ({
    fetchV8EmployeeContext: vi.fn().mockResolvedValue({}),
    fetchEmployeeShiftsV2: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/modules/compliance/v8', () => ({
    runV8Orchestrator: vi.fn().mockReturnValue({ passing: true, violations: [] }),
}));

describe('planningRequestService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        builderQueue = [];
    });

    describe('createPlanningRequest', () => {
        it('should create a BID request successfully', async () => {
            const shiftBuilder = new MockQueryBuilder();
            // far future shift
            const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
            shiftBuilder._data = { id: 's1', shift_date: futureDate.split('T')[0], start_time: '12:00', workflow_status: 'IDLE' };
            builderQueue.push(shiftBuilder);

            const insertBuilder = new MockQueryBuilder();
            insertBuilder._data = { id: 'r1', type: 'BID', status: 'OPEN' };
            builderQueue.push(insertBuilder);

            const updateShiftBuilder = new MockQueryBuilder();
            updateShiftBuilder._data = { id: 's1' };
            builderQueue.push(updateShiftBuilder);

            const result = await planningRequestService.createPlanningRequest({
                type: 'BID',
                shift_id: 's1',
                initiated_by: 'u1',
                reason: 'test'
            });

            expect(result.id).toBe('r1');
            expect(insertBuilder.insert).toHaveBeenCalled();
            expect(updateShiftBuilder.update).toHaveBeenCalledWith({ workflow_status: 'OPEN_FOR_BIDS' });
        });

        it('should throw if time-locked', async () => {
            const shiftBuilder = new MockQueryBuilder();
            // past shift is definitely time-locked
            const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            shiftBuilder._data = { id: 's1', shift_date: pastDate.split('T')[0], start_time: '12:00', workflow_status: 'IDLE' };
            builderQueue.push(shiftBuilder);

            await expect(planningRequestService.createPlanningRequest({
                type: 'BID',
                shift_id: 's1',
                initiated_by: 'u1',
                reason: 'test'
            })).rejects.toThrow('time-locked');
        });
    });

    describe('rejectRequest', () => {
        it('should reject a request and update shift', async () => {
            const reqBuilder = new MockQueryBuilder();
            reqBuilder._data = { id: 'r1', shift_id: 's1', status: 'MANAGER_PENDING' };
            builderQueue.push(reqBuilder);

            const offerBuilder = new MockQueryBuilder();
            offerBuilder._data = { id: 'o1' };
            builderQueue.push(offerBuilder);

            const shiftBuilder = new MockQueryBuilder();
            shiftBuilder._data = { id: 's1' };
            builderQueue.push(shiftBuilder);

            const rejectBuilder = new MockQueryBuilder();
            rejectBuilder._data = { id: 'r1', status: 'REJECTED' };
            builderQueue.push(rejectBuilder);

            const result = await planningRequestService.rejectRequest({
                request_id: 'r1',
                manager_id: 'm1',
                manager_notes: 'no'
            });

            expect(result.status).toBe('REJECTED');
            expect(shiftBuilder.update).toHaveBeenCalledWith({ workflow_status: 'IDLE' });
            expect(rejectBuilder.update).toHaveBeenCalled();
        });
    });
    
    describe('cancelRequest', () => {
        it('should cancel an open request', async () => {
            const reqBuilder = new MockQueryBuilder();
            reqBuilder._data = { id: 'r1', shift_id: 's1', status: 'OPEN', initiated_by: 'u1' };
            builderQueue.push(reqBuilder);
            
            const updateShiftBuilder = new MockQueryBuilder();
            updateShiftBuilder._data = { id: 's1' };
            builderQueue.push(updateShiftBuilder);
            
            const cancelBuilder = new MockQueryBuilder();
            cancelBuilder._data = { id: 'r1', status: 'CANCELLED' };
            builderQueue.push(cancelBuilder);
            
            const result = await planningRequestService.cancelRequest({
                request_id: 'r1',
                caller_id: 'u1' // matching initiated_by
            });
            
            expect(result).toEqual({ cancelled_from: 'OPEN' });
            expect(cancelBuilder.update).toHaveBeenCalled();
        });
    });
});
