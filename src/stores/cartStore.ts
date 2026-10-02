import { create } from 'zustand';
import type { Product } from '@/lib/types';

// A product snapshot taken into the cart, plus per-line state
export const MAX_CART_ITEM_QUANTITY = 10;

export function getCartItemQuantityLimit(stock: number) {
  if (!Number.isFinite(stock)) return 0;
  return Math.min(Math.max(Math.floor(stock), 0), MAX_CART_ITEM_QUANTITY);
}

export interface CartItem extends Pick<Product, 'id' | 'name' | 'category' | 'mileage_cost' | 'icon_type' | 'stock'> {
  quantity: number;
  address?: string;
}

export interface CartReconciliationNotice {
  id: number;
  productId: number;
  kind: 'price' | 'quantity' | 'removed';
  message: string;
  previousUnitCost?: number;
  currentUnitCost?: number;
}

let nextNoticeId = 1;

interface CartState {
  items: CartItem[];
  reconciliationNotices: CartReconciliationNotice[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  incrementItem: (id: number) => void;
  decrementItem: (id: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  reconcileProducts: (products: Product[]) => void;
  dismissReconciliationNotice: (noticeId: number) => void;
  totalMiles: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  reconciliationNotices: [],

  addItem: (item) =>
    set((state) => {
      const quantityLimit = getCartItemQuantityLimit(item.stock);
      if (quantityLimit === 0) return state;

      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        if (existing.quantity >= quantityLimit) return state;

        return {
          items: state.items.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  ...item,
                  stock: Math.floor(item.stock),
                  quantity: i.quantity + 1,
                  address: item.address ?? i.address,
                }
              : i
          ),
        };
      }
      return {
        items: [...state.items, { ...item, stock: Math.floor(item.stock), quantity: 1 }],
        reconciliationNotices: state.reconciliationNotices.filter(
          (notice) => notice.productId !== item.id || notice.kind !== 'removed',
        ),
      };
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
      reconciliationNotices: state.reconciliationNotices.filter((notice) => notice.productId !== id),
    })),

  clearCart: () => set({ items: [], reconciliationNotices: [] }),

  reconcileProducts: (products) =>
    set((state) => {
      if (state.items.length === 0) return state;

      const productsById = new Map(products.map((product) => [product.id, product]));
      const notices: CartReconciliationNotice[] = [];
      const items = state.items.flatMap((item) => {
        const product = productsById.get(item.id);
        if (!product || product.stock <= 0) {
          notices.push({
            id: nextNoticeId++,
            productId: item.id,
            kind: 'removed',
            message: !product
              ? `「${item.name}」已下架，已从购物车移除。`
              : `「${item.name}」已售罄，已从购物车移除。`,
          });
          return [];
        }

        const stock = Math.floor(product.stock);
        const quantity = Math.min(item.quantity, getCartItemQuantityLimit(stock));

        if (item.mileage_cost !== product.mileage_cost) {
          notices.push({
            id: nextNoticeId++,
            productId: item.id,
            kind: 'price',
            message: `「${product.name}」价格已从 ${item.mileage_cost.toLocaleString()} 调整为 ${product.mileage_cost.toLocaleString()} 里程，请按新价格确认。`,
            previousUnitCost: item.mileage_cost,
            currentUnitCost: product.mileage_cost,
          });
        }

        if (quantity !== item.quantity) {
          notices.push({
            id: nextNoticeId++,
            productId: item.id,
            kind: 'quantity',
            message: `「${product.name}」库存已变化，数量已从 ${item.quantity} 调整为 ${quantity}。`,
          });
        }

        const nextItem: CartItem = {
          ...item,
          name: product.name,
          category: product.category,
          mileage_cost: product.mileage_cost,
          icon_type: product.icon_type,
          stock,
          quantity,
          address: product.category === 'physical' ? item.address : undefined,
        };
        const unchanged = (
          item.name === nextItem.name
          && item.category === nextItem.category
          && item.mileage_cost === nextItem.mileage_cost
          && item.icon_type === nextItem.icon_type
          && item.stock === nextItem.stock
          && item.quantity === nextItem.quantity
          && item.address === nextItem.address
        );

        return [unchanged ? item : nextItem];
      });

      if (notices.length === 0 && items.every((item, index) => item === state.items[index])) {
        return state;
      }

      return {
        items,
        reconciliationNotices: [...state.reconciliationNotices, ...notices],
      };
    }),

  dismissReconciliationNotice: (noticeId) =>
    set((state) => ({
      reconciliationNotices: state.reconciliationNotices.filter((notice) => notice.id !== noticeId),
    })),

  totalMiles: () =>
    get().items.reduce((sum, item) => sum + item.mileage_cost * item.quantity, 0),

  itemCount: () =>
    get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
