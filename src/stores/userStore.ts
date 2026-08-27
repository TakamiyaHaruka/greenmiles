import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  miles_balance: number;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
  updateMilesBalance: (balance: number) => void;
  fetchUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
    }),

  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),

  updateMilesBalance: (balance) =>
    set((state) => ({
      user: state.user ? { ...state.user, miles_balance: balance } : null,
    })),

  fetchUser: async () => {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        const { data } = await response.json();
        set({
          user: data.user,
          isAuthenticated: true,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
        });
      }
    } catch {
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },
}));
