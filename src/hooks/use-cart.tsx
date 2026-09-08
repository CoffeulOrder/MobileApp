/**
 * In-memory cart for the UI mock. No persistence, no backend — just enough
 * state to make the menu / cart / checkout screens talk to each other.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { MenuItem } from '@/constants/coffeul';

export type CartLine = { item: MenuItem; qty: number };

type CartValue = {
  lines: CartLine[];
  count: number;
  total: number;
  add: (item: MenuItem) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartValue>(() => {
    const add = (item: MenuItem) =>
      setLines((prev) => {
        const found = prev.find((l) => l.item.id === item.id);
        if (found) {
          return prev.map((l) => (l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l));
        }
        return [...prev, { item, qty: 1 }];
      });

    const setQty = (id: string, qty: number) =>
      setLines((prev) =>
        qty <= 0
          ? prev.filter((l) => l.item.id !== id)
          : prev.map((l) => (l.item.id === id ? { ...l, qty } : l)),
      );

    const remove = (id: string) => setLines((prev) => prev.filter((l) => l.item.id !== id));
    const clear = () => setLines([]);

    const count = lines.reduce((n, l) => n + l.qty, 0);
    const total = lines.reduce((n, l) => n + l.qty * l.item.price, 0);

    return { lines, count, total, add, setQty, remove, clear };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
