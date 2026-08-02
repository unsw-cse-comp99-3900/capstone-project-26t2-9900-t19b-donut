import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCreateShift, useUpdateShift, useDeleteShift, useBulkAssignShifts, useBulkUnassignShifts, usePublishShift, useUnpublishShift, useBulkUnpublishShifts, useBulkPublishShifts, useBulkDeleteShifts, useBulkUpdateShiftTimes, useDropShift, useExpireOffer, useAcceptOffer, useDeclineOffer, useCancelShift, useRequestTrade } from '../useRosterShifts';

vi.mock('@tanstack/react-query', () => ({
    useMutation: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
    useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn(), getQueriesData: vi.fn().mockReturnValue([]) })
}));

vi.mock('@/modules/core/hooks/use-toast', () => ({
    useToast: vi.fn().mockReturnValue({ toast: vi.fn() })
}));

describe('useRosterMutations', () => {
    it('all mutations hook works', () => {
        expect(renderHook(() => useCreateShift()).result.current).toBeDefined();
        expect(renderHook(() => useUpdateShift()).result.current).toBeDefined();
        expect(renderHook(() => useDeleteShift()).result.current).toBeDefined();
        expect(renderHook(() => useBulkAssignShifts()).result.current).toBeDefined();
        expect(renderHook(() => useBulkUnassignShifts()).result.current).toBeDefined();
        expect(renderHook(() => usePublishShift()).result.current).toBeDefined();
        expect(renderHook(() => useUnpublishShift()).result.current).toBeDefined();
        expect(renderHook(() => useBulkUnpublishShifts()).result.current).toBeDefined();
        expect(renderHook(() => useBulkPublishShifts()).result.current).toBeDefined();
        expect(renderHook(() => useBulkDeleteShifts()).result.current).toBeDefined();
        expect(renderHook(() => useBulkUpdateShiftTimes()).result.current).toBeDefined();
        expect(renderHook(() => useDropShift()).result.current).toBeDefined();
        expect(renderHook(() => useExpireOffer()).result.current).toBeDefined();
        expect(renderHook(() => useAcceptOffer()).result.current).toBeDefined();
        expect(renderHook(() => useDeclineOffer()).result.current).toBeDefined();
        expect(renderHook(() => useCancelShift()).result.current).toBeDefined();
        expect(renderHook(() => useRequestTrade()).result.current).toBeDefined();
    });
});
