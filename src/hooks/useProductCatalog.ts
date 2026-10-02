'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product } from '@/lib/types';
import { subscribeToProductCatalogChanges } from '@/lib/productCatalogSync';
import { useCartStore } from '@/stores/cartStore';

interface ProductCatalogState {
  products: Product[];
  loading: boolean;
  loadError: boolean;
  validating: boolean;
  validationError: boolean;
  validated: boolean;
  retry: () => void;
  refresh: () => void;
}

interface UseProductCatalogOptions {
  onProductsLoaded?: (products: Product[]) => void;
  enabled?: boolean;
}

const PRODUCT_REQUEST_TIMEOUT_MS = 10_000;
let latestCartReconciliationRequestId = 0;

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

export function useProductCatalog({ onProductsLoaded, enabled = true }: UseProductCatalogOptions = {}): ProductCatalogState {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadError, setLoadError] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const [validated, setValidated] = useState(false);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const hasSuccessfulLoadRef = useRef(false);
  const mountedRef = useRef(false);
  const enabledRef = useRef(enabled);
  const onProductsLoadedRef = useRef(onProductsLoaded);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onProductsLoadedRef.current = onProductsLoaded;
  }, [onProductsLoaded]);

  const load = useCallback((showInitialLoading: boolean) => {
    if (!enabledRef.current) return;
    const requestId = ++requestIdRef.current;
    const cartReconciliationRequestId = ++latestCartReconciliationRequestId;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, PRODUCT_REQUEST_TIMEOUT_MS);

    window.queueMicrotask(() => {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      if (showInitialLoading && !hasSuccessfulLoadRef.current) {
        setLoading(true);
        setLoadError(false);
      }
      setValidating(true);
      setValidationError(false);
      setValidated(false);
    });

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
        setValidationError(false);
        setValidated(true);
        if (cartReconciliationRequestId === latestCartReconciliationRequestId) {
          useCartStore.getState().reconcileProducts(nextProducts);
        }
        try {
          onProductsLoadedRef.current?.(nextProducts);
        } catch {
          // A page consumer must not turn an already validated catalog into a network error.
        }
      })
      .catch((error: unknown) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        if (isAbortError(error) && !timedOut) return;
        setValidationError(true);
        if (!hasSuccessfulLoadRef.current) setLoadError(true);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setLoading(false);
        setValidating(false);
      });
  }, []);

  const refresh = useCallback(() => load(false), [load]);
  const retry = useCallback(() => load(true), [load]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      window.queueMicrotask(() => {
        if (!mountedRef.current) return;
        setLoading(false);
        setValidating(false);
        setValidated(false);
      });
      return () => {
        mountedRef.current = false;
        requestIdRef.current += 1;
        controllerRef.current?.abort();
      };
    }

    load(true);
    const unsubscribe = subscribeToProductCatalogChanges(refresh);

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      controllerRef.current?.abort();
      unsubscribe();
    };
  }, [enabled, load, refresh]);

  return {
    products,
    loading: enabled ? loading : false,
    loadError: enabled ? loadError : false,
    validating: enabled ? validating : false,
    validationError: enabled ? validationError : false,
    validated: enabled && validated,
    retry,
    refresh,
  };
}
