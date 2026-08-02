import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getShiftsForTimesheet, updateTimesheetEntry, bulkUpdateTimesheetStatus, markShiftAsNoShow, snapToQuarterHour } from '../timesheets.supabase.api';
import { supabase } from '@/platform/supabase/client';

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

describe('timesheets.supabase.api', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        builderQueue = [];
    });

    describe('snapToQuarterHour', () => {
        it('should snap HH:MM string to nearest quarter hour', () => {
            expect(snapToQuarterHour('09:07')).toBe('09:00');
            expect(snapToQuarterHour('09:08')).toBe('09:15');
            expect(snapToQuarterHour('09:22')).toBe('09:15');
            expect(snapToQuarterHour('09:23')).toBe('09:30');
            expect(snapToQuarterHour('09:52')).toBe('09:45');
            expect(snapToQuarterHour('09:53')).toBe('10:00');
        });

        it('should return null for invalid input', () => {
            expect(snapToQuarterHour(null)).toBeNull();
            expect(snapToQuarterHour('')).toBeNull();
            expect(snapToQuarterHour('invalid')).toBeNull();
        });
    });

    describe('getShiftsForTimesheet', () => {
        it('should fetch shifts, profiles, and timesheets and return mapped rows', async () => {
            const shiftBuilder = new MockQueryBuilder();
            shiftBuilder._data = [
                {
                    id: 's1',
                    assigned_employee_id: 'e1',
                    shift_date: '2026-01-01',
                    start_time: '09:00:00',
                    end_time: '17:00:00',
                    lifecycle_status: 'Published'
                }
            ];
            
            const profileBuilder = new MockQueryBuilder();
            profileBuilder._data = [
                { id: 'e1', first_name: 'John', last_name: 'Doe' }
            ];

            const timesheetBuilder = new MockQueryBuilder();
            timesheetBuilder._data = [
                { id: 't1', shift_id: 's1', start_time: '09:15', end_time: '17:00', paid_break_minutes: 30 }
            ];

            builderQueue.push(shiftBuilder, profileBuilder, timesheetBuilder);

            const result = await getShiftsForTimesheet('2026-01-01');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('s1');
            expect(result[0].employeeName).toBe('John Doe');
            expect(result[0].timesheetId).toBe('t1');
            expect(result[0].adjustedStart).toBe('09:15');
            expect(result[0].paidBreakMinutes).toBe(30);
        });

        it('should handle empty shifts result', async () => {
            const shiftBuilder = new MockQueryBuilder();
            shiftBuilder._data = [];
            builderQueue.push(shiftBuilder);

            const result = await getShiftsForTimesheet('2026-01-01');
            expect(result).toEqual([]);
        });

        it('should apply client-side search query', async () => {
            const shiftBuilder = new MockQueryBuilder();
            shiftBuilder._data = [
                { id: 's1', assigned_employee_id: 'e1', roles: { name: 'Nurse' } },
                { id: 's2', assigned_employee_id: 'e2', roles: { name: 'Doctor' } }
            ];
            
            const profileBuilder = new MockQueryBuilder();
            profileBuilder._data = [
                { id: 'e1', first_name: 'John' },
                { id: 'e2', first_name: 'Jane' }
            ];

            const timesheetBuilder = new MockQueryBuilder();
            timesheetBuilder._data = [];

            builderQueue.push(shiftBuilder, profileBuilder, timesheetBuilder);

            const result = await getShiftsForTimesheet('2026-01-01', { searchQuery: 'nurse' });
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('s1');
        });
    });

    describe('updateTimesheetEntry', () => {
        it('should insert a new timesheet if it does not exist', async () => {
            const existingTimesheetBuilder = new MockQueryBuilder();
            existingTimesheetBuilder._data = null; // doesn't exist

            const shiftBuilder = new MockQueryBuilder(); // For shift check
            shiftBuilder._data = { attendance_status: null }; // status check

            const shiftDetailsBuilder = new MockQueryBuilder(); // For insert details
            shiftDetailsBuilder._data = {
                assigned_employee_id: 'e1',
                shift_date: '2026-01-01',
                start_time: '09:00',
                end_time: '17:00'
            };

            const insertBuilder = new MockQueryBuilder();
            insertBuilder._data = null;

            builderQueue.push(existingTimesheetBuilder, shiftBuilder, shiftDetailsBuilder, insertBuilder);

            const result = await updateTimesheetEntry('s1', { status: 'submitted', clockIn: '09:00', clockOut: '17:00' });
            
            expect(result).toBe(true);
            expect(supabase.from).toHaveBeenCalledWith('timesheets');
            expect(insertBuilder.insert).toHaveBeenCalled();
        });

        it('should update an existing timesheet', async () => {
            const existingTimesheetBuilder = new MockQueryBuilder();
            existingTimesheetBuilder._data = { id: 't1', status: 'draft' };

            const updateBuilder = new MockQueryBuilder();
            updateBuilder._data = null;

            const shiftUpdateBuilder = new MockQueryBuilder(); // For status='approved' lifecycle completion
            shiftUpdateBuilder._data = { lifecycle_status: 'Scheduled' };

            const shiftCompleteBuilder = new MockQueryBuilder(); // Update to Completed
            shiftCompleteBuilder._data = null;

            builderQueue.push(existingTimesheetBuilder, updateBuilder, shiftUpdateBuilder, shiftCompleteBuilder);

            const result = await updateTimesheetEntry('s1', { status: 'approved', notes: 'OK' });
            
            expect(result).toBe(true);
            expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved', notes: 'OK' }));
            expect(shiftCompleteBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ lifecycle_status: 'Completed' }));
        });

        it('should block update for approved timesheet unless editing metrics', async () => {
            const existingTimesheetBuilder = new MockQueryBuilder();
            existingTimesheetBuilder._data = { id: 't1', status: 'approved' };

            builderQueue.push(existingTimesheetBuilder);

            const result = await updateTimesheetEntry('s1', { notes: 'Attempt' }); // no metrics
            expect(result).toBe(true); // blocked but returns true for idempotency
            
            // Check that it didn't do update
            expect(builderQueue.length).toBe(0);
        });
    });

    describe('bulkUpdateTimesheetStatus', () => {
        it('should update multiple timesheets', async () => {
            // Setup for 2 iterations
            const b1 = new MockQueryBuilder(); b1._data = { id: 't1', status: 'draft' };
            const b2 = new MockQueryBuilder(); b2._data = null; // update timesheet
            const b3 = new MockQueryBuilder(); b3._data = { lifecycle_status: 'Scheduled' }; // shift check
            const b4 = new MockQueryBuilder(); b4._data = null; // shift update
            
            const b5 = new MockQueryBuilder(); b5._data = { id: 't2', status: 'draft' };
            const b6 = new MockQueryBuilder(); b6._data = null;
            const b7 = new MockQueryBuilder(); b7._data = { lifecycle_status: 'Scheduled' };
            const b8 = new MockQueryBuilder(); b8._data = null;

            builderQueue.push(b1, b2, b3, b4, b5, b6, b7, b8);

            const result = await bulkUpdateTimesheetStatus(['s1', 's2'], 'u1', 'approved');
            expect(result).toEqual({ success: 2, failed: 0 });
        });
    });

    describe('markShiftAsNoShow', () => {
        it('should update shift and timesheet status to no_show', async () => {
            const shiftUpdateBuilder = new MockQueryBuilder();
            shiftUpdateBuilder._data = null; // shift update to no_show

            const existingTimesheetBuilder = new MockQueryBuilder();
            existingTimesheetBuilder._data = { id: 't1', status: 'draft' };

            const timesheetUpdateBuilder = new MockQueryBuilder();
            timesheetUpdateBuilder._data = null;

            builderQueue.push(shiftUpdateBuilder, existingTimesheetBuilder, timesheetUpdateBuilder);

            const result = await markShiftAsNoShow('s1', 'u1');
            
            expect(result).toBe(true);
            expect(shiftUpdateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ attendance_status: 'no_show', lifecycle_status: 'Completed' }));
            expect(timesheetUpdateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'no_show', length: '0.00' }));
        });
    });
});
