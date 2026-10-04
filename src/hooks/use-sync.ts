import { useSyncExternalStore } from 'react';

import { getSyncState, subscribeSync, type SyncState } from '@/services/sync/sync-service';

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribeSync, getSyncState);
}
