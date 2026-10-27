/**
 * 메뉴 데이터 저장소: 로컬 캐시 + 서버 버전 기반 갱신.
 *
 * 흐름 (자세한 설명은 docs/GUIDE.md "메뉴 캐시"):
 *  1. 학교가 정해지면 캐시를 읽어 즉시 렌더 → 백그라운드에서 GET /menu-version 확인
 *     · 같으면 아무것도 안 함 · 다르면 GET /menus → 검증 → JSON+localVersion 함께 교체 → 화면 갱신
 *     · 캐시가 없으면 GET /menus 를 바로 호출 (실패하면 재시도 화면)
 *  2. 버전 체크 시점: 앱 시작(학교가 정해진 시점) / 백그라운드→포그라운드 / 메뉴 화면 진입.
 *     마지막 체크 후 30초 이내면 생략, 진행 중인 체크는 하나로 합친다.
 *  3. 네트워크 실패: 캐시가 있으면 조용히 유지, 없을 때만 error.
 *  4. 학교가 바뀌면 이전 학교 캐시 삭제. 로그아웃은 캐시에 영향 없음 (이 Provider 는 로그인과 무관).
 *  5. 품절은 캐시하지 않는다 — 메뉴 화면 진입 시 refreshSoldOut() 으로 받아 메모리에만 둔다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { fetchMenus, fetchMenuStatus, fetchMenuVersion } from '@/api/menu-api';
import type { Cafe, MenuPayload } from '@/constants/coffeul';
import { useSchool } from '@/hooks/use-school';
import {
  diffImageUrls,
  forgetPrefetched,
  prefetchImages,
  thumbnailUrlsOf,
} from '@/storage/image-cache';
import { purgeOtherSchools, readMenuCache, writeMenuCache } from '@/storage/menu-cache';

export const MENU_CHECK_MIN_INTERVAL_MS = 30_000;

export type SyncReason = 'start' | 'foreground' | 'screen' | 'order-conflict' | 'retry';

/** loading: 캐시 없이 첫 로드 중 · error: 캐시도 없고 로드 실패 · ready: 표시할 메뉴 있음 */
export type MenuStatus = 'loading' | 'ready' | 'error';

type MenuValue = {
  payload: MenuPayload | null;
  status: MenuStatus;
  /** 선택한 카페(지점). payload 가 갱신되면 같이 최신 데이터로 바뀐다. */
  cafe: Cafe | null;
  selectCafe: (cafeId: string | null) => void;
  /** cafeId → 품절 메뉴 id 목록 (메모리 전용) */
  soldOut: Record<string, readonly string[]>;
  /**
   * 버전 체크 + 필요 시 갱신. `force` 면 30초 규칙과 버전 비교를 건너뛰고 /menus 를 바로 받는다.
   * 갱신 후(또는 생략/실패 시 기존) payload 를 돌려준다.
   */
  sync: (reason: SyncReason, opts?: { force?: boolean }) => Promise<MenuPayload | null>;
  retry: () => Promise<void>;
  refreshSoldOut: (cafeId: string) => Promise<void>;
  markSoldOut: (cafeId: string, menuIds: string[]) => void;
};

const MenuContext = createContext<MenuValue | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const { school } = useSchool();
  const schoolId = school?.id ?? null;

  const [payload, setPayload] = useState<MenuPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [soldOut, setSoldOut] = useState<Record<string, readonly string[]>>({});

  // 비동기 콜백에서 항상 "지금 값" 을 보기 위한 ref
  const payloadRef = useRef<MenuPayload | null>(null);
  const schoolRef = useRef<string | null>(null);
  const cafeIdRef = useRef<string | null>(null);
  const lastCheckRef = useRef<{ schoolId: string; at: number } | null>(null);
  const inflightRef = useRef<Promise<MenuPayload | null> | null>(null);

  const applyPayload = useCallback((next: MenuPayload | null) => {
    payloadRef.current = next;
    setPayload(next);
    if (next) setFailed(false);
  }, []);

  /** 검증된 새 메뉴를 저장하고 화면에 반영한다. 호출 전에 검증이 끝나 있어야 한다. */
  const commit = useCallback(
    async (sid: string, fresh: MenuPayload, prev: MenuPayload | null) => {
      try {
        await writeMenuCache(sid, fresh); // JSON + localVersion 을 한 번에 교체
      } catch (e) {
        console.warn('[menu] 캐시 저장 실패 — 이번 실행에서만 새 메뉴를 사용', e);
      }
      if (schoolRef.current !== sid) return; // 저장하는 사이 학교가 바뀜
      applyPayload(fresh);

      if (prev) {
        const { priority, rest } = diffImageUrls(prev, fresh, cafeIdRef.current);
        void prefetchImages(priority).then(() => prefetchImages(rest));
      }
    },
    [applyPayload],
  );

  const runSync = useCallback(
    (sid: string, reason: SyncReason, force = false): Promise<MenuPayload | null> => {
      if (inflightRef.current) {
        // 진행 중인 체크와 합친다. 다만 강제 갱신은 그 체크가 끝난 뒤 다시 수행.
        return force
          ? inflightRef.current.then(() => runSync(sid, reason, true))
          : inflightRef.current;
      }

      const prev = payloadRef.current;
      const last = lastCheckRef.current;
      if (
        prev &&
        !force &&
        last &&
        last.schoolId === sid &&
        Date.now() - last.at < MENU_CHECK_MIN_INTERVAL_MS
      ) {
        return Promise.resolve(prev);
      }
      lastCheckRef.current = { schoolId: sid, at: Date.now() };

      const execute = async (): Promise<MenuPayload | null> => {
        try {
          if (!prev || force) {
            const fresh = await fetchMenus(sid);
            await commit(sid, fresh, prev);
            return fresh;
          }
          const serverVersion = await fetchMenuVersion(sid);
          if (serverVersion === prev.version) return prev;
          const fresh = await fetchMenus(sid);
          await commit(sid, fresh, prev);
          return fresh;
        } catch (e) {
          if (!payloadRef.current && schoolRef.current === sid) setFailed(true);
          else console.warn(`[menu] sync(${reason}) 실패 — 기존 캐시 유지`, e);
          return payloadRef.current;
        }
      };
      const job = execute().finally(() => {
        if (inflightRef.current === job) inflightRef.current = null;
      });
      inflightRef.current = job;
      return job;
    },
    [commit],
  );

  // 학교가 정해지거나 바뀔 때: 이전 학교 캐시 삭제 → 캐시 로드 → 동기화 (= 앱 시작 시 체크 포함)
  useEffect(() => {
    schoolRef.current = schoolId;
    inflightRef.current = null;
    lastCheckRef.current = null;
    cafeIdRef.current = null;
    setCafeId(null);
    setSoldOut({});
    applyPayload(null);
    setFailed(false);
    if (!schoolId) return;

    let cancelled = false;
    (async () => {
      try {
        await purgeOtherSchools(schoolId);
        forgetPrefetched();
      } catch (e) {
        console.warn('[menu] 이전 학교 캐시 삭제 실패', e);
      }
      const cached = await readMenuCache(schoolId);
      if (cancelled) return;
      if (cached) applyPayload(cached); // 캐시로 먼저 즉시 렌더
      void runSync(schoolId, 'start'); // 캐시 있음: 버전 체크 / 없음: /menus
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, applyPayload, runSync]);

  // 백그라운드 → 포그라운드 복귀
  useEffect(() => {
    let wasBackground = false;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        wasBackground = true;
      } else if (next === 'active' && wasBackground) {
        wasBackground = false;
        if (schoolRef.current) void runSync(schoolRef.current, 'foreground');
      }
    });
    return () => sub.remove();
  }, [runSync]);

  const cafe = useMemo(
    () => payload?.cafes.find((c) => c.id === cafeId) ?? null,
    [payload, cafeId],
  );

  // 지금 보는 카페의 썸네일을 우선 prefetch (이미 받은 URL 은 건너뜀)
  useEffect(() => {
    if (cafe) void prefetchImages(thumbnailUrlsOf(cafe));
  }, [cafe]);

  const selectCafe = useCallback((id: string | null) => {
    cafeIdRef.current = id;
    setCafeId(id);
  }, []);

  const sync = useCallback<MenuValue['sync']>(
    (reason, opts) =>
      schoolRef.current
        ? runSync(schoolRef.current, reason, opts?.force)
        : Promise.resolve(null),
    [runSync],
  );

  const retry = useCallback(async () => {
    setFailed(false);
    if (schoolRef.current) await runSync(schoolRef.current, 'retry', true);
  }, [runSync]);

  const refreshSoldOut = useCallback(async (id: string) => {
    try {
      const ids = await fetchMenuStatus(id);
      setSoldOut((prev) => ({ ...prev, [id]: ids }));
    } catch {
      // 실패하면 직전 표시를 유지 (주문 시 서버가 다시 검증한다)
    }
  }, []);

  const markSoldOut = useCallback((id: string, menuIds: string[]) => {
    setSoldOut((prev) => ({ ...prev, [id]: [...new Set([...(prev[id] ?? []), ...menuIds])] }));
  }, []);

  const value = useMemo<MenuValue>(
    () => ({
      payload,
      status: payload ? 'ready' : failed ? 'error' : 'loading',
      cafe,
      selectCafe,
      soldOut,
      sync,
      retry,
      refreshSoldOut,
      markSoldOut,
    }),
    [payload, failed, cafe, selectCafe, soldOut, sync, retry, refreshSoldOut, markSoldOut],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used inside <MenuProvider>');
  return ctx;
}
