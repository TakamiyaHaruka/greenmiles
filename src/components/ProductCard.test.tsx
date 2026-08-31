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

  it('renders redeem button', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('立即兑换')).toBeInTheDocument();
  });
});
