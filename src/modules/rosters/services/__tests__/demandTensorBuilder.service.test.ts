import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as demandTensorBuilder from '../demandTensorBuilder.service';
import { supabase } from '@/platform/supabase/client';
import { SLOT_MINUTES, SLOT_DURATION_MINUTES } from '../../domain/shiftSynthesizer.policy';
import * as mlClientService from '../mlClient.service';
import * as roleMlClassQueries from '../../api/roleMlClass.queries';

vi.mock('@/platform/supabase/client', () => {
    const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    };
    return {
        supabase: {
            from: vi.fn(() => mockQueryBuilder)
        }
    };
});

vi.mock('../mlClient.service', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../mlClient.service')>();
    return {
        ...mod,
        buildDemandAnalysisForRoles: vi.fn().mockResolvedValue([])
    };
});

vi.mock('../../api/roleMlClass.queries', () => ({
    fetchRoleMLClassMap: vi.fn().mockResolvedValue(new Map())
}));

// Set timezone env if needed, though derivePerSliceFlags uses Intl which handles 'Australia/Sydney'
vi.stubEnv('VITE_DEMAND_SERVICE_LEVEL', '0.75');

describe('demandTensorBuilder.service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getDefaultServiceLevel', () => {
        it('should return configured env value', () => {
            vi.stubEnv('VITE_DEMAND_SERVICE_LEVEL', '0.75');
            expect(demandTensorBuilder.getDefaultServiceLevel()).toBe(0.75);
        });

        it('should return default 0.5 if env is missing or invalid', () => {
            vi.stubEnv('VITE_DEMAND_SERVICE_LEVEL', 'invalid');
            expect(demandTensorBuilder.getDefaultServiceLevel()).toBe(0.5);
            vi.stubEnv('VITE_DEMAND_SERVICE_LEVEL', '');
            expect(demandTensorBuilder.getDefaultServiceLevel()).toBe(0); // Number('') is 0
        });

        it('should clamp values between 0 and 0.999', () => {
            vi.stubEnv('VITE_DEMAND_SERVICE_LEVEL', '1.5');
            expect(demandTensorBuilder.getDefaultServiceLevel()).toBe(0.999);
            vi.stubEnv('VITE_DEMAND_SERVICE_LEVEL', '-0.5');
            expect(demandTensorBuilder.getDefaultServiceLevel()).toBe(0);
        });
    });

    describe('derivePerSliceFlags', () => {
        it('should handle missing slice index', () => {
            const res = demandTensorBuilder.derivePerSliceFlags(999, 0, 0);
            expect(res).toEqual({ entryPeakFlag: false, exitPeakFlag: false, mealWindowFlag: false });
        });

        it('should calculate entry and exit peaks correctly based on event times in Sydney TZ', () => {
            // Event is 09:00 to 11:00 Sydney time (epoch in UTC doesn't matter as long as it parses to 09:00 Syd)
            // 2026-01-01T09:00:00+11:00 is 1735682400000
            const eventStartMs = new Date('2026-01-01T09:00:00+11:00').getTime();
            const eventEndMs = new Date('2026-01-01T11:00:00+11:00').getTime();

            // SLOT_MINUTES[4] is 09:00 (540 mins)
            const sliceIndex = SLOT_MINUTES.findIndex(m => m === 540); 
            
            const res = demandTensorBuilder.derivePerSliceFlags(sliceIndex, eventStartMs, eventEndMs);
            expect(res.entryPeakFlag).toBe(true);
            expect(res.exitPeakFlag).toBe(false);
            expect(res.mealWindowFlag).toBe(false);
        });

        it('should flag meal windows correctly', () => {
            // Lunch: 12:00-13:30 (720-810)
            const sliceIndex = SLOT_MINUTES.findIndex(m => m === 720); // 12:00
            const res = demandTensorBuilder.derivePerSliceFlags(sliceIndex, 0, 0);
            expect(res.mealWindowFlag).toBe(true);
            
            // Dinner: 18:00-19:30 (1080-1170)
            const dinnerIndex = SLOT_MINUTES.findIndex(m => m === 1080); // 18:00
            const resDinner = demandTensorBuilder.derivePerSliceFlags(dinnerIndex, 0, 0);
            expect(resDinner.mealWindowFlag).toBe(true);
        });
    });

    describe('computeExistingCoverage', () => {
        it('should accurately compute partial slot coverage', () => {
            const slots = [
                { slotStart: 540, slotEnd: 570, requiredHeadcount: 0, residualHeadcount: 0, residualHeadcountInt: 0, contributingEvents: [] }, // 09:00-09:30
                { slotStart: 570, slotEnd: 600, requiredHeadcount: 0, residualHeadcount: 0, residualHeadcountInt: 0, contributingEvents: [] }, // 09:30-10:00
            ];
            const shifts = [
                {
                    id: 'shift-1',
                    lifecycle_status: 'Published',
                    role_id: 'role-1',
                    sub_department_id: 'sub-1',
                    group_type: 'convention_centre',
                    start_time: '09:15:00', // covers half of first slot
                    end_time: '10:00:00', // covers all of second slot
                } as any
            ];
            
            const result = demandTensorBuilder.computeExistingCoverage(slots, shifts, 'role-1', 'sub-1', 'convention_centre');
            expect(result).toEqual([0.5, 1.0]);
        });
        
        it('should ignore cancelled shifts and non-matching roles/departments', () => {
            const slots = [{ slotStart: 540, slotEnd: 570, requiredHeadcount: 0, residualHeadcount: 0, residualHeadcountInt: 0, contributingEvents: [] }];
            const shifts = [
                { lifecycle_status: 'Cancelled', role_id: 'role-1', sub_department_id: 'sub-1', group_type: 'convention_centre', start_time: '09:00:00', end_time: '10:00:00' },
                { lifecycle_status: 'Published', role_id: 'role-2', sub_department_id: 'sub-1', group_type: 'convention_centre', start_time: '09:00:00', end_time: '10:00:00' },
                { lifecycle_status: 'Published', role_id: 'role-1', sub_department_id: 'sub-2', group_type: 'convention_centre', start_time: '09:00:00', end_time: '10:00:00' },
            ] as any[];
            
            const result = demandTensorBuilder.computeExistingCoverage(slots, shifts, 'role-1', 'sub-1', 'convention_centre');
            expect(result).toEqual([0]);
        });
    });

    describe('buildScopeDemand', () => {
        it('should build demand and handle empty events', async () => {
            const result = await demandTensorBuilder.buildScopeDemand({
                organizationId: 'org-1',
                date: '2026-01-01',
                roles: [],
                existingShifts: [],
                buildingType: 'convention_centre'
            });
            
            expect(result.tensors).toEqual([]);
            expect(result.baselineShifts).toEqual([]);
            expect(result.eventCount).toBe(0);
            expect(result.hasMlError).toBe(false);
            expect(result.demandTensorRows).toEqual([]);
        });
    });
});
