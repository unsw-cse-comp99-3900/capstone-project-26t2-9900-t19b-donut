import { describe, it, expect } from 'vitest';
import * as policy from '../shiftSynthesizer.policy';
import type { SynthesizedShift, DemandSlot } from '../shiftSynthesizer.policy';

describe('shiftSynthesizer.policy', () => {
    describe('mergeMicroPeaks', () => {
        it('should return empty if no shifts', () => {
            expect(policy.mergeMicroPeaks([])).toEqual([]);
        });

        it('should not merge if shift is >= microPeakMinutes', () => {
            const shifts: SynthesizedShift[] = [
                { roleId: 'r1', subDepartmentId: 's1', buildingType: 'convention_centre', startMinutes: 600, endMinutes: 660, type: 'core', headcount: 1 }
            ];
            expect(policy.mergeMicroPeaks(shifts)).toEqual(shifts);
        });

        it('should merge short shift with prev neighbour', () => {
            const shifts: SynthesizedShift[] = [
                { roleId: 'r1', subDepartmentId: 's1', buildingType: 'convention_centre', startMinutes: 540, endMinutes: 600, type: 'core', headcount: 1 },
                { roleId: 'r1', subDepartmentId: 's1', buildingType: 'convention_centre', startMinutes: 600, endMinutes: 630, type: 'core', headcount: 2 }, // 30 min micro peak
            ];
            const merged = policy.mergeMicroPeaks(shifts);
            expect(merged.length).toBe(1);
            expect(merged[0].startMinutes).toBe(540);
            expect(merged[0].endMinutes).toBe(630);
            expect(merged[0].headcount).toBe(2);
        });
        
        it('should merge short shift with next neighbour', () => {
            const shifts: SynthesizedShift[] = [
                { roleId: 'r1', subDepartmentId: 's1', buildingType: 'convention_centre', startMinutes: 570, endMinutes: 600, type: 'core', headcount: 2 }, // 30 min micro peak
                { roleId: 'r1', subDepartmentId: 's1', buildingType: 'convention_centre', startMinutes: 600, endMinutes: 660, type: 'core', headcount: 1 }, 
            ];
            const merged = policy.mergeMicroPeaks(shifts);
            expect(merged.length).toBe(1);
            expect(merged[0].startMinutes).toBe(570);
            expect(merged[0].endMinutes).toBe(660);
            expect(merged[0].headcount).toBe(2);
        });
    });

    describe('detectPeaks', () => {
        it('should return null for empty slots', () => {
            expect(policy.detectPeaks([], 'role-1')).toBeNull();
        });

        it('should return null if maxHeadcount is 0', () => {
            const slots: DemandSlot[] = [
                { slotStart: 540, slotEnd: 570, requiredHeadcount: 0, residualHeadcount: 0, residualHeadcountInt: 0 }
            ];
            expect(policy.detectPeaks(slots, 'role-1')).toBeNull();
        });

        it('should detect peak window correctly for known role', () => {
            const slots: DemandSlot[] = Array.from({ length: 40 }, (_, i) => ({
                slotStart: 420 + i * 30,
                slotEnd: 420 + (i + 1) * 30,
                requiredHeadcount: i === 15 ? 10 : 0, // Peak in middle (during)
                residualHeadcount: 0,
                residualHeadcountInt: 0
            }));
            
            // "security" is "during" phase
            const peak = policy.detectPeaks(slots, 'security');
            expect(peak).toBeTruthy();
            expect(peak?.maxHeadcount).toBe(10);
        });
    });

    describe('splitShift', () => {
        it('should not split if within max duration', () => {
            const shift: SynthesizedShift = { roleId: 'r1', subDepartmentId: 's1', buildingType: 'convention_centre', startMinutes: 540, endMinutes: 540 + policy.MAX_SHIFT_MINUTES, type: 'core', headcount: 1 };
            expect(policy.splitShift(shift)).toEqual([shift]);
        });

        it('should split if exceeds max duration', () => {
            const start = 540;
            const end = 540 + policy.MAX_SHIFT_MINUTES + 60; // 13 hours
            const shift: SynthesizedShift = { roleId: 'r1', subDepartmentId: 's1', buildingType: 'convention_centre', startMinutes: start, endMinutes: end, type: 'core', headcount: 1 };
            const split = policy.splitShift(shift);
            expect(split.length).toBe(2);
            expect(split[0].startMinutes).toBe(start);
            expect(split[0].endMinutes).toBe(start + (end - start) / 2);
            expect(split[1].startMinutes).toBe(start + (end - start) / 2);
            expect(split[1].endMinutes).toBe(end);
        });
    });

    describe('enforceMinDuration', () => {
        it('should pad short shifts symmetrically', () => {
            const shifts: SynthesizedShift[] = [
                { roleId: 'r1', subDepartmentId: 's1', buildingType: 'convention_centre', startMinutes: 600, endMinutes: 660, type: 'core', headcount: 1 } // 1 hour
            ];
            const result = policy.enforceMinDuration(shifts);
            expect(result.length).toBe(1);
            expect(result[0].endMinutes - result[0].startMinutes).toBe(policy.MIN_SHIFT_MINUTES);
            expect(result[0].startMinutes).toBe(540); // padded 60 mins before (from 600)
            expect(result[0].endMinutes).toBe(720); // padded 60 mins after (from 660)
        });
    });

    describe('applySupervisorRatios', () => {
        it('should add supervisor shift if needed', () => {
            const shifts: SynthesizedShift[] = [
                { roleId: 'staff-1', subDepartmentId: 'dept-1', buildingType: 'convention_centre', startMinutes: 540, endMinutes: 600, type: 'core', headcount: 10 }
            ];
            const rules = [
                { subDepartmentId: 'dept-1', ratio: 5, supervisorV8RoleId: 'sup-1' } // 1 sup per 5 staff
            ];
            
            const result = policy.applySupervisorRatios(shifts, rules);
            expect(result.length).toBe(2);
            
            const supShift = result.find(s => s.roleId === 'sup-1');
            expect(supShift).toBeTruthy();
            expect(supShift?.headcount).toBe(2); // 10 staff / 5 ratio = 2
        });
    });

    describe('applyMinimumStaff', () => {
        it('should bump headcount to meet minimum', () => {
            const shifts: SynthesizedShift[] = [
                { roleId: 'r1', subDepartmentId: 's1', buildingType: 'convention_centre', startMinutes: 540, endMinutes: 600, type: 'core', headcount: 1 }
            ];
            const rules = [
                { subDepartmentId: 's1', roleId: 'r1', minimumHeadcount: 3 }
            ];
            
            const result = policy.applyMinimumStaff(shifts, rules, { start: 540, end: 600 });
            expect(result.length).toBe(1);
            expect(result[0].headcount).toBe(3);
        });

        it('should create a full window shift if none exists', () => {
            const shifts: SynthesizedShift[] = [];
            const rules = [
                { subDepartmentId: 's1', roleId: 'r1', minimumHeadcount: 2 }
            ];
            
            const result = policy.applyMinimumStaff(shifts, rules, { start: 540, end: 720 });
            expect(result.length).toBe(1);
            expect(result[0].roleId).toBe('r1');
            expect(result[0].startMinutes).toBe(540);
            expect(result[0].endMinutes).toBe(720);
            expect(result[0].headcount).toBe(2);
        });
    });
});
