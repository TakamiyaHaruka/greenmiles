import { create } from 'zustand';
import type { Product } from '@/lib/types';

// A product snapshot taken into the cart, plus per-line state
export const MAX_CART_ITEM_QUANTITY = 10;

export function getCartItemQuantityLimit(stock: number) {
  if (!Number.isFinite(stock)) return 0;
  return Math.min(Math.max(Math.floor(stock), 0), MAX_CART_ITEM_QUANTITY);
}

interface CartItem extends Pick<Product, 'id' | 'name' | 'mileage_cost' | 'icon_type' | 'stock'> {
  quantity: number;
  address?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  incrementItem: (id: number) => void;
  decrementItem: (id: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  totalMiles: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const quantityLimit = getCartItemQuantityLimit(item.stock);
      if (quantityLimit === 0) return state;

      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        const existingLimit = getCartItemQuantityLimit(existing.stock);
        if (existing.quantity >= existingLimit) return state;

        return {
          items: state.items.map((i) =>
            i.id === item.id
              ? { ...i, quantity: i.quantity + 1, address: item.address ?? i.address }
              : i
          ),
        };
      }
      return { items: [...state.items, { ...item, stock: Math.floor(item.stock), quantity: 1 }] };
    }),

  incrementItem: (id) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id || item.quantity >= getCartItemQuantityLimit(item.stock)) {
          return item;
        }
        return { ...item, quantity: item.quantity + 1 };
      }),
    })),

  decrementItem: (id) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ),
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),

  clearCart: () => set({ items: [] }),

  totalMiles: () =>
    get().items.reduce((sum, item) => sum + item.mileage_cost * item.quantity, 0),

  itemCount: () =>
    get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
