import {
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useOnlineStatus } from './useOnlineStatus';

export type OfflineQueryState = 'online' | 'offline-with-cache' | 'offline-empty';

type OfflineAwareQueryResult<TData, TError> = UseQueryResult<TData, TError> & {
  isOffline: boolean;
  hasCachedData: boolean;
  isShowingCachedData: boolean;
  offlineState: OfflineQueryState;
};

export function useOfflineAwareQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError, TData, QueryKey>,
): OfflineAwareQueryResult<TData, TError> {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const resolvedEnabled = options.enabled ?? true;
  const cachedData = queryClient.getQueryData<TData>(options.queryKey);
  const hasCachedData = cachedData !== undefined;

  const query = useQuery<TData, TError, TData, QueryKey>({
    ...options,
    enabled: resolvedEnabled && !isOffline,
    initialData: isOffline ? options.initialData ?? cachedData : options.initialData,
  });

  const isShowingCachedData = isOffline && query.data !== undefined;
  const offlineState: OfflineQueryState = !isOffline
    ? 'online'
    : isShowingCachedData
      ? 'offline-with-cache'
      : 'offline-empty';

  return {
    ...query,
    isOffline,
    hasCachedData,
    isShowingCachedData,
    offlineState,
  };
}
