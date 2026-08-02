import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as useRosterShifts from '../useRosterShifts';
import { shiftsQueries } from '../../api/shifts.queries';
import { shiftsCommands } from '../../api/shifts.commands';

// Mock API layer
vi.mock('../../api/shifts.queries', () => ({
    shiftsQueries: {
        getShiftsForDate: vi.fn().mockResolvedValue([{ id: 'shift-1' }]),
        getShiftsForDateRange: vi.fn().mockResolvedValue([{ id: 'shift-1' }]),
        getEmployeeShifts: vi.fn().mockResolvedValue([{ id: 'shift-1' }]),
        getShiftById: vi.fn().mockResolvedValue({ id: 'shift-1', shift_date: '2026-01-01' }),
        getPendingOfferCount: vi.fn().mockResolvedValue(5),
        getMyOffers: vi.fn().mockResolvedValue([]),
        getMyOfferHistory: vi.fn().mockResolvedValue([]),
        getOrganizations: vi.fn().mockResolvedValue([]),
        getDepartments: vi.fn().mockResolvedValue([]),
        getSubDepartments: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getEmployees: vi.fn().mockResolvedValue([]),
        getTemplates: vi.fn().mockResolvedValue([]),
        getRemunerationLevels: vi.fn().mockResolvedValue([]),
        getSkills: vi.fn().mockResolvedValue([]),
        getLicenses: vi.fn().mockResolvedValue([]),
        getEvents: vi.fn().mockResolvedValue([]),
        getRosters: vi.fn().mockResolvedValue([]),
        getPlanningPeriods: vi.fn().mockResolvedValue([]),
        getRosterStructure: vi.fn().mockResolvedValue([]),
    }
}));

vi.mock('../../api/shifts.commands', () => ({
    shiftsCommands: {
        createShift: vi.fn().mockResolvedValue({ id: 'new-shift' }),
        updateShift: vi.fn().mockResolvedValue({ id: 'updated-shift' }),
        deleteShift: vi.fn().mockResolvedValue(true),
        bulkAssignShifts: vi.fn().mockResolvedValue({ success: true }),
        bulkUnassignShifts: vi.fn().mockResolvedValue([]),
        publishShift: vi.fn().mockResolvedValue({ success: true }),
        unpublishShift: vi.fn().mockResolvedValue({ success: true }),
        bulkUnpublishShifts: vi.fn().mockResolvedValue({ unpublishedIds: ['1'], failed: [] }),
        bulkPublishShifts: vi.fn().mockResolvedValue({ publishedIds: ['1'], complianceFailed: [], dbFailed: [] }),
        bulkDeleteShiftsPerItem: vi.fn().mockResolvedValue({ deletedIds: ['1'], failed: [] }),
    }
}));

vi.mock('@/modules/core/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/platform/supabase/client', () => ({
    supabase: {}
}));

const VALID_UUID = '12345678-1234-1234-1234-123456789012';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

describe('useRosterShifts queries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('useShiftsByDate fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useShiftsByDate(VALID_UUID, '2026-01-01'), {
            wrapper: createWrapper()
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([{ id: 'shift-1' }]);
    });

    it('useShiftsByDateRange fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useShiftsByDateRange(VALID_UUID, '2026-01-01', '2026-01-07'), {
            wrapper: createWrapper()
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([{ id: 'shift-1' }]);
    });

    it('useEmployeeShifts fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useEmployeeShifts(VALID_UUID, '2026-01-01', '2026-01-07'), {
            wrapper: createWrapper()
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([{ id: 'shift-1' }]);
    });

    it('useShiftDetail fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useShiftDetail(VALID_UUID), {
            wrapper: createWrapper()
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({ id: 'shift-1', shift_date: '2026-01-01' });
    });

    it('usePendingOfferCount fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.usePendingOfferCount(VALID_UUID), {
            wrapper: createWrapper()
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe(5);
    });

    it('useOrganizations fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useOrganizations(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it('useDepartments fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useDepartments(VALID_UUID), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useSubDepartments fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useSubDepartments(VALID_UUID), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useRoles fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useRoles(VALID_UUID), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useEmployees fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useEmployees(VALID_UUID), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useTemplates fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useTemplates(VALID_UUID), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useRemunerationLevels fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useRemunerationLevels(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useSkills fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useSkills(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useLicenses fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useLicenses(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useEvents fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useEvents(VALID_UUID), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useRostersLookup fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useRostersLookup(VALID_UUID), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('usePlanningPeriods fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.usePlanningPeriods(VALID_UUID), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useRosterStructure fetches successfully', async () => {
        const { result } = renderHook(() => useRosterShifts.useRosterStructure(VALID_UUID), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
});

describe('useRosterShifts mutations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('useCreateShift works', async () => {
        const { result } = renderHook(() => useRosterShifts.useCreateShift(), { wrapper: createWrapper() });
        result.current.mutate({ roster_id: VALID_UUID } as any);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shiftsCommands.createShift).toHaveBeenCalled();
    });

    it('useUpdateShift works', async () => {
        const { result } = renderHook(() => useRosterShifts.useUpdateShift(), { wrapper: createWrapper() });
        result.current.mutate({ shiftId: VALID_UUID, updates: { start_time: '10:00' } } as any);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shiftsCommands.updateShift).toHaveBeenCalled();
    });

    it('useDeleteShift works', async () => {
        const { result } = renderHook(() => useRosterShifts.useDeleteShift(), { wrapper: createWrapper() });
        result.current.mutate(VALID_UUID);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shiftsCommands.deleteShift).toHaveBeenCalled();
    });

    it('useBulkAssignShifts works', async () => {
        const { result } = renderHook(() => useRosterShifts.useBulkAssignShifts(), { wrapper: createWrapper() });
        result.current.mutate({ employeeId: VALID_UUID, shiftIds: [VALID_UUID] });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shiftsCommands.bulkAssignShifts).toHaveBeenCalled();
    });

    it('useBulkUnassignShifts works', async () => {
        const { result } = renderHook(() => useRosterShifts.useBulkUnassignShifts(), { wrapper: createWrapper() });
        result.current.mutate([VALID_UUID]);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shiftsCommands.bulkUnassignShifts).toHaveBeenCalled();
    });

    it('usePublishShift works', async () => {
        const { result } = renderHook(() => useRosterShifts.usePublishShift(), { wrapper: createWrapper() });
        result.current.mutate(VALID_UUID);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shiftsCommands.publishShift).toHaveBeenCalled();
    });

    it('useUnpublishShift works', async () => {
        const { result } = renderHook(() => useRosterShifts.useUnpublishShift(), { wrapper: createWrapper() });
        result.current.mutate({ shiftId: VALID_UUID });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shiftsCommands.unpublishShift).toHaveBeenCalled();
    });

    it('useBulkUnpublishShifts works', async () => {
        const { result } = renderHook(() => useRosterShifts.useBulkUnpublishShifts(), { wrapper: createWrapper() });
        result.current.mutate([VALID_UUID]);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shiftsCommands.bulkUnpublishShifts).toHaveBeenCalled();
    });

    it('useBulkPublishShifts works', async () => {
        const { result } = renderHook(() => useRosterShifts.useBulkPublishShifts(), { wrapper: createWrapper() });
        result.current.mutate([VALID_UUID]);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shiftsCommands.bulkPublishShifts).toHaveBeenCalled();
    });

    it('useBulkDeleteShifts works', async () => {
        const { result } = renderHook(() => useRosterShifts.useBulkDeleteShifts(), { wrapper: createWrapper() });
        result.current.mutate([VALID_UUID]);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shiftsCommands.bulkDeleteShiftsPerItem).toHaveBeenCalled();
    });
});
