// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@/lib/types';
import { publishProductCatalogChanged } from '@/lib/productCatalogSync';
import { useProductCatalog } from './useProductCatalog';
import { useCartStore } from '@/stores/cartStore';

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
    useCartStore.setState(useCartStore.getInitialState());
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

  it('reconciles the cart only after a successful latest response', async () => {
    useCartStore.getState().addItem({
      id: firstProduct.id,
      name: firstProduct.name,
      category: firstProduct.category,
      mileage_cost: firstProduct.mileage_cost,
      stock: firstProduct.stock,
      icon_type: firstProduct.icon_type,
    });
    const failedRefresh = deferred<Response>();
    const updated = { ...firstProduct, mileage_cost: 250, stock: 2 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([updated]))
      .mockReturnValueOnce(failedRefresh.promise);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useProductCatalog());
    await waitFor(() => expect(useCartStore.getState().items[0].mileage_cost).toBe(250));

    act(() => result.current.refresh());
    await act(async () => failedRefresh.resolve(response([], false)));

    expect(useCartStore.getState().items[0]).toMatchObject({ mileage_cost: 250, stock: 2 });
    expect(result.current.validationError).toBe(true);
  });

  it('does not request products while disabled and validates when enabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([firstProduct]));
    vi.stubGlobal('fetch', fetchMock);

    const { result, rerender } = renderHook(
      ({ enabled }) => useProductCatalog({ enabled }),
      { initialProps: { enabled: false } },
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.validating).toBe(false);
    act(() => result.current.refresh());
    expect(fetchMock).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.products).toEqual([firstProduct]));
    expect(result.current.validationError).toBe(false);
  });

  it('does not let an older hook instance roll the cart back after a newer request succeeds', async () => {
    useCartStore.getState().addItem({
      id: firstProduct.id,
      name: firstProduct.name,
      category: firstProduct.category,
      mileage_cost: firstProduct.mileage_cost,
      stock: firstProduct.stock,
      icon_type: firstProduct.icon_type,
    });
    const older = deferred<Response>();
    const newer = deferred<Response>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useProductCatalog());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    renderHook(() => useProductCatalog());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    await act(async () => newer.resolve(response([{ ...firstProduct, mileage_cost: 1500 }])));
    await waitFor(() => expect(useCartStore.getState().items[0].mileage_cost).toBe(1500));

    await act(async () => older.resolve(response([{ ...firstProduct, mileage_cost: 1200 }])));
    expect(useCartStore.getState().items[0].mileage_cost).toBe(1500);
  });

  it('does not report a validated catalog as failed when a page callback throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([firstProduct])));

    const { result } = renderHook(() => useProductCatalog({
      onProductsLoaded: () => { throw new Error('consumer failed'); },
    }));

    await waitFor(() => expect(result.current.validated).toBe(true));
    expect(result.current.validationError).toBe(false);
  });
});
