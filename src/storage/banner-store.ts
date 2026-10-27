/**
 * 이벤트 팝업 "오늘 하루 보지 않기" 저장.
 *
 *   popup:{userKey}:{bannerId}:hideUntil  →  숨김이 끝나는 시각(epoch ms) = 기기 로컬 시간 기준 다음 자정
 *
 * 배너 id 별로 독립이다 — 오늘 어떤 팝업을 숨겼어도 새 이벤트 팝업은 뜬다.
 */
import { kv } from '@/storage/kv';

/**
 * 숨김 기록을 구분하는 사용자 키. 아직 인증이 없어서 고정값이다.
 * TODO: 로그인(userId)이 생기면 userId 로 교체 → 한 기기를 여러 계정이 써도 기록이 섞이지 않는다.
 */
export const BANNER_USER_KEY = 'anon';

const key = (userKey: string, bannerId: string) => `popup:${userKey}:${bannerId}:hideUntil`;

/** 기기 로컬 시간 기준 다음 자정 (epoch ms) */
export const nextLocalMidnight = (now = Date.now()) => {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
};

const MAX_HIDE_MS = 25 * 60 * 60 * 1000; // 자정까지는 최대 24시간(+여유 1시간)

export async function isHiddenToday(userKey: string, bannerId: string, now = Date.now()) {
  try {
    const raw = await kv.get(key(userKey, bannerId));
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    // 기기 시계를 앞당겼다 되돌린 경우 등 "너무 먼 미래" 로 저장된 값은 무시한다
    if (until - now > MAX_HIDE_MS) return false;
    return now < until;
  } catch {
    return false; // 저장소 오류 → 숨기지 않음 (팝업을 못 보는 것보다 한 번 더 보이는 쪽이 낫다)
  }
}

export async function hideForToday(userKey: string, bannerId: string, now = Date.now()) {
  try {
    await kv.set(key(userKey, bannerId), String(nextLocalMidnight(now)));
  } catch (e) {
    console.warn('[banner] 오늘 하루 보지 않기 저장 실패', e);
  }
}
