/**
 * 내 프로필(닉네임). 개인 데이터라 디스크에 캐시하지 않고 메모리에만 둔다 (로그인/메뉴 진입 때 새로 받음).
 * 로그아웃하면 `reset()` (use-logout.ts).
 *
 * 인증이 붙기 전이라 "누구의" 프로필인지는 서버(목업은 한 명)가 안다.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { fetchMe } from '@/api/profile-api';

type ProfileValue = {
  /** 아직 못 받았거나 로그아웃 상태면 null */
  nickname: string | null;
  refresh: () => Promise<void>;
  /** 가입/변경 성공 응답을 바로 반영 */
  setNickname: (nickname: string) => void;
  reset: () => void;
};

const ProfileContext = createContext<ProfileValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [nickname, setNicknameState] = useState<string | null>(null);
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const run = ++seq.current;
    try {
      const me = await fetchMe();
      if (run === seq.current) setNicknameState(me.nickname);
    } catch (e) {
      console.warn('[profile] 내 정보를 불러오지 못함 — 기존 값 유지', e);
    }
  }, []);

  const setNickname = useCallback((n: string) => {
    seq.current += 1; // 진행 중이던 낡은 refresh 응답이 방금 바꾼 값을 덮어쓰지 않게
    setNicknameState(n);
  }, []);

  const reset = useCallback(() => {
    seq.current += 1;
    setNicknameState(null);
  }, []);

  const value = useMemo(
    () => ({ nickname, refresh, setNickname, reset }),
    [nickname, refresh, setNickname, reset],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
}
