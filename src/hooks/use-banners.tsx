/**
 * 이벤트 배너 팝업 상태.
 *
 * 규칙
 *  - 로그인 후 **첫 메뉴 화면 진입 때 세션당 1회만** 시도한다 (`prepare`). 로그아웃하면 `reset()` 으로 세션이 초기화된다.
 *  - 서버에서 받은 배너 중 우선순위가 높은 것부터, "오늘 하루 보지 않기"가 아니고 **이미지가 로드된** 첫 번째만 후보가 된다.
 *    (이미지가 늦거나 실패하면 팝업을 아예 띄우지 않는다 — 빈 팝업이 뜨는 것보다 낫다)
 *  - 후보가 준비됐을 때 사용자가 이미 메뉴를 담는 중이거나 다른 화면에 있으면 방해하지 않고 건너뛴다 (menu.tsx).
 *  - 불러오기는 화면을 막지 않으며, 실패하면 조용히 표시하지 않는다.
 */
import { Image } from 'expo-image';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { fetchBanners, reportBannerEvent, type Banner, type BannerEvent } from '@/api/banner-api';
import { BANNER_USER_KEY, hideForToday, isHiddenToday } from '@/storage/banner-store';

const IMAGE_TIMEOUT_MS = 3000;

async function imageReady(url: string): Promise<boolean> {
  try {
    return await Promise.race([
      Image.prefetch(url, { cachePolicy: 'disk' }),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), IMAGE_TIMEOUT_MS)),
    ]);
  } catch {
    return false;
  }
}

type BannerValue = {
  /** 표시 준비가 끝난 후보 (이미지 로드됨, 오늘 숨김 아님). 소비(show/skip)하면 비워진다. */
  candidate: Banner | null;
  /** 지금 팝업으로 떠 있는 배너 (/banner 화면이 읽음) */
  active: Banner | null;
  /** 세션당 한 번만 동작: 배너를 받아 후보를 만든다 */
  prepare: () => void;
  /** 후보를 팝업으로 확정한다 (노출 집계). 이후 /banner 로 이동해야 한다. */
  show: () => Banner | null;
  /** 후보를 표시하지 않고 버린다 (이 세션에서는 다시 안 뜸) */
  skip: () => void;
  /** 팝업을 닫는다. 'hide_today' 면 오늘 자정까지 이 배너를 숨긴다. */
  close: (how: Exclude<BannerEvent, 'impression'>) => Promise<void>;
  /** /banner 화면이 (뒤로가기 등으로) 사라질 때 정리 */
  clearActive: () => void;
  /** 로그아웃: 세션 초기화 → 다음 로그인 후 첫 메뉴 진입 때 다시 시도 */
  reset: () => void;
};

const BannerContext = createContext<BannerValue | null>(null);

export function BannerProvider({ children }: { children: ReactNode }) {
  const [candidate, setCandidate] = useState<Banner | null>(null);
  const [active, setActive] = useState<Banner | null>(null);
  const candidateRef = useRef<Banner | null>(null);
  const activeRef = useRef<Banner | null>(null);
  const startedRef = useRef(false);
  const sessionRef = useRef(0);

  const prepare = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const session = sessionRef.current;

    void (async () => {
      try {
        const banners = (await fetchBanners()).sort((a, b) => b.priority - a.priority);
        for (const b of banners) {
          if (await isHiddenToday(BANNER_USER_KEY, b.id)) continue;
          if (!(await imageReady(b.imageUrl))) continue;
          if (session !== sessionRef.current) return; // 그 사이 로그아웃함
          candidateRef.current = b;
          setCandidate(b);
          return;
        }
      } catch (e) {
        console.warn('[banner] 팝업 준비 실패 — 표시하지 않음', e);
      }
    })();
  }, []);

  const show = useCallback(() => {
    const b = candidateRef.current;
    if (!b) return null;
    candidateRef.current = null;
    setCandidate(null);
    activeRef.current = b;
    setActive(b);
    reportBannerEvent(b.id, 'impression');
    return b;
  }, []);

  const skip = useCallback(() => {
    candidateRef.current = null;
    setCandidate(null);
  }, []);

  const clearActive = useCallback(() => {
    activeRef.current = null;
    setActive(null);
  }, []);

  const close = useCallback(
    async (how: Exclude<BannerEvent, 'impression'>) => {
      const b = activeRef.current;
      clearActive();
      if (!b) return;
      reportBannerEvent(b.id, how);
      if (how === 'hide_today') await hideForToday(BANNER_USER_KEY, b.id);
    },
    [clearActive],
  );

  const reset = useCallback(() => {
    sessionRef.current += 1;
    startedRef.current = false;
    candidateRef.current = null;
    activeRef.current = null;
    setCandidate(null);
    setActive(null);
  }, []);

  const value = useMemo<BannerValue>(
    () => ({ candidate, active, prepare, show, skip, close, clearActive, reset }),
    [candidate, active, prepare, show, skip, close, clearActive, reset],
  );

  return <BannerContext.Provider value={value}>{children}</BannerContext.Provider>;
}

export function useBanners() {
  const ctx = useContext(BannerContext);
  if (!ctx) throw new Error('useBanners must be used inside <BannerProvider>');
  return ctx;
}
