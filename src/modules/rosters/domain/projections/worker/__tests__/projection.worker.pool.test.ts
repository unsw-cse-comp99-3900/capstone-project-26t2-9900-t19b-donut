import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProjectionWorkerPool } from '../projection.worker.pool';
import { UNASSIGNED_BUCKET_ID } from '../../constants';

// Mock the worker
const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();

vi.mock('../projection.worker?worker', () => {
    return {
        default: class MockWorker {
            onmessage: any;
            onerror: any;
            postMessage(msg: any) {
                mockPostMessage(msg);
                // Simulate async response after a small delay
                setTimeout(() => {
                    if (this.onmessage) {
                        // Return mock partial result depending on the mode requested
                        const payload = msg.payload;
                        
                        const stats = {
                            totalShifts: 1,
                            assignedShifts: 1,
                            openShifts: 0,
                            publishedShifts: 1,
                            totalNetMinutes: 60,
                            estimatedCost: 100,
                            costBreakdown: { base: 100, penalty: 0, overtime: 0, allowance: 0, leave: 0 }
                        };

                        let mockResult: any = {
                            requestId: payload.requestId,
                            stats
                        };

                        if (payload.mode === 'people') {
                            mockResult.people = {
                                employees: [{
                                    id: 'emp-1',
                                    currentHours: 10,
                                    contractedHours: 40,
                                    estimatedPay: 100,
                                    payBreakdown: { base: 100, penalty: 0, overtime: 0, allowance: 0, leave: 0 },
                                    shifts: { '2026-01-01': [{ date: '2026-01-01', startTime: '09:00', endTime: '17:00' }] },
                                    fatigueScore: 10
                                }]
                            };
                        } else if (payload.mode === 'group') {
                            mockResult.group = {
                                groups: [{
                                    id: 'group-1',
                                    subGroups: [{
                                        id: 'sg-1',
                                        shiftsByDate: { '2026-01-01': [] },
                                        stats
                                    }],
                                    stats
                                }]
                            };
                        } else if (payload.mode === 'roles') {
                            mockResult.roles = {
                                levels: [{
                                    id: 'lvl-1',
                                    totalHours: 10,
                                    totalCost: 100,
                                    roles: [{
                                        id: 'role-1',
                                        totalHours: 10,
                                        totalCost: 100,
                                        shiftsByDate: {}
                                    }]
                                }],
                                unassignedRoles: []
                            };
                        } else if (payload.mode === 'events') {
                            mockResult.events = {
                                events: [{
                                    eventId: 'event-1',
                                    totalHours: 10,
                                    assignedCount: 1,
                                    totalCount: 1,
                                    shifts: []
                                }]
                            };
                        }
                        
                        this.onmessage({ data: { type: 'result', payload: mockResult } });
                    }
                }, 10);
            }
            terminate = mockTerminate;
        }
    };
});

describe('ProjectionWorkerPool', () => {
    let pool: ProjectionWorkerPool;

    beforeEach(() => {
        vi.clearAllMocks();
        // Use poolSize = 2 to ensure we test the chunking and merging path
        pool = new ProjectionWorkerPool({ poolSize: 2, debounceMs: 0 });
    });

    afterEach(() => {
        pool.dispose();
    });

    it('should initialize with given size', () => {
        expect(pool.size).toBe(2);
    });

    it('should handle small rosters with single worker', async () => {
        const resultPromise = new Promise<any>((resolve) => {
            pool.onResult = resolve;
        });

        // 1 shift < POOL_THRESHOLD (100)
        pool.requestProjection({
            shifts: [{ id: 'shift-1' } as any],
            mode: 'people',
            rangeDays: 7
        });

        const result = await resultPromise;
        expect(result.mode).toBe('people');
        expect(result.stats.totalShifts).toBe(1); // 1 worker responds
    });

    it('should handle large rosters with multiple workers (people mode)', async () => {
        const resultPromise = new Promise<any>((resolve) => {
            pool.onResult = resolve;
        });

        // > 100 shifts to trigger multi-worker
        const shifts = Array.from({ length: 150 }, (_, i) => ({ id: `shift-${i}` } as any));
        
        pool.requestProjection({
            shifts,
            mode: 'people',
            rangeDays: 7
        });

        const result = await resultPromise;
        expect(result.mode).toBe('people');
        // pool size is 2, so it splits into 2 chunks, mock worker responds twice.
        // the stats should be sum of 2 responses => 2
        expect(result.stats.totalShifts).toBe(2); 
        expect(result.people.employees[0].currentHours).toBe(20); // 10 + 10
    });

    it('should handle large rosters with multiple workers (group mode)', async () => {
        const resultPromise = new Promise<any>((resolve) => {
            pool.onResult = resolve;
        });

        const shifts = Array.from({ length: 150 }, (_, i) => ({ id: `shift-${i}` } as any));
        
        pool.requestProjection({
            shifts,
            mode: 'group',
            rangeDays: 7
        });

        const result = await resultPromise;
        expect(result.group.groups[0].stats.totalShifts).toBe(2); // 1 + 1 merged
    });

    it('should handle large rosters with multiple workers (roles mode)', async () => {
        const resultPromise = new Promise<any>((resolve) => {
            pool.onResult = resolve;
        });

        const shifts = Array.from({ length: 150 }, (_, i) => ({ id: `shift-${i}` } as any));
        
        pool.requestProjection({
            shifts,
            mode: 'roles',
            rangeDays: 7
        });

        const result = await resultPromise;
        expect(result.roles.levels[0].totalHours).toBe(20); // 10 + 10 merged
    });

    it('should handle large rosters with multiple workers (events mode)', async () => {
        const resultPromise = new Promise<any>((resolve) => {
            pool.onResult = resolve;
        });

        const shifts = Array.from({ length: 150 }, (_, i) => ({ id: `shift-${i}` } as any));
        
        pool.requestProjection({
            shifts,
            mode: 'events',
            rangeDays: 7
        });

        const result = await resultPromise;
        expect(result.events.events[0].totalHours).toBe(20); // 10 + 10 merged
    });

    it('should cancel in-flight projection', async () => {
        const shifts = Array.from({ length: 150 }, (_, i) => ({ id: `shift-${i}` } as any));
        const reqId = pool.requestProjection({
            shifts,
            mode: 'people',
            rangeDays: 7
        });
        
        // Wait for debounce tick (debounceMs is 0)
        await new Promise(resolve => setTimeout(resolve, 0));
        
        pool.cancelProjection(reqId);
        
        // Ensure postMessage called with cancel
        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'cancel' }));
    });
});
