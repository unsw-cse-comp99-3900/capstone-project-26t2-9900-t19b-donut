import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useBroadcastGroups, useEmployeeBroadcastGroups, useBroadcastGroup, useBroadcasts, useEmployeeBroadcasts, useBroadcastNotifications } from '../useBroadcasts';

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn().mockReturnValue({ data: [], isLoading: false }),
    useMutation: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
    useQueryClient: vi.fn().mockReturnValue({ 
        invalidateQueries: vi.fn(),
        getQueryData: vi.fn().mockReturnValue([])
    })
}));

vi.mock('@/platform/auth/useAuth', () => ({
    useAuth: vi.fn().mockReturnValue({ user: { id: 'u1' } })
}));

describe('useBroadcasts hooks', () => {
    it('useBroadcastGroups works', () => {
        const { result } = renderHook(() => useBroadcastGroups());
        expect(result.current).toBeDefined();
    });

    it('useEmployeeBroadcastGroups works', () => {
        const { result } = renderHook(() => useEmployeeBroadcastGroups());
        expect(result.current).toBeDefined();
    });

    it('useBroadcastGroup works', () => {
        const { result } = renderHook(() => useBroadcastGroup('1'));
        expect(result.current).toBeDefined();
    });

    it('useBroadcasts works', () => {
        const { result } = renderHook(() => useBroadcasts('1'));
        expect(result.current).toBeDefined();
    });

    it('useEmployeeBroadcasts works', () => {
        const { result } = renderHook(() => useEmployeeBroadcasts('1'));
        expect(result.current).toBeDefined();
    });

    it('useBroadcastNotifications works', () => {
        const { result } = renderHook(() => useBroadcastNotifications());
        expect(result.current).toBeDefined();
    });
});
