import { create } from 'zustand';

export type AppearanceMode = 'glass' | 'standard';

export const APPEARANCE_STORAGE_KEY = 'greenmiles-appearance';

interface AppearanceState {
  mode: AppearanceMode;
  isInitialized: boolean;
  initialize: () => void;
  setMode: (mode: AppearanceMode) => void;
  toggleMode: () => void;
}

function applyMode(mode: AppearanceMode) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.glassMode = mode;
  }
}

function readStoredMode(): AppearanceMode {
  if (typeof window === 'undefined') return 'glass';

  try {
    const stored = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    return stored === 'standard' || stored === 'glass' ? stored : 'glass';
  } catch {
    return 'glass';
  }
}

function persistMode(mode: AppearanceMode) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, mode);
  } catch {
    // A private or locked-down browser may reject storage. The in-memory mode remains usable.
  }
}

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  mode: 'glass',
  isInitialized: false,

  initialize: () => {
    if (get().isInitialized) {
      applyMode(get().mode);
      return;
    }
    const mode = readStoredMode();
    applyMode(mode);
    set({ mode, isInitialized: true });
  },

  setMode: (mode) => {
    applyMode(mode);
    persistMode(mode);
    set({ mode, isInitialized: true });
  },

  toggleMode: () => {
    get().setMode(get().mode === 'glass' ? 'standard' : 'glass');
  },
}));
