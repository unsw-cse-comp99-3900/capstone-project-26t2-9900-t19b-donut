import { describe, it, expect, vi, beforeEach } from 'vitest';
import { swapsApi } from '../swaps.api';
import { supabase } from '@/platform/supabase/client';
import { shiftsApi } from '@/modules/rosters';
import { runSwapGuards, swapEvaluator } from '@/modules/compliance';

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

    // End methods
    single = vi.fn().mockImplementation(() => Promise.resolve({ data: this._data, error: this._error }));
    maybeSingle = vi.fn().mockImplementation(() => Promise.resolve({ data: this._data, error: this._error }));

    // Promise implementation for await queryBuilder
    then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
        return Promise.resolve({ data: this._data, error: this._error }).then(onfulfilled, onrejected);
    }
    catch(onrejected?: (reason: any) => any): Promise<any> {
        return Promise.resolve({ data: this._data, error: this._error }).catch(onrejected);
    }
    finally(onfinally?: () => void): Promise<any> {
        return Promise.resolve({ data: this._data, error: this._error }).finally(onfinally);
    }

    // Helper to set next response
    mockResultOnce(data: any, error: any = null) {
        this._data = data;
        this._error = error;
    }
}

// We need a queue of builders if multiple queries happen
let builderQueue: MockQueryBuilder[] = [];

vi.mock('@/platform/supabase/client', () => {
    return {
        supabase: {
            from: vi.fn(() => {
                if (builderQueue.length > 0) {
                    return builderQueue.shift();
                }
                return new MockQueryBuilder(); // fallback
            }),
            rpc: vi.fn().mockResolvedValue({ data: null, error: null })
        }
    };
});

vi.mock('@/modules/rosters', () => ({
    shiftsApi: {
        getEmployeeShifts: vi.fn().mockResolvedValue([])
    }
}));

vi.mock('@/modules/compliance', () => ({
    runSwapGuards: vi.fn().mockResolvedValue({ passed: true }),
    swapEvaluator: {
        evaluate: vi.fn().mockReturnValue({ feasible: true, violations: [] })
    },
    SwapGuardError: class extends Error {
        constructor(result: any) {
            super('Guard failed');
        }
    }
}));

const FUTURE_DATE = '2030-01-01';

describe('swapsApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        builderQueue = [];
    });

    describe('createSwapRequest', () => {
        it('should create swap request and update shift status', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = { shift_date: FUTURE_DATE, start_time: '12:00' };
            const b2 = new MockQueryBuilder();
            b2._data = { id: 'swap-1' };
            const b3 = new MockQueryBuilder(); // update shift
            b3._data = null;
            builderQueue.push(b1, b2, b3);

            const result = await swapsApi.createSwapRequest('s1', 'e1', 'e2', 'test reason');
            
            expect(result).toEqual({ id: 'swap-1' });
            expect(supabase.from).toHaveBeenCalledWith('shift_swaps');
            expect(supabase.from).toHaveBeenCalledWith('shifts');
        });

        it('should throw if shift is time locked', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = { shift_date: '2020-01-01', start_time: '12:00' };
            builderQueue.push(b1);

            await expect(swapsApi.createSwapRequest('s1', 'e1', 'e2', 'test reason'))
                .rejects.toThrow('Time locked: shift starts in');
        });
    });

    describe('getMySwaps', () => {
        it('should fetch my requests and offers and merge them', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = [{ id: 'req1', requester_shift_id: 's1' }];
            const b2 = new MockQueryBuilder();
            b2._data = [{ id: 'off1', swap_request_id: 'req2', swap_request: { id: 'req2', requester_shift_id: 's2' } }];
            builderQueue.push(b1, b2);

            const result = await swapsApi.getMySwaps('e1');
            expect(result).toHaveLength(2);
        });
    });

    describe('getAvailableSwaps', () => {
        it('should apply filters and return swaps', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = [{ id: 'req1', requester_shift_id: 's1' }];
            builderQueue.push(b1);

            const result = await swapsApi.getAvailableSwaps('e1', { organizationId: 'org1', departmentId: 'dep1' });
            expect(result).toHaveLength(1);
        });
    });

    describe('getSwapById', () => {
        it('should return swap with details', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = { id: 'swap1', requester_shift_id: 's1' };
            builderQueue.push(b1);

            const result = await swapsApi.getSwapById('swap1');
            expect(result?.id).toBe('swap1');
        });
    });

    describe('makeOffer', () => {
        it('should make an offer with time lock check', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = { requester_id: 'req1' }; // swapMeta
            const b2 = new MockQueryBuilder();
            b2._data = { shift_date: FUTURE_DATE, start_time: '12:00' }; // shift
            const b3 = new MockQueryBuilder();
            b3._data = null; // insert
            builderQueue.push(b1, b2, b3);

            await swapsApi.makeOffer('swap1', 's2', 'target1');

            expect(supabase.from).toHaveBeenCalledWith('swap_offers');
        });

        it('should throw if self offering', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = { requester_id: 'req1' };
            builderQueue.push(b1);

            await expect(swapsApi.makeOffer('swap1', 's2', 'req1')).rejects.toThrow('You cannot make an offer on your own swap request.');
        });
    });

    describe('approveSwapRequest', () => {
        const mockSwap = {
            id: 'swap1',
            requester_id: 'req1',
            target_id: 'target1',
            requester_shift_id: 'req-shift-1',
            target_shift_id: 'target-shift-1',
            requester_shift: { shift_date: FUTURE_DATE, start_time: '12:00' },
            target_shift: { shift_date: FUTURE_DATE, start_time: '12:00' },
            requested_by: { id: 'req1' },
            swap_with: { id: 'target1' }
        };

        it('should check compliance and call sm_approve_peer_swap', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = mockSwap; // getSwapById
            const b2 = new MockQueryBuilder();
            b2._data = null; // maybeSingle offer
            const b3 = new MockQueryBuilder();
            b3._data = { shift_date: FUTURE_DATE, start_time: '12:00' }; // shift
            const b4 = new MockQueryBuilder(); // update swap
            b4._data = null;
            builderQueue.push(b1, b2, b3, b4);

            await swapsApi.approveSwapRequest('swap1');

            expect(shiftsApi.getEmployeeShifts).toHaveBeenCalledTimes(2);
            expect(runSwapGuards).toHaveBeenCalled();
            expect(swapEvaluator.evaluate).toHaveBeenCalled();
            expect(supabase.rpc).toHaveBeenCalledWith('sm_approve_peer_swap', expect.any(Object));
        });

        it('should throw if compliance fails', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = mockSwap;
            const b2 = new MockQueryBuilder();
            b2._data = null;
            const b3 = new MockQueryBuilder();
            b3._data = { shift_date: FUTURE_DATE, start_time: '12:00' };
            builderQueue.push(b1, b2, b3);

            (swapEvaluator.evaluate as any).mockReturnValueOnce({ feasible: false, violations: [{ blocking: true, summary: 'Fail', employee_name: 'Bob' }] });

            await expect(swapsApi.approveSwapRequest('swap1')).rejects.toThrow('Compliance violation detected');
        });
    });

    describe('rejectSwapRequest', () => {
        it('should update status and revert shifts', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = { status: 'MANAGER_PENDING', requester_shift_id: 's1' }; // swap fetch
            const b2 = new MockQueryBuilder();
            b2._data = null; // update swap
            const b3 = new MockQueryBuilder();
            b3._data = null; // revert shifts
            builderQueue.push(b1, b2, b3);

            await swapsApi.rejectSwapRequest('swap1', 'No');
            expect(supabase.from).toHaveBeenCalledWith('shift_swaps');
            expect(supabase.from).toHaveBeenCalledWith('shifts');
        });
    });

    describe('cancelSwapRequest', () => {
        it('should update status and revert shift', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = { status: 'OPEN', requester_shift_id: 's1' }; // swap
            const b2 = new MockQueryBuilder();
            b2._data = null; // update
            const b3 = new MockQueryBuilder();
            b3._data = null; // shift revert
            builderQueue.push(b1, b2, b3);

            await swapsApi.cancelSwapRequest('swap1');
            expect(supabase.from).toHaveBeenCalledWith('shift_swaps');
            expect(supabase.from).toHaveBeenCalledWith('shifts');
        });
    });

    describe('acceptTrade', () => {
        it('should check compliance and call sm_accept_trade', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = { 
                status: 'OPEN', 
                requester_shift_id: 's1',
                requester_shift: { shift_date: FUTURE_DATE, start_time: '12:00' },
                requester_id: 'req1'
            }; // swap
            const b2 = new MockQueryBuilder();
            b2._data = { shift_date: FUTURE_DATE, start_time: '12:00' }; // shift
            builderQueue.push(b1, b2);

            (supabase.rpc as any).mockResolvedValueOnce({ data: { success: true }, error: null });

            await swapsApi.acceptTrade('swap1', 'off1', 'target1', 's2');
            
            expect(supabase.rpc).toHaveBeenCalledWith('sm_accept_trade', expect.any(Object));
        });
    });

    describe('rejectTrade', () => {
        it('should update offer status', async () => {
            const b1 = new MockQueryBuilder();
            b1._data = null;
            builderQueue.push(b1);

            await swapsApi.rejectTrade('off1');
            expect(supabase.from).toHaveBeenCalledWith('swap_offers');
        });
    });
});
