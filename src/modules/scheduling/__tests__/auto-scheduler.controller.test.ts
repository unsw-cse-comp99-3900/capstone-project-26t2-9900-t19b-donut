import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoSchedulerController } from '../auto-scheduler.controller';
import { optimizerClient, OptimizerError } from '../optimizer/optimizer.client';
import { solutionParser } from '../optimizer/solution-parser';
import { bulkAssignmentController } from '@/modules/rosters/bulk-assignment';
import { assignmentCommitter } from '@/modules/rosters/bulk-assignment/engine/assignment-committer';
import { rosterFetcher } from '../data/roster-fetcher';
import { auditor } from '../audit/auditor';

vi.mock('../optimizer/optimizer.client', () => {
    return {
        optimizerClient: {
            optimize: vi.fn(),
            healthCheck: vi.fn()
        },
        OptimizerError: class extends Error {
            code: string;
            constructor(msg: string, code: string) {
                super(msg);
                this.code = code;
            }
        }
    };
});

vi.mock('../optimizer/solution-parser', () => {
    return {
        solutionParser: {
            buildMaps: vi.fn().mockReturnValue({ shiftMap: new Map(), employeeMap: new Map() }),
            parse: vi.fn().mockReturnValue({ groups: [], uncoveredV8ShiftIds: [] })
        }
    };
});

vi.mock('@/modules/rosters/bulk-assignment', () => {
    return {
        bulkAssignmentController: {
            simulate: vi.fn()
        }
    };
});

vi.mock('@/modules/rosters/bulk-assignment/engine/assignment-committer', () => {
    return {
        assignmentCommitter: {
            commitAtomic: vi.fn()
        }
    };
});

vi.mock('../data/roster-fetcher', () => {
    return {
        rosterFetcher: {
            fetchExistingRoster: vi.fn().mockResolvedValue(new Map()),
            fetchAvailability: vi.fn().mockResolvedValue(new Map())
        },
        durationMinutes: vi.fn().mockReturnValue(60)
    };
});

vi.mock('../audit/auditor', () => {
    return {
        auditor: {
            audit: vi.fn().mockResolvedValue([])
        }
    };
});

vi.mock('@/modules/rosters/services/fairnessLedger.service', () => ({
    fairnessLedgerService: {
        getEmployeeDebts: vi.fn().mockResolvedValue([]),
        updateAfterCommit: vi.fn().mockResolvedValue(true)
    }
}));

describe('autoSchedulerController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('capacityCheck', () => {
        it('should return sufficient if demand is less than supply', () => {
            const shifts = [
                { id: 's1', shift_date: '2026-01-01', start_time: '09:00', end_time: '17:00' }
            ] as any;
            const employees = [
                { id: 'e1' }
            ] as any;
            
            const result = autoSchedulerController.capacityCheck(shifts, employees);
            
            expect(result.sufficient).toBe(true);
            expect(result.deficitDays).toHaveLength(0);
        });

        it('should return insufficient if demand exceeds supply', () => {
            const shifts = [
                { id: 's1', shift_date: '2026-01-01', start_time: '09:00', end_time: '17:00' },
                { id: 's2', shift_date: '2026-01-01', start_time: '09:00', end_time: '17:00' }
            ] as any;
            const employees = [] as any; // No employees -> 0 supply
            
            const result = autoSchedulerController.capacityCheck(shifts, employees);
            
            expect(result.sufficient).toBe(false);
            expect(result.deficitDays).toHaveLength(1);
        });
    });

    describe('checkHealth', () => {
        it('should call optimizerClient.healthCheck', async () => {
            (optimizerClient.healthCheck as any).mockResolvedValueOnce({ status: 'OK' });
            const res = await autoSchedulerController.checkHealth();
            expect(optimizerClient.healthCheck).toHaveBeenCalled();
            expect(res.status).toBe('OK');
        });
    });

    describe('commit', () => {
        it('should return empty result if no passing proposals', async () => {
            const result = await autoSchedulerController.commit({ proposals: [] } as any);
            expect(result.totalCommitted).toBe(0);
            expect(assignmentCommitter.commitAtomic).not.toHaveBeenCalled();
        });

        it('should call atomic commit and return results', async () => {
            const mockProposals = [
                { passing: true, employeeId: 'e1', shiftId: 's1' },
                { passing: false, employeeId: 'e1', shiftId: 's2' }
            ] as any;
            
            (assignmentCommitter.commitAtomic as any).mockResolvedValueOnce({
                success: true,
                totalCommitted: 1,
                failedEmployees: [],
                concurrencyConflicts: []
            });

            const result = await autoSchedulerController.commit({ proposals: mockProposals } as any);
            
            expect(assignmentCommitter.commitAtomic).toHaveBeenCalledWith(
                [{ employeeId: 'e1', shiftIds: ['s1'] }],
                expect.any(String) // idempotencyKey
            );
            expect(result.success).toBe(true);
            expect(result.totalCommitted).toBe(1);
        });
    });

    describe('run', () => {
        it('should throw if input is too large', async () => {
            const shifts = Array(2001).fill({ id: 's' }) as any;
            await expect(autoSchedulerController.run({ shifts, employees: [] })).rejects.toThrow('Too many shifts');
            
            const employees = Array(501).fill({ id: 'e' }) as any;
            await expect(autoSchedulerController.run({ shifts: [], employees })).rejects.toThrow('Too many employees');
        });

        it('should run optimization and handle successful response', async () => {
            const shifts = [
                { id: 's1', shift_date: '2026-01-02', start_time: '09:00', end_time: '17:00' }
            ] as any;
            const employees = [
                { id: 'e1' }
            ] as any;

            (optimizerClient.optimize as any).mockResolvedValueOnce({
                status: 'OPTIMAL',
                solve_time_ms: 100,
                assignments: []
            });

            (solutionParser.parse as any).mockReturnValueOnce({
                groups: [
                    { employeeId: 'e1', shiftIds: ['s1'], proposals: [{ shiftId: 's1', cost: 10 }] }
                ],
                uncoveredV8ShiftIds: []
            });

            (bulkAssignmentController.simulate as any).mockResolvedValueOnce({
                results: [
                    { shiftId: 's1', passing: true, status: 'PASS' }
                ]
            });

            const result = await autoSchedulerController.run({ shifts, employees });

            expect(optimizerClient.optimize).toHaveBeenCalled();
            expect(bulkAssignmentController.simulate).toHaveBeenCalled();
            expect(result.passing).toBe(1);
            expect(result.optimizerStatus).toBe('OPTIMAL');
            expect(result.proposals).toHaveLength(1);
            expect(result.proposals[0].shiftId).toBe('s1');
        });

        it('should fallback to greedy when optimizer returns INFEASIBLE', async () => {
            const shifts = [
                { id: 's1', shift_date: '2026-01-02', start_time: '09:00', end_time: '17:00' }
            ] as any;
            const employees = [
                { id: 'e1' }
            ] as any;

            (optimizerClient.optimize as any).mockResolvedValueOnce({
                status: 'INFEASIBLE',
                assignments: []
            });

            (bulkAssignmentController.simulate as any).mockResolvedValueOnce({
                results: [
                    { shiftId: 's1', passing: true, status: 'PASS' }
                ]
            });

            const result = await autoSchedulerController.run({ shifts, employees });

            expect(result.usedFallback).toBe(true);
            expect(bulkAssignmentController.simulate).toHaveBeenCalled(); // via greedy fallback
            expect(result.passing).toBe(1);
        });

        it('should fallback to greedy when optimizer throws CONNECTION_REFUSED', async () => {
            const shifts = [
                { id: 's1', shift_date: '2026-01-02', start_time: '09:00', end_time: '17:00' }
            ] as any;
            const employees = [
                { id: 'e1' }
            ] as any;

            (optimizerClient.optimize as any).mockRejectedValueOnce(new OptimizerError('Connection refused', 'CONNECTION_REFUSED'));

            (bulkAssignmentController.simulate as any).mockResolvedValueOnce({
                results: [
                    { shiftId: 's1', passing: true, status: 'PASS' }
                ]
            });

            const result = await autoSchedulerController.run({ shifts, employees });

            expect(result.usedFallback).toBe(true);
            expect(result.optimizerStatus).toBe('UNKNOWN');
            expect(result.passing).toBe(1);
        });
    });
});
