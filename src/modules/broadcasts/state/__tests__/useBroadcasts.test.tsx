import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBroadcastGroups, useBroadcastGroup, useBroadcasts, useEmployeeBroadcasts, useEmployeeBroadcastGroups, useBroadcastNotifications } from '../useBroadcasts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/platform/auth/useAuth', () => ({
    useAuth: vi.fn().mockReturnValue({ user: { id: 'u1', role: 'admin' } })
}));

vi.mock('@/modules/core/hooks/use-toast', () => ({
    useToast: vi.fn().mockReturnValue({ toast: vi.fn() })
}));

const mockQueryClient = {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    cancelQueries: vi.fn()
};

vi.mock('@tanstack/react-query', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        useQueryClient: vi.fn(() => mockQueryClient)
    };
});

vi.mock('@/platform/offline/useOfflineAwareQuery', () => ({
    useOfflineAwareQuery: vi.fn((opts: any) => {
        // Evaluate the queryFn so it counts as called
        if (opts.queryFn) opts.queryFn();
        return {
            data: [],
            isPending: false,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isOffline: false,
            isShowingCachedData: false,
            offlineState: 'online'
        };
    })
}));

const mocks = vi.hoisted(() => {
    return {
        mockGroupQueries: {
            getAll: vi.fn().mockResolvedValue([{ id: 'g1', name: 'Group 1' }]),
            getForEmployee: vi.fn().mockResolvedValue([]),
            getById: vi.fn().mockResolvedValue({ id: 'g1', name: 'Group 1' })
        },
        mockGroupCommands: {
            create: vi.fn().mockResolvedValue({ id: 'g2' }),
            update: vi.fn().mockResolvedValue({}),
            delete: vi.fn().mockResolvedValue({})
        },
        mockChannelCommands: {
            create: vi.fn().mockResolvedValue({ id: 'c1' }),
            delete: vi.fn().mockResolvedValue({})
        },
        mockParticipantCommands: {
            add: vi.fn().mockResolvedValue({}),
            remove: vi.fn().mockResolvedValue({}),
            updateRole: vi.fn().mockResolvedValue({})
        },
        mockParticipantQueries: {
            getUserRole: vi.fn().mockResolvedValue('admin')
        },
        mockBroadcastQueries: {
            getByChannelId: vi.fn().mockResolvedValue({ data: [{ id: 'b1', isPinned: true }, { id: 'b2', isPinned: false }], totalPages: 1 }),
            getForEmployee: vi.fn().mockResolvedValue({ data: [], totalPages: 1 })
        },
        mockBroadcastCommands: {
            create: vi.fn().mockResolvedValue({}),
            delete: vi.fn().mockResolvedValue({}),
            togglePin: vi.fn().mockResolvedValue({})
        },
        mockNotificationQueries: {
            getForUser: vi.fn().mockResolvedValue([{ id: 'n1', isRead: false }])
        },
        mockNotificationCommands: {
            markAsRead: vi.fn().mockResolvedValue({}),
            markAllAsRead: vi.fn().mockResolvedValue({})
        },
        mockRealtimeService: {
            subscribeToChannel: vi.fn().mockReturnValue('sub1'),
            subscribeToNotifications: vi.fn().mockReturnValue('sub2'),
            unsubscribe: vi.fn()
        }
    };
});

vi.mock('../../api/broadcasts.api', () => ({
    broadcastGroupQueries: mocks.mockGroupQueries,
    broadcastGroupCommands: mocks.mockGroupCommands,
    broadcastChannelCommands: mocks.mockChannelCommands,
    groupParticipantCommands: mocks.mockParticipantCommands,
    groupParticipantQueries: mocks.mockParticipantQueries,
    broadcastQueries: mocks.mockBroadcastQueries,
    broadcastCommands: mocks.mockBroadcastCommands,
    broadcastNotificationQueries: mocks.mockNotificationQueries,
    broadcastNotificationCommands: mocks.mockNotificationCommands,
    broadcastRealtimeService: mocks.mockRealtimeService
}));

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
        {children}
    </QueryClientProvider>
);

describe('useBroadcasts hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    describe('useBroadcastGroups', () => {
        it('should fetch and return groups', async () => {
            const { result, waitForNextUpdate } = renderHook(() => useBroadcastGroups(), { wrapper });
            
            // Wait for the query to resolve
            await vi.waitFor(() => {
                expect(result.current.groups).toHaveLength(1);
            });
            
            expect(mocks.mockGroupQueries.getAll).toHaveBeenCalled();
        });

        it('should provide mutations', async () => {
            const { result } = renderHook(() => useBroadcastGroups(), { wrapper });
            
            await act(async () => {
                await result.current.createGroup({ name: 'Test' } as any);
            });
            
            expect(mocks.mockGroupCommands.create).toHaveBeenCalled();
            expect(mockQueryClient.invalidateQueries).toHaveBeenCalled();
        });
    });

    describe('useEmployeeBroadcastGroups', () => {
        it('should call getForEmployee', () => {
            renderHook(() => useEmployeeBroadcastGroups(), { wrapper });
            expect(mocks.mockGroupQueries.getForEmployee).toHaveBeenCalled();
        });
    });

    describe('useBroadcastGroup', () => {
        it('should fetch group details and role', async () => {
            const { result } = renderHook(() => useBroadcastGroup('g1'), { wrapper });
            
            await vi.waitFor(() => {
                expect(result.current.group).toEqual({ id: 'g1', name: 'Group 1' });
                expect(result.current.userRole).toBe('admin');
            });
            
            expect(result.current.canManage).toBe(true);
            expect(result.current.canBroadcast).toBe(true);
        });

        it('should provide mutations for channels and participants', async () => {
            const { result } = renderHook(() => useBroadcastGroup('g1'), { wrapper });
            
            await act(async () => {
                await result.current.createChannel({ name: 'C1' } as any);
                await result.current.addParticipant('e1');
            });
            
            expect(mocks.mockChannelCommands.create).toHaveBeenCalled();
            expect(mocks.mockParticipantCommands.add).toHaveBeenCalled();
        });
    });

    describe('useBroadcasts', () => {
        it('should fetch broadcasts by channel and subscribe', async () => {
            const { result, unmount } = renderHook(() => useBroadcasts('c1'), { wrapper });
            
            await vi.waitFor(() => {
                expect(result.current.broadcasts).toHaveLength(2);
            });
            
            expect(mocks.mockBroadcastQueries.getByChannelId).toHaveBeenCalled();
            expect(mocks.mockRealtimeService.subscribeToChannel).toHaveBeenCalled();
            
            expect(result.current.pinnedBroadcasts).toHaveLength(1);
            expect(result.current.activeBroadcasts).toHaveLength(1);

            unmount();
            expect(mocks.mockRealtimeService.unsubscribe).toHaveBeenCalled();
        });
    });

    describe('useEmployeeBroadcasts', () => {
        it('should call getForEmployee', () => {
            renderHook(() => useEmployeeBroadcasts('c1'), { wrapper });
            expect(mocks.mockBroadcastQueries.getForEmployee).toHaveBeenCalled();
        });
    });

    describe('useBroadcastNotifications', () => {
        it('should fetch notifications and subscribe', async () => {
            const { result, unmount } = renderHook(() => useBroadcastNotifications(), { wrapper });
            
            await vi.waitFor(() => {
                expect(result.current.notifications).toHaveLength(1);
            });
            
            expect(result.current.unreadCount).toBe(1);
            expect(mocks.mockNotificationQueries.getForUser).toHaveBeenCalled();
            expect(mocks.mockRealtimeService.subscribeToNotifications).toHaveBeenCalled();

            await act(async () => {
                await result.current.markAllAsRead();
            });
            
            expect(mocks.mockNotificationCommands.markAllAsRead).toHaveBeenCalled();

            unmount();
            expect(mocks.mockRealtimeService.unsubscribe).toHaveBeenCalled();
        });
    });
});
