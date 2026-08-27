import { describe, it, expect, afterEach } from 'vitest';
import { useCartStore } from './cartStore';

const mockItem = { id: 1, name: 'Test Item', mileage_cost: 1000, icon_type: 'bike' };
const mockItem2 = { id: 2, name: 'Another Item', mileage_cost: 2000, icon_type: 'tree' };

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

  it('itemCount sums quantities', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem2);
    expect(useCartStore.getState().itemCount()).toBe(3); // 2 + 1
  });
});
