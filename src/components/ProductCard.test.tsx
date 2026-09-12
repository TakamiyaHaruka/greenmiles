// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/types';

const mockProduct: Product = {
  id: 1,
  name: '共享单车骑行卡',
  description: '畅享城市绿色出行，有效期30天',
  category: 'virtual',
  mileage_cost: 1200,
  stock: 100,
  icon_type: 'bike',
  project_name: '',
  project_standard: '',
  project_vintage: '',
};

describe('ProductCard', () => {
  it('renders product name', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('共享单车骑行卡')).toBeInTheDocument();
  });

  it('renders product description', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('畅享城市绿色出行，有效期30天')).toBeInTheDocument();
  });

  it('renders formatted mileage cost', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('1,200 里程')).toBeInTheDocument();
  });

  it('renders category badge for virtual', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('虚拟卡券')).toBeInTheDocument();
  });

  it('renders category badge for carbon', () => {
    render(<ProductCard product={{ ...mockProduct, category: 'carbon' }} />);
    expect(screen.getByText('碳抵消')).toBeInTheDocument();
  });

  it('renders category badge for physical', () => {
    render(<ProductCard product={{ ...mockProduct, category: 'physical' }} />);
    expect(screen.getByText('实体商品')).toBeInTheDocument();
  });

  it('renders fallback category for unknown category', () => {
    render(<ProductCard product={{ ...mockProduct, category: 'unknown' }} />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(<ProductCard product={mockProduct} onClick={onClick} />);
    fireEvent.click(screen.getByText('共享单车骑行卡').closest('[class*="cursor-pointer"]')!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the detail action and live stock', () => {
    render(<ProductCard product={mockProduct} variant="home" />);
    expect(screen.getByText('查看详情')).toBeInTheDocument();
    expect(screen.getByText('库存 100')).toBeInTheDocument();
  });

  it('keeps the existing default-card action outside the home page', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('立即兑换')).toBeInTheDocument();
    expect(screen.queryByText('库存 100')).not.toBeInTheDocument();
  });

  it('uses the stage-two surface and preserves live availability in the mall', () => {
    const { container } = render(<ProductCard product={mockProduct} balance={200} variant="journey" />);
    expect(container.querySelector('.journey-surface-light')).toBeInTheDocument();
    expect(screen.getByText('还差 1,000 里程')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /查看详情/ })).toBeInTheDocument();
  });

  it('shows the exact shortage for a signed-in balance', () => {
    render(<ProductCard product={mockProduct} balance={200} variant="home" />);
    expect(screen.getByText('还差 1,000 里程')).toBeInTheDocument();
  });

  it('keeps unavailable products inspectable while showing their status', () => {
    const onClick = vi.fn();
    render(<ProductCard product={{ ...mockProduct, stock: 0 }} onClick={onClick} variant="home" />);
    fireEvent.click(screen.getByRole('button', { name: /暂时无货/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
