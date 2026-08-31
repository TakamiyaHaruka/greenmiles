// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CarbonCalculator } from './CarbonCalculator';
import { useCarbonStore } from '@/stores/carbonStore';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
}));

afterEach(() => {
  useCarbonStore.setState(useCarbonStore.getInitialState());
});

describe('CarbonCalculator', () => {
  it('renders the form with preset route buttons', () => {
    render(<CarbonCalculator />);
    expect(screen.getByText('北京→上海')).toBeInTheDocument();
    expect(screen.getByText('北京→广州')).toBeInTheDocument();
  });

  it('renders empty state initially', () => {
    render(<CarbonCalculator />);
    expect(screen.getByText('请输入完整的航班信息')).toBeInTheDocument();
  });

  it('renders distance input', () => {
    render(<CarbonCalculator />);
    expect(screen.getByLabelText('飞行距离 (km)')).toBeInTheDocument();
  });

  it('preset route button fills the airports and the computed distance', () => {
    render(<CarbonCalculator />);
    const button = screen.getByText('北京→上海');
    fireEvent.click(button);
    // PEK→SHA great-circle distance is derived from airport coordinates
    const input = screen.getByLabelText('飞行距离 (km)') as HTMLInputElement;
    expect(input.value).toBe('1077');
  });
});
