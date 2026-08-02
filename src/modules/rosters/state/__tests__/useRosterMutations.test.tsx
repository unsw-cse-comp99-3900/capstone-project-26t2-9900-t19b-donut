import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as useRosterMutations from '../useRosterMutations';
import { supabase } from '@/platform/supabase/client';
import { fairnessLedgerService } from '@/modules/rosters/services/fairnessLedger.service';

vi.mock('@/platform/supabase/client', () => {
    const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
    };
    return {
        supabase: {
            rpc: vi.fn().mockResolvedValue({ data: { count: 1 }, error: null }),
            from: vi.fn(() => mockQueryBuilder)
        }
    };
});

vi.mock('@/modules/core/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/modules/rosters/services/fairnessLedger.service', () => ({
    fairnessLedgerService: {
        recomputeLedger: vi.fn().mockResolvedValue(true)
    }
}));

const VALID_UUID = '12345678-1234-1234-1234-123456789012';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
            mutations: {
                retry: false
            }
        },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

describe('useRosterMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('useAddSubGroup works', async () => {
        const { result } = renderHook(() => useRosterMutations.useAddSubGroup(), { wrapper: createWrapper() });
        result.current.mutate({ rosterGroupId: VALID_UUID, name: 'Test' });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(supabase.from).toHaveBeenCalledWith('roster_subgroups');
    });

    it('useAddSubGroupRange works', async () => {
        const { result } = renderHook(() => useRosterMutations.useAddSubGroupRange(), { wrapper: createWrapper() });
        result.current.mutate({
            organizationId: VALID_UUID, departmentId: VALID_UUID, subDepartmentId: VALID_UUID,
            groupExternalId: 'ext-1', name: 'Test', startDate: '2026-01-01', endDate: '2026-01-07'
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(supabase.rpc).toHaveBeenCalledWith('add_roster_subgroup_range', expect.any(Object));
    });

    it('useActivateRoster works', async () => {
        const { result } = renderHook(() => useRosterMutations.useActivateRoster(), { wrapper: createWrapper() });
        result.current.mutate({
            organizationId: VALID_UUID, departmentId: VALID_UUID, subDepartmentId: VALID_UUID,
            startDate: '2026-01-01', endDate: '2026-01-07'
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(supabase.rpc).toHaveBeenCalledWith('activate_roster_for_range', expect.any(Object));
    });

    it('useCreatePlanningPeriod works', async () => {
        const { result } = renderHook(() => useRosterMutations.useCreatePlanningPeriod(), { wrapper: createWrapper() });
        result.current.mutate({
            organizationId: VALID_UUID, departmentId: VALID_UUID, subDeptIds: [VALID_UUID],
            startDate: '2026-01-01', endDate: '2026-01-07'
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(supabase.rpc).toHaveBeenCalledWith('create_planning_period', expect.any(Object));
    });

    it('useToggleRosterLock works', async () => {
        const { result } = renderHook(() => useRosterMutations.useToggleRosterLock(), { wrapper: createWrapper() });
        result.current.mutate({
            organizationId: VALID_UUID, departmentId: VALID_UUID, subDepartmentId: VALID_UUID,
            startDate: '2026-01-01', endDate: '2026-01-07', isLocked: true
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(supabase.rpc).toHaveBeenCalledWith('toggle_roster_lock_for_range', expect.any(Object), expect.any(Object));
    });

    it('usePublishRoster works', async () => {
        const { result } = renderHook(() => useRosterMutations.usePublishRoster(), { wrapper: createWrapper() });
        result.current.mutate({
            organizationId: VALID_UUID, departmentId: VALID_UUID, subDepartmentId: VALID_UUID,
            startDate: '2026-01-01', endDate: '2026-01-07'
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(supabase.rpc).toHaveBeenCalledWith('publish_roster_for_range', expect.any(Object));
        expect(fairnessLedgerService.recomputeLedger).toHaveBeenCalled();
    });

    it('useApplyTemplate works', async () => {
        const { result } = renderHook(() => useRosterMutations.useApplyTemplate(), { wrapper: createWrapper() });
        result.current.mutate({
            templateId: VALID_UUID, startDate: '2026-01-01', endDate: '2026-01-07',
            userId: VALID_UUID, source: 'templates_page'
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(supabase.rpc).toHaveBeenCalledWith('apply_template_to_date_range_v2', expect.any(Object));
    });

    it('useClearTemplate works', async () => {
        const { result } = renderHook(() => useRosterMutations.useClearTemplate(), { wrapper: createWrapper() });
        result.current.mutate({
            rosterId: VALID_UUID, templateId: VALID_UUID, userId: VALID_UUID
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(supabase.rpc).toHaveBeenCalledWith('sm_clear_template_application', expect.any(Object));
    });

    it('useDeleteSubGroup works', async () => {
        const { result } = renderHook(() => useRosterMutations.useDeleteSubGroup(), { wrapper: createWrapper() });
        result.current.mutate({
            orgId: VALID_UUID, deptId: VALID_UUID, groupExternalId: 'ext-1',
            name: 'Test', startDate: '2026-01-01', endDate: '2026-01-07'
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(supabase.rpc).toHaveBeenCalledWith('delete_roster_subgroup_v2', expect.any(Object));
    });

    it('useRenameSubGroup works', async () => {
        const { result } = renderHook(() => useRosterMutations.useRenameSubGroup(), { wrapper: createWrapper() });
        result.current.mutate({
            orgId: VALID_UUID, deptId: VALID_UUID, groupExternalId: 'ext-1',
            oldName: 'Old', newName: 'New', startDate: '2026-01-01', endDate: '2026-01-07'
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(supabase.rpc).toHaveBeenCalledWith('rename_roster_subgroup_v2', expect.any(Object));
    });

    it('useCloneSubGroup works', async () => {
        const { result } = renderHook(() => useRosterMutations.useCloneSubGroup(), { wrapper: createWrapper() });
        result.current.mutate({
            orgId: VALID_UUID, deptId: VALID_UUID, groupExternalId: 'ext-1',
            sourceName: 'Source', newName: 'New', startDate: '2026-01-01', endDate: '2026-01-07'
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(supabase.rpc).toHaveBeenCalledWith('clone_roster_subgroup_v2', expect.any(Object));
    });
});
