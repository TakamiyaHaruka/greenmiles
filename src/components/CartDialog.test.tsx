// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from '@/stores/cartStore';
import { useUserStore } from '@/stores/userStore';
import type { Product } from '@/lib/types';
import { CartDialog } from './CartDialog';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toastError: vi.fn(),
  catalog: {
    products: [] as Product[],
    loading: false,
    loadError: false,
    validating: false,
    validationError: false,
    validated: true,
    retry: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError },
}));

vi.mock('@/hooks/useProductCatalog', () => ({
  useProductCatalog: () => mocks.catalog,
}));

vi.mock('@/components/VoucherDisplay', () => ({
  VoucherDisplay: () => <div>兑换成功凭证</div>,
}));

const product: Product = {
  id: 1,
  name: '骑行卡',
  description: '',
  category: 'virtual',
  mileage_cost: 1000,
  stock: 5,
  icon_type: 'bike',
  project_name: '',
  project_standard: '',
  project_vintage: '',
};

function addProductToCart() {
  useCartStore.getState().addItem({
    id: product.id,
    name: product.name,
    category: product.category,
    mileage_cost: product.mileage_cost,
    stock: product.stock,
    icon_type: product.icon_type,
  });
}

describe('CartDialog catalog reconciliation', () => {
  afterEach(() => {
    useCartStore.setState(useCartStore.getInitialState());
    useUserStore.setState(useUserStore.getInitialState());
    mocks.catalog.loading = false;
    mocks.catalog.validating = false;
    mocks.catalog.validationError = false;
    mocks.catalog.validated = true;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('submits the currently displayed unit price', async () => {
    addProductToCart();
    useUserStore.getState().setUser({ id: 1, email: 'member@example.com', miles_balance: 5000 });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 9,
          voucher_code: 'GM-TEST',
          product_name: product.name,
          icon_type: product.icon_type,
          category: product.category,
          mileage_cost: product.mileage_cost,
          quantity: 1,
          new_balance: 4000,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CartDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '结算' }));
    fireEvent.click(screen.getByRole('button', { name: '按当前价格确认兑换' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      productId: product.id,
      expectedUnitCost: product.mileage_cost,
      quantity: 1,
    });
  });

  it('updates an open confirmation from the current cart item after repricing', () => {
    addProductToCart();
    useUserStore.getState().setUser({ id: 1, email: 'member@example.com', miles_balance: 5000 });

    render(<CartDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '结算' }));
    expect(screen.getByText(/确认用 1,000 里程兑换/)).toBeInTheDocument();

    act(() => {
      useCartStore.getState().reconcileProducts([{ ...product, mileage_cost: 1500 }]);
    });

    expect(screen.getByText(/确认用 1,500 里程兑换/)).toBeInTheDocument();
    expect(screen.getByText(/单价已从 1,000 调整为 1,500 里程/)).toBeInTheDocument();
  });

  it('blocks an open confirmation when repricing exceeds the current balance', () => {
    addProductToCart();
    useUserStore.getState().setUser({ id: 1, email: 'member@example.com', miles_balance: 5000 });

    render(<CartDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '结算' }));
    act(() => {
      useCartStore.getState().reconcileProducts([{ ...product, mileage_cost: 6000 }]);
    });

    expect(screen.getByRole('alert')).toHaveTextContent('当前里程不足，还差 1,000 里程');
    expect(screen.getByRole('button', { name: '按当前价格确认兑换' })).toBeDisabled();
  });

  it('blocks an item that becomes physical until it is re-added with an address', () => {
    addProductToCart();
    useUserStore.getState().setUser({ id: 1, email: 'member@example.com', miles_balance: 5000 });

    render(<CartDialog open onOpenChange={vi.fn()} />);
    act(() => {
      useCartStore.getState().reconcileProducts([{ ...product, category: 'physical' }]);
    });

    expect(screen.getByText('请移除后重新加入并填写地址')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '需填写地址' })).toBeDisabled();
  });

  it('closes an open confirmation when reconciliation removes the item', () => {
    addProductToCart();
    useUserStore.getState().setUser({ id: 1, email: 'member@example.com', miles_balance: 5000 });

    render(<CartDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '结算' }));
    expect(screen.getByRole('heading', { name: '确认兑换' })).toBeInTheDocument();

    act(() => {
      useCartStore.getState().reconcileProducts([]);
    });

    expect(screen.queryByRole('heading', { name: '确认兑换' })).not.toBeInTheDocument();
    expect(screen.getByText(/已下架，已从购物车移除/)).toBeInTheDocument();
  });

  it('keeps the cart but blocks settlement until catalog validation succeeds', () => {
    addProductToCart();
    useUserStore.getState().setUser({ id: 1, email: 'member@example.com', miles_balance: 5000 });
    mocks.catalog.validationError = true;
    mocks.catalog.validated = false;

    const { rerender } = render(<CartDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('商品信息验证失败');
    expect(screen.getByRole('button', { name: '等待重试' })).toBeDisabled();
    expect(useCartStore.getState().items).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(mocks.catalog.retry).toHaveBeenCalledTimes(1);
    mocks.catalog.validationError = false;
    mocks.catalog.validated = true;
    rerender(<CartDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '结算' })).toBeEnabled();
  });

  it('shows retry inside an open confirmation when revalidation fails', () => {
    addProductToCart();
    useUserStore.getState().setUser({ id: 1, email: 'member@example.com', miles_balance: 5000 });
    const { rerender } = render(<CartDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '结算' }));

    mocks.catalog.validationError = true;
    mocks.catalog.validated = false;
    rerender(<CartDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('商品信息验证失败');
    expect(screen.getByRole('button', { name: '等待重试' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(mocks.catalog.retry).toHaveBeenCalledTimes(1);
  });
});
