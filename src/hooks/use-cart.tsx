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
  /** 이 주문에 쓰려고 고른 교환권 id (결제 화면에서 서버가 적용 가능 여부를 판단). clear() 하면 같이 비워진다. */
  voucherIds: string[];
  setVoucherIds: (ids: string[]) => void;
  /**
   * 메뉴가 갱신된 뒤 장바구니를 최신 메뉴에 맞춘다: 사라진 메뉴는 빼고, 이름/가격은 최신 값으로 교체.
   * 무엇이 바뀌었는지 돌려준다 (안내 문구용).
   */
  reconcile: (menus: MenuItem[]) => { removed: string[]; priceChanged: string[] };
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [voucherIds, setVoucherIds] = useState<string[]>([]);

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
    const clear = () => {
      setLines([]);
      setVoucherIds([]);
    };

    const reconcile: CartValue['reconcile'] = (menus) => {
      const byId = new Map(menus.map((m) => [m.id, m]));
      const removed: string[] = [];
      const priceChanged: string[] = [];
      const next: CartLine[] = [];
      for (const line of lines) {
        const latest = byId.get(line.item.id);
        if (!latest) {
          removed.push(line.item.name);
          continue;
        }
        if (latest.price !== line.item.price) priceChanged.push(latest.name);
        next.push({ ...line, item: latest });
      }
      setLines(next);
      return { removed, priceChanged };
    };

    const count = lines.reduce((n, l) => n + l.qty, 0);
    const total = lines.reduce((n, l) => n + l.qty * l.item.price, 0);

    return { lines, count, total, add, setQty, remove, clear, voucherIds, setVoucherIds, reconcile };
  }, [lines, voucherIds]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
