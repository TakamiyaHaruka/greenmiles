import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  miles_balance: number;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  initializationStatus: 'idle' | 'loading' | 'authenticated' | 'guest' | 'error';
  setUser: (user: User) => void;
  clearUser: () => void;
  updateMilesBalance: (balance: number) => void;
  fetchUser: () => Promise<void>;
}

let authRequestGeneration = 0;

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: false,
  initializationStatus: 'idle',

  setUser: (user) => {
    authRequestGeneration += 1;
    set({
      user,
      isAuthenticated: true,
      initializationStatus: 'authenticated',
    });
  },

  clearUser: () => {
    authRequestGeneration += 1;
    set({
      user: null,
      isAuthenticated: false,
      initializationStatus: 'guest',
    });
  },

  updateMilesBalance: (balance) =>
    set((state) => ({
      user: state.user ? { ...state.user, miles_balance: balance } : null,
    })),

  fetchUser: async () => {
    const requestGeneration = ++authRequestGeneration;
    set({ initializationStatus: 'loading' });
    try {
      const response = await fetch('/api/user');
      if (requestGeneration !== authRequestGeneration) return;
      if (response.ok) {
        const { data } = await response.json();
        if (requestGeneration !== authRequestGeneration) return;
        set({
          user: data.user,
          isAuthenticated: true,
          initializationStatus: 'authenticated',
        });
      } else if (response.status === 401 || response.status === 404) {
        set({
          user: null,
          isAuthenticated: false,
          initializationStatus: 'guest',
        });
      } else {
        set({ initializationStatus: 'error' });
      }
    } catch {
      if (requestGeneration !== authRequestGeneration) return;
      set({ initializationStatus: 'error' });
    }
  },
}));
