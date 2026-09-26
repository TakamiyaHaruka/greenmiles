// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@/lib/types';
import { publishProductCatalogChanged } from '@/lib/productCatalogSync';
import { useProductCatalog } from './useProductCatalog';

const firstProduct: Product = {
  id: 1,
  name: '旧商品',
  description: '',
  category: 'virtual',
  mileage_cost: 100,
  stock: 5,
  icon_type: 'bike',
  project_name: '',
  project_standard: '',
  project_vintage: '',
};

function response(products: Product[], ok = true): Response {
  return { ok, json: async () => ({ data: products }) } as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe('useProductCatalog', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads initially and retains the last good list after a background failure', async () => {
    const failedRefresh = deferred<Response>();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([firstProduct]))
      .mockReturnValueOnce(failedRefresh.promise);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useProductCatalog());
    await waitFor(() => expect(result.current.products).toEqual([firstProduct]));

    act(() => publishProductCatalogChanged());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await act(async () => failedRefresh.resolve(response([], false)));

    expect(result.current.products).toEqual([firstProduct]);
    expect(result.current.loadError).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('allows retry after an initial failure', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([], false))
      .mockResolvedValueOnce(response([firstProduct]));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useProductCatalog());
    await waitFor(() => expect(result.current.loadError).toBe(true));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.products).toEqual([firstProduct]));
    expect(result.current.loadError).toBe(false);
  });

  it('refreshes and commits the latest catalog when the window regains focus', async () => {
    const updated = { ...firstProduct, stock: 2 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([firstProduct]))
      .mockResolvedValueOnce(response([updated]));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useProductCatalog());
    await waitFor(() => expect(result.current.products).toEqual([firstProduct]));

    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(result.current.products).toEqual([updated]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('times out a stalled initial request and exposes retry state', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      })
    )));

    const { result } = renderHook(() => useProductCatalog());
    await act(async () => vi.advanceTimersByTimeAsync(10_000));

    expect(result.current.loading).toBe(false);
    expect(result.current.loadError).toBe(true);
  });

  it('commits only the newest overlapping request', async () => {
    const older = deferred<Response>();
    const newest = deferred<Response>();
    const updated = { ...firstProduct, name: '最新商品', stock: 3 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([firstProduct]))
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newest.promise);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useProductCatalog());
    await waitFor(() => expect(result.current.products).toEqual([firstProduct]));

    act(() => {
      result.current.refresh();
      result.current.refresh();
    });
    await act(async () => newest.resolve(response([updated])));
    await waitFor(() => expect(result.current.products).toEqual([updated]));

    await act(async () => older.resolve(response([{ ...firstProduct, name: '迟到商品' }])));
    expect(result.current.products).toEqual([updated]);
  });
});
