import { describe, it, expect, afterEach } from 'vitest';
import { useCartStore } from './cartStore';

const mockItem = { id: 1, name: 'Test Item', category: 'virtual', mileage_cost: 1000, icon_type: 'bike', stock: 3 };
const mockItem2 = { id: 2, name: 'Another Item', category: 'carbon', mileage_cost: 2000, icon_type: 'tree', stock: 20 };

function catalogProduct(item: typeof mockItem, overrides: Partial<typeof mockItem> = {}) {
  return {
    description: '',
    project_name: '',
    project_standard: '',
    project_vintage: '',
    ...item,
    ...overrides,
  };
}

afterEach(() => {
  useCartStore.setState(useCartStore.getInitialState());
});

describe('useCartStore', () => {
  it('has correct initial state', () => {
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.totalMiles()).toBe(0);
    expect(state.itemCount()).toBe(0);
  });

  it('addItem adds new item with quantity 1', () => {
    useCartStore.getState().addItem(mockItem);
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ ...mockItem, quantity: 1 });
  });

  it('addItem same id increments quantity', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem);
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
  });

  it('does not add an item without available stock', () => {
    useCartStore.getState().addItem({ ...mockItem, stock: 0 });
    useCartStore.getState().addItem({ ...mockItem2, stock: -1 });
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('caps repeated additions at the stock snapshot', () => {
    for (let index = 0; index < 5; index += 1) {
      useCartStore.getState().addItem(mockItem);
    }
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('caps repeated additions at the per-order limit', () => {
    for (let index = 0; index < 12; index += 1) {
      useCartStore.getState().addItem(mockItem2);
    }
    expect(useCartStore.getState().items[0].quantity).toBe(10);
  });

  it('incrementItem and decrementItem preserve quantity boundaries', () => {
    useCartStore.getState().addItem({ ...mockItem, stock: 2 });
    useCartStore.getState().incrementItem(mockItem.id);
    useCartStore.getState().incrementItem(mockItem.id);
    expect(useCartStore.getState().items[0].quantity).toBe(2);

    useCartStore.getState().decrementItem(mockItem.id);
    useCartStore.getState().decrementItem(mockItem.id);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('addItem different ids creates separate items', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem2);
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(2);
  });

  it('removeItem removes item by id', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem2);
    useCartStore.getState().removeItem(1);
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe(2);
  });

  it('removeItem with nonexistent id does nothing', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().removeItem(999);
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('clearCart empties items', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem2);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('totalMiles sums mileage_cost * quantity', () => {
    useCartStore.getState().addItem(mockItem); // 1000 * 1
    useCartStore.getState().addItem(mockItem); // 1000 * 2
    useCartStore.getState().addItem(mockItem2); // 2000 * 1
    expect(useCartStore.getState().totalMiles()).toBe(4000);
  });

  it('updates totals after decreasing quantity', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().decrementItem(mockItem.id);
    expect(useCartStore.getState().totalMiles()).toBe(1000);
    expect(useCartStore.getState().itemCount()).toBe(1);
  });

  it('itemCount sums quantities', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem2);
    expect(useCartStore.getState().itemCount()).toBe(3); // 2 + 1
  });

  it('reconciles price, product details and quantity against the latest catalog', () => {
    useCartStore.getState().addItem({ ...mockItem, stock: 5, address: '保留的地址' });
    useCartStore.getState().addItem({ ...mockItem, stock: 5 });
    useCartStore.getState().addItem({ ...mockItem, stock: 5 });

    useCartStore.getState().reconcileProducts([
      catalogProduct(mockItem, {
        name: 'Updated Item',
        category: 'physical',
        mileage_cost: 1500,
        icon_type: 'bag',
        stock: 2,
      }),
    ]);

    const state = useCartStore.getState();
    expect(state.items[0]).toMatchObject({
      name: 'Updated Item',
      category: 'physical',
      mileage_cost: 1500,
      icon_type: 'bag',
      stock: 2,
      quantity: 2,
      address: '保留的地址',
    });
    expect(state.totalMiles()).toBe(3000);
    expect(state.reconciliationNotices.map((notice) => notice.kind)).toEqual(['price', 'quantity']);
    expect(state.reconciliationNotices[0]).toMatchObject({
      previousUnitCost: 1000,
      currentUnitCost: 1500,
    });
  });

  it('removes sold-out and deleted products while retaining explanatory notices', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem2);

    useCartStore.getState().reconcileProducts([
      catalogProduct(mockItem, { stock: 0 }),
    ]);

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.reconciliationNotices).toHaveLength(2);
    expect(state.reconciliationNotices[0].message).toContain('已售罄');
    expect(state.reconciliationNotices[1].message).toContain('已下架');
  });

  it('does not duplicate reconciliation notices for the same catalog state', () => {
    useCartStore.getState().addItem(mockItem);
    const updatedCatalog = [catalogProduct(mockItem, { mileage_cost: 1500 })];

    useCartStore.getState().reconcileProducts(updatedCatalog);
    useCartStore.getState().reconcileProducts(updatedCatalog);

    expect(useCartStore.getState().reconciliationNotices).toHaveLength(1);
  });

  it('clears a stale removal notice when the product is deliberately added again', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().reconcileProducts([]);

    useCartStore.getState().addItem(mockItem);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().reconciliationNotices).toEqual([]);
  });

  it('keeps an unread price notice when the updated product is added again', () => {
    useCartStore.getState().addItem(mockItem);
    const repriced = catalogProduct(mockItem, { mileage_cost: 1500 });
    useCartStore.getState().reconcileProducts([repriced]);

    useCartStore.getState().addItem({
      id: repriced.id,
      name: repriced.name,
      category: repriced.category,
      mileage_cost: repriced.mileage_cost,
      icon_type: repriced.icon_type,
      stock: repriced.stock,
    });

    expect(useCartStore.getState().reconciliationNotices).toHaveLength(1);
    expect(useCartStore.getState().reconciliationNotices[0].kind).toBe('price');
  });

  it('drops an old delivery address when a product becomes non-physical', () => {
    useCartStore.getState().addItem({ ...mockItem, category: 'physical', address: '敏感地址' });

    useCartStore.getState().reconcileProducts([catalogProduct(mockItem)]);

    expect(useCartStore.getState().items[0].address).toBeUndefined();
  });

  it('keeps the cart untouched until reconciliation is explicitly given a successful catalog', () => {
    useCartStore.getState().addItem(mockItem);

    expect(useCartStore.getState().items).toEqual([{ ...mockItem, quantity: 1 }]);
    expect(useCartStore.getState().reconciliationNotices).toEqual([]);
  });
});
