'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product } from '@/lib/types';
import { subscribeToProductCatalogChanges } from '@/lib/productCatalogSync';

interface ProductCatalogState {
  products: Product[];
  loading: boolean;
  loadError: boolean;
  retry: () => void;
  refresh: () => void;
}

interface UseProductCatalogOptions {
  onProductsLoaded?: (products: Product[]) => void;
}

const PRODUCT_REQUEST_TIMEOUT_MS = 10_000;

function parseProducts(payload: unknown): Product[] {
  if (!payload || typeof payload !== 'object') throw new Error('商品响应无效');
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) throw new Error('商品响应无效');
  return data as Product[];
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && error.name === 'AbortError';
}

export function useProductCatalog({ onProductsLoaded }: UseProductCatalogOptions = {}): ProductCatalogState {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const hasSuccessfulLoadRef = useRef(false);
  const mountedRef = useRef(false);
  const onProductsLoadedRef = useRef(onProductsLoaded);

  useEffect(() => {
    onProductsLoadedRef.current = onProductsLoaded;
  }, [onProductsLoaded]);

  const load = useCallback((showInitialLoading: boolean) => {
    const requestId = ++requestIdRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, PRODUCT_REQUEST_TIMEOUT_MS);

    if (showInitialLoading && !hasSuccessfulLoadRef.current) {
      setLoading(true);
      setLoadError(false);
    }

    void fetch('/api/products', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('商品加载失败');
        return parseProducts(await response.json());
      })
      .then((nextProducts) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        hasSuccessfulLoadRef.current = true;
        setProducts(nextProducts);
        setLoadError(false);
        onProductsLoadedRef.current?.(nextProducts);
      })
      .catch((error: unknown) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        if (isAbortError(error) && !timedOut) return;
        if (!hasSuccessfulLoadRef.current) setLoadError(true);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setLoading(false);
      });
  }, []);

  const refresh = useCallback(() => load(false), [load]);
  const retry = useCallback(() => load(true), [load]);

  useEffect(() => {
    mountedRef.current = true;
    load(true);
    const unsubscribe = subscribeToProductCatalogChanges(refresh);

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      controllerRef.current?.abort();
      unsubscribe();
    };
  }, [load, refresh]);

  return { products, loading, loadError, retry, refresh };
}
