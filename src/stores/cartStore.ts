import { create } from 'zustand';
import type { Product } from '@/lib/types';

// A product snapshot taken into the cart, plus per-line state
interface CartItem extends Pick<Product, 'id' | 'name' | 'mileage_cost' | 'icon_type'> {
  quantity: number;
  address?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  totalMiles: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id
              ? { ...i, quantity: i.quantity + 1, address: item.address ?? i.address }
              : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    }),

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
