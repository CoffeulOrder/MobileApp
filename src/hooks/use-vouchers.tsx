/**
 * 내 교환권 (개인 데이터). 디스크에 캐시하지 않는다 — 공개 데이터인 메뉴 캐시와 달리
 * 사용자별 정보이므로 메모리에만 두고, 쿠폰/결제 화면에 들어올 때마다 다시 조회한다.
 * 로그아웃하면 `reset()` 으로 비운다 (use-logout.ts).
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { fetchVouchers } from '@/api/voucher-api';
import type { Voucher } from '@/constants/coffeul';

type VoucherStatusState = 'idle' | 'loading' | 'ready' | 'error';

type VoucherValue = {
  vouchers: Voucher[];
  notice?: string;
  /** error 는 "받아 둔 데이터가 없는데 실패" 일 때만 (있으면 이전 목록을 계속 보여준다) */
  status: VoucherStatusState;
  refresh: () => Promise<void>;
  reset: () => void;
};

const VoucherContext = createContext<VoucherValue | null>(null);

export function VoucherProvider({ children }: { children: ReactNode }) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [notice, setNotice] = useState<string | undefined>();
  const [status, setStatus] = useState<VoucherStatusState>('idle');
  const loadedRef = useRef(false);
  const seqRef = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++seqRef.current;
    if (!loadedRef.current) setStatus('loading');
    try {
      const res = await fetchVouchers();
      if (seq !== seqRef.current) return; // reset() 이후 도착한 낡은 응답은 버림
      loadedRef.current = true;
      setVouchers(res.vouchers);
      setNotice(res.notice);
      setStatus('ready');
    } catch (e) {
      if (seq !== seqRef.current) return;
      if (!loadedRef.current) setStatus('error');
      else console.warn('[vouchers] 새로고침 실패 — 이전 목록 유지', e);
    }
  }, []);

  const reset = useCallback(() => {
    seqRef.current += 1;
    loadedRef.current = false;
    setVouchers([]);
    setNotice(undefined);
    setStatus('idle');
  }, []);

  const value = useMemo<VoucherValue>(
    () => ({ vouchers, notice, status, refresh, reset }),
    [vouchers, notice, status, refresh, reset],
  );

  return <VoucherContext.Provider value={value}>{children}</VoucherContext.Provider>;
}

export function useVouchers() {
  const ctx = useContext(VoucherContext);
  if (!ctx) throw new Error('useVouchers must be used inside <VoucherProvider>');
  return ctx;
}
