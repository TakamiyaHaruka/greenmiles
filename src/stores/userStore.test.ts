import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { useUserStore } from './userStore';

const mockUser = { id: 1, email: 'test@greenmiles.com', miles_balance: 10000 };

afterEach(() => {
  useUserStore.setState(useUserStore.getInitialState());
});

describe('useUserStore', () => {
  it('has correct initial state', () => {
    const state = useUserStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.initializationStatus).toBe('idle');
  });

  it('setUser sets user and isAuthenticated', () => {
    useUserStore.getState().setUser(mockUser);
    const state = useUserStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.initializationStatus).toBe('authenticated');
  });

  it('clearUser resets to initial state', () => {
    useUserStore.getState().setUser(mockUser);
    useUserStore.getState().clearUser();
    const state = useUserStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.initializationStatus).toBe('guest');
  });

  it('updateMilesBalance updates balance on existing user', () => {
    useUserStore.getState().setUser(mockUser);
    useUserStore.getState().updateMilesBalance(5000);
    expect(useUserStore.getState().user!.miles_balance).toBe(5000);
  });

  it('updateMilesBalance does nothing when user is null', () => {
    useUserStore.getState().updateMilesBalance(5000);
    expect(useUserStore.getState().user).toBeNull();
  });

  describe('fetchUser', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    it('sets user on successful fetch', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { user: mockUser } }),
      } as Response);

      await useUserStore.getState().fetchUser();
      const state = useUserStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.initializationStatus).toBe('authenticated');
    });

    it('clears user on non-ok response', async () => {
      useUserStore.getState().setUser(mockUser);
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      await useUserStore.getState().fetchUser();
      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.initializationStatus).toBe('guest');
    });

    it('keeps the known user and exposes a retryable state on network error', async () => {
      useUserStore.getState().setUser(mockUser);
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await useUserStore.getState().fetchUser();
      const state = useUserStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.initializationStatus).toBe('error');
    });

    it('does not turn a server failure into a guest session', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);

      await useUserStore.getState().fetchUser();

      expect(useUserStore.getState().initializationStatus).toBe('error');
    });

    it('ignores an initialization response after a newer login wins', async () => {
      let resolveFetch!: (response: Response) => void;
      vi.mocked(fetch).mockReturnValueOnce(new Promise((resolve) => {
        resolveFetch = resolve;
      }));

      const initialization = useUserStore.getState().fetchUser();
      useUserStore.getState().setUser(mockUser);
      resolveFetch({ ok: false, status: 401 } as Response);
      await initialization;

      expect(useUserStore.getState().user).toEqual(mockUser);
      expect(useUserStore.getState().initializationStatus).toBe('authenticated');
    });
  });
});
