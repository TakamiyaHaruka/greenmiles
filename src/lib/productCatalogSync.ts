const PRODUCT_CATALOG_EVENT = 'greenmiles:product-catalog-changed';
const PRODUCT_CATALOG_STORAGE_KEY = 'greenmiles:product-catalog-revision';

export type ProductCatalogInvalidationSource = 'event' | 'storage' | 'focus';

export function publishProductCatalogChanged(): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event(PRODUCT_CATALOG_EVENT));

  try {
    window.localStorage.setItem(
      PRODUCT_CATALOG_STORAGE_KEY,
      `${Date.now()}:${Math.random().toString(36).slice(2)}`,
    );
  } catch {
    // Same-page listeners still receive the custom event when storage is unavailable.
  }
}

export function subscribeToProductCatalogChanges(
  listener: (source: ProductCatalogInvalidationSource) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleEvent = () => listener('event');
  const handleStorage = (event: StorageEvent) => {
    if (event.key === PRODUCT_CATALOG_STORAGE_KEY) listener('storage');
  };
  let lastFocusNotificationAt = Number.NEGATIVE_INFINITY;
  const handleFocus = () => {
    const now = Date.now();
    if (now - lastFocusNotificationAt < 100) return;
    lastFocusNotificationAt = now;
    listener('focus');
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') handleFocus();
  };

  window.addEventListener(PRODUCT_CATALOG_EVENT, handleEvent);
  window.addEventListener('storage', handleStorage);
  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.removeEventListener(PRODUCT_CATALOG_EVENT, handleEvent);
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

export const productCatalogSyncTestIds = {
  event: PRODUCT_CATALOG_EVENT,
  storageKey: PRODUCT_CATALOG_STORAGE_KEY,
} as const;
