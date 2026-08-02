import { describe, it, expect } from 'vitest';
import * as utils from '../utils';

describe('Compliance Utils', () => {
    it('parseTimeToMinutes works', () => {
        expect(utils.parseTimeToMinutes('00:00')).toBe(0);
        expect(utils.parseTimeToMinutes('01:30')).toBe(90);
        expect(utils.parseTimeToMinutes('23:59')).toBe(1439);
    });

    it('minutesToHours works', () => {
        expect(utils.minutesToHours(90)).toBe(1.5);
    });

    it('minutesToTimeString works', () => {
        expect(utils.minutesToTimeString(90)).toBe('01:30');
    });

    it('getShiftDurationMinutes works', () => {
        expect(utils.getShiftDurationMinutes('09:00', '17:00')).toBe(480);
        // cross midnight
        expect(utils.getShiftDurationMinutes('22:00', '02:00')).toBe(240);
    });

    it('doShiftsOverlap works', () => {
        const shift1 = { date: '2026-01-01', start_time: '09:00', end_time: '17:00' };
        const shift2 = { date: '2026-01-01', start_time: '10:00', end_time: '12:00' };
        const shift3 = { date: '2026-01-01', start_time: '18:00', end_time: '20:00' };

        expect(utils.doShiftsOverlap(shift1 as any, shift2 as any)).toBe(true);
        expect(utils.doShiftsOverlap(shift1 as any, shift3 as any)).toBe(false);
    });

    it('getISOWeekInfo works', () => {
        const info = utils.getISOWeekInfoFromString('2026-01-01');
        expect(info).toBeDefined();
        expect(info.year).toBeDefined();
        expect(info.week).toBeDefined();
        expect(info.key).toBeDefined();
    });

    it('splitShiftByDay works', () => {
        const shift = { shift_date: '2026-01-01', start_time: '22:00', end_time: '02:00' };
        const split = utils.splitShiftByDay(shift as any);
        expect(split.length).toBe(2);
        expect(split[0].shift_date).toBe('2026-01-01');
        expect(split[0].start_minutes).toBe(1320);
        expect(split[0].end_minutes).toBe(1440);
        
        expect(split[1].shift_date).toBe('2026-01-02');
        expect(split[1].start_minutes).toBe(0);
        expect(split[1].end_minutes).toBe(120);
    });
});
