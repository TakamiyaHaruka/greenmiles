// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APPEARANCE_STORAGE_KEY,
  useAppearanceStore,
} from './appearanceStore';

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.dataset.glassMode = 'glass';
  useAppearanceStore.setState(useAppearanceStore.getInitialState());
  vi.restoreAllMocks();
});

describe('useAppearanceStore', () => {
  it('defaults to glass and restores a saved preference', () => {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, 'standard');

    useAppearanceStore.getState().initialize();

    expect(useAppearanceStore.getState().mode).toBe('standard');
    expect(useAppearanceStore.getState().isInitialized).toBe(true);
    expect(document.documentElement.dataset.glassMode).toBe('standard');
  });

  it('persists toggles and applies them to the document', () => {
    useAppearanceStore.getState().initialize();
    useAppearanceStore.getState().toggleMode();

    expect(useAppearanceStore.getState().mode).toBe('standard');
    expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('standard');
    expect(document.documentElement.dataset.glassMode).toBe('standard');
  });

  it('falls back safely when storage access is rejected', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(() => useAppearanceStore.getState().initialize()).not.toThrow();
    expect(useAppearanceStore.getState().mode).toBe('glass');
    expect(document.documentElement.dataset.glassMode).toBe('glass');
  });

  it('keeps the in-memory choice when storage writes are rejected', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(() => useAppearanceStore.getState().setMode('standard')).not.toThrow();
    expect(useAppearanceStore.getState().mode).toBe('standard');
    expect(document.documentElement.dataset.glassMode).toBe('standard');
  });

  it('does not reset an initialized in-memory choice when a toggle remounts', () => {
    useAppearanceStore.getState().setMode('standard');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    useAppearanceStore.getState().initialize();

    expect(useAppearanceStore.getState().mode).toBe('standard');
    expect(document.documentElement.dataset.glassMode).toBe('standard');
  });
});
