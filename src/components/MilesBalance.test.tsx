// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MilesBalance } from './MilesBalance';
import { useUserStore } from '@/stores/userStore';

afterEach(() => {
  useUserStore.setState(useUserStore.getInitialState());
});

describe('MilesBalance', () => {
  it('renders nothing when no user', () => {
    const { container } = render(<MilesBalance />);
    expect(container.innerHTML).toBe('');
  });

  it('renders formatted miles balance when user exists', () => {
    useUserStore.setState({
      user: { id: 1, email: 'test@test.com', miles_balance: 12345 },
      isAuthenticated: true,
    });

    render(<MilesBalance />);
    expect(screen.getByText('12,345')).toBeInTheDocument();
  });

  it('renders Plane icon', () => {
    useUserStore.setState({
      user: { id: 1, email: 'test@test.com', miles_balance: 5000 },
      isAuthenticated: true,
    });

    const { container } = render(<MilesBalance />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
