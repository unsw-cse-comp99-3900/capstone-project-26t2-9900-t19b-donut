import type { QueryClient } from '@tanstack/react-query';
import {
  persistQueryClient,
  type PersistedClient,
  type Persister,
} from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';

const OFFLINE_QUERY_CACHE_KEY = 'shiftopia-react-query-offline-cache-v1';
const OFFLINE_QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60_000;

function isEmployeeRosterQuery(queryKey: readonly unknown[]) {
  return queryKey[0] === 'shifts' && queryKey[1] === 'list' && queryKey[2] === 'byEmployee';
}

function isEmployeeBroadcastGroupsQuery(queryKey: readonly unknown[]) {
  return queryKey[0] === 'broadcasts' && queryKey[1] === 'groups' && queryKey[2] === 'employee';
}

function isEmployeeBroadcastMessagesQuery(queryKey: readonly unknown[]) {
  return (
    queryKey[0] === 'broadcasts' &&
    queryKey[1] === 'messages' &&
    queryKey[2] === 'byChannel' &&
    queryKey[4] === 'employee'
  );
}

function isUserNotificationsQuery(queryKey: readonly unknown[]) {
  return queryKey[0] === 'notifications' && queryKey[1] === 'forUser';
}

export function shouldPersistOfflineQuery(queryKey: readonly unknown[]) {
  return (
    isEmployeeRosterQuery(queryKey) ||
    isEmployeeBroadcastGroupsQuery(queryKey) ||
    isEmployeeBroadcastMessagesQuery(queryKey) ||
    isUserNotificationsQuery(queryKey)
  );
}

function createIndexedDbPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(OFFLINE_QUERY_CACHE_KEY, client);
    },
    restoreClient: async () => {
      return (await get<PersistedClient>(OFFLINE_QUERY_CACHE_KEY)) ?? undefined;
    },
    removeClient: async () => {
      await del(OFFLINE_QUERY_CACHE_KEY);
    },
  };
}

let isPersistenceReady = false;

export function setupOfflineQueryPersistence(queryClient: QueryClient) {
  if (typeof window === 'undefined' || isPersistenceReady) return;

  isPersistenceReady = true;

  void persistQueryClient({
    queryClient,
    persister: createIndexedDbPersister(),
    maxAge: OFFLINE_QUERY_CACHE_MAX_AGE_MS,
    buster: 'offline-roster-cache-v1',
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.state.status === 'success' && shouldPersistOfflineQuery(query.queryKey),
    },
  });
}

export async function clearOfflineQueryCache() {
  await del(OFFLINE_QUERY_CACHE_KEY);
}
