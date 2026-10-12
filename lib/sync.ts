'use client';

export interface StoreSyncEvent {
  type: 'product_created' | 'product_updated' | 'product_deleted' | 'settings_updated' | 'orders_updated' | 'sync_refresh';
  id?: string;
  timestamp: number;
}

const SYNC_CHANNEL_NAME = 'kennys_palm_oil_sync_channel';
const SYNC_EVENT_NAME = 'kennys_palm_oil_sync_event';
const SYNC_STORAGE_KEY = 'kennys_palm_oil_last_sync';

/**
 * Broadcasts a database mutation event across all components, tabs, and windows.
 */
export function broadcastStoreChange(type: StoreSyncEvent['type'], id?: string): void {
  if (typeof window === 'undefined') return;

  const eventData: StoreSyncEvent = {
    type,
    id,
    timestamp: Date.now(),
  };

  // 1. Same-window custom event dispatch
  try {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: eventData }));
  } catch (e) {
    console.debug('Window sync dispatch note:', e);
  }

  // 2. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.postMessage(eventData);
      channel.close();
    }
  } catch (e) {
    console.debug('BroadcastChannel sync note:', e);
  }

  // 3. Fallback cross-tab localStorage trigger
  try {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(eventData));
  } catch (e) {
    // Ignore storage quota or privacy restrictions
  }
}

/**
 * Subscribes to database change broadcasts from any tab, window, or dashboard operation.
 */
export function subscribeToStoreChanges(onSync: (event: StoreSyncEvent) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // 1. Window custom event
  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<StoreSyncEvent>;
    if (customEvent.detail) {
      onSync(customEvent.detail);
    } else {
      onSync({ type: 'sync_refresh', timestamp: Date.now() });
    }
  };
  window.addEventListener(SYNC_EVENT_NAME, handleCustomEvent);

  // 2. BroadcastChannel
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<StoreSyncEvent>) => {
        if (event.data) {
          onSync(event.data);
        }
      };
    } catch (e) {
      console.debug('BroadcastChannel listener note:', e);
    }
  }

  // 3. LocalStorage storage event
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SYNC_STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as StoreSyncEvent;
        onSync(parsed);
      } catch {
        onSync({ type: 'sync_refresh', timestamp: Date.now() });
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(SYNC_EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (channel) {
      try {
        channel.close();
      } catch {}
    }
  };
}
