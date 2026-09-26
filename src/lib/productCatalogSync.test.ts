// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  productCatalogSyncTestIds,
  publishProductCatalogChanged,
  subscribeToProductCatalogChanges,
} from './productCatalogSync';

describe('product catalog synchronization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('notifies the current page and writes a unique cross-tab revision', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToProductCatalogChanges(listener);

    publishProductCatalogChanged();

    expect(listener).toHaveBeenCalledWith('event');
    expect(window.localStorage.getItem(productCatalogSyncTestIds.storageKey)).toMatch(/^\d+:/);
    unsubscribe();
  });

  it('listens for matching storage events, focus and visible-tab returns', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToProductCatalogChanges(listener);

    window.dispatchEvent(new StorageEvent('storage', {
      key: productCatalogSyncTestIds.storageKey,
      newValue: 'new-revision',
    }));
    window.dispatchEvent(new Event('focus'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(listener.mock.calls).toEqual([['storage'], ['focus']]);

    unsubscribe();
    window.dispatchEvent(new Event(productCatalogSyncTestIds.event));
    window.dispatchEvent(new StorageEvent('storage', { key: productCatalogSyncTestIds.storageKey }));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('still emits the same-page event when localStorage is unavailable', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToProductCatalogChanges(listener);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(() => publishProductCatalogChanged()).not.toThrow();
    expect(listener).toHaveBeenCalledWith('event');
    unsubscribe();
  });
});
