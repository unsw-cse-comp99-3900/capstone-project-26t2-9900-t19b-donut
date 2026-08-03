import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/platform/supabase/client';
import { useAuth } from '@/platform/auth/useAuth';
import { useOfflineAwareQuery } from '@/platform/offline/useOfflineAwareQuery';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  entity_id: string | null;
  entity_type: string | null;
  read_at: string | null;
  created_at: string;
};

const DEEP_LINK_MAP: Record<string, string> = {
  shift_assigned:          '/my-roster',
  shift_cancelled:         '/my-roster',
  shift_updated:           '/my-roster',
  shift_dropped:           '/management/bids',
  emergency_assignment:    '/my-roster',
  bid_accepted:            '/my-bids',
  bid_rejected:            '/my-bids',
  bid_no_winner:           '/management/bids',
  offer_expired:           '/my-roster',
  swap_request:            '/my-swaps',
  swap_approved:           '/my-swaps',
  swap_rejected:           '/my-swaps',
  swap_expired:            '/my-swaps',
  broadcast:               '/my-broadcasts',
  timesheet_approved:      '/timesheet',
  timesheet_rejected:      '/timesheet',
};

export function resolveNotificationLink(n: AppNotification): string {
  return n.link ?? DEEP_LINK_MAP[n.type] ?? '/my-roster';
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const notificationKeys = {
  forUser: (userId: string) => ['notifications', 'forUser', userId] as const,
};

async function fetchUserNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, message, link, entity_id, entity_type, read_at, created_at')
    .eq('profile_id', userId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data as AppNotification[]) ?? [];
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Local-only "seen" state — no DB round-trip needed
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const query = useOfflineAwareQuery<AppNotification[]>({
    queryKey: notificationKeys.forUser(user?.id ?? ''),
    queryFn: () => fetchUserNotifications(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const isOffline = query.isOffline;
  const rawNotifications = query.data ?? [];

  // Realtime subscription
  useEffect(() => {
    if (!user?.id || isOffline) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = payload.new as AppNotification;
          queryClient.setQueryData<AppNotification[]>(notificationKeys.forUser(user.id), (prev = []) => {
            // Map-based dedup: handles initial fetch overlap + backend retries
            const map = new Map(prev.map((n) => [n.id, n]));
            if (map.has(incoming.id)) return prev;
            map.set(incoming.id, incoming);
            return Array.from(map.values())
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, 50);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.setQueryData<AppNotification[]>(notificationKeys.forUser(user.id), (prev = []) =>
            prev.map((n) => (n.id === payload.new.id ? (payload.new as AppNotification) : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOffline, queryClient, user?.id]);

  // Auto-clean: hide read notifications older than 7 days from the displayed list
  const notifications = useMemo(() => {
    const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
    return rawNotifications.filter(
      (n) => !n.read_at || n.created_at >= cutoff
    );
  }, [rawNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  // Mark visible unread notifications as "seen" (local state only — no DB write)
  const markSeen = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setSeenIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const markRead = useCallback(async (id: string) => {
    if (isOffline) return;
    const now = new Date().toISOString();
    await supabase.from('notifications').update({ read_at: now }).eq('id', id);
    queryClient.setQueryData<AppNotification[]>(notificationKeys.forUser(user?.id ?? ''), (prev = []) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
    );
  }, [isOffline, queryClient, user?.id]);

  const markAllRead = useCallback(async () => {
    if (isOffline) return;
    if (!user?.id) return;
    const now = new Date().toISOString();
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('profile_id', user.id)
      .is('read_at', null);
    queryClient.setQueryData<AppNotification[]>(notificationKeys.forUser(user.id), (prev = []) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: now }))
    );
  }, [isOffline, queryClient, user?.id]);

  const dismiss = useCallback(async (id: string) => {
    if (isOffline) return;
    await supabase
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', id);
    queryClient.setQueryData<AppNotification[]>(notificationKeys.forUser(user?.id ?? ''), (prev = []) =>
      prev.filter((n) => n.id !== id)
    );
  }, [isOffline, queryClient, user?.id]);

  return {
    notifications,
    unreadCount,
    loading: query.offlineState === 'offline-empty' ? false : query.isPending || query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    isOffline,
    isShowingCachedData: query.isShowingCachedData,
    offlineState: query.offlineState,
    dataUpdatedAt: query.dataUpdatedAt,
    seenIds,
    markSeen,
    markRead,
    markAllRead,
    dismiss,
  };
}
