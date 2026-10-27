/**
 * 메뉴 JSON + 로컬 버전의 디스크 캐시.
 *
 *   menu:{schoolId}         메뉴 JSON (payload 전체, version 포함)
 *   menuVersion:{schoolId}  localVersion (문자열)
 *
 * 원자성: ① 서버 응답은 `parseMenuPayload` 검증을 통과한 것만 저장하고, ② 두 키를 `multiSet` 한 번으로
 * 같이 쓰며, ③ 읽을 때 JSON 안의 version 과 menuVersion 키가 일치하는지 확인해 어긋나면(쓰기 중 종료 등)
 * 캐시가 없는 것으로 취급한다. 그래서 반쯤 덮어써진 캐시를 쓰는 일은 없다.
 */
import { Image } from 'expo-image';

import { parseMenuPayload } from '@/api/menu-schema';
import type { MenuPayload } from '@/constants/coffeul';
import { kv } from '@/storage/kv';

const MENU_PREFIX = 'menu:';
const VERSION_PREFIX = 'menuVersion:';

const menuKey = (schoolId: string) => `${MENU_PREFIX}${schoolId}`;
const versionKey = (schoolId: string) => `${VERSION_PREFIX}${schoolId}`;

export async function readMenuCache(schoolId: string): Promise<MenuPayload | null> {
  try {
    const [[, json], [, storedVersion]] = await kv.multiGet([menuKey(schoolId), versionKey(schoolId)]);
    if (!json || storedVersion == null) return null;
    const payload = parseMenuPayload(JSON.parse(json));
    if (String(payload.version) !== storedVersion) return null;
    return payload;
  } catch {
    // 깨진 캐시 → 없는 것으로 취급 (다음 성공 응답이 덮어씀)
    return null;
  }
}

/** JSON 과 localVersion 을 함께 교체한다. 실패하면 throw (이전 캐시는 그대로). */
export async function writeMenuCache(schoolId: string, payload: MenuPayload): Promise<void> {
  await kv.multiSet([
    [menuKey(schoolId), JSON.stringify(payload)],
    [versionKey(schoolId), String(payload.version)],
  ]);
}

/**
 * `keepSchoolId` 가 아닌 모든 학교의 메뉴 캐시를 지운다 (학교가 바뀐 경우).
 * 지운 게 있으면 이미지 디스크 캐시도 비운다 (이전 학교 이미지는 더 쓰이지 않음).
 * 로그아웃 시에는 호출하지 않는다 — 메뉴는 공개 데이터라 유지.
 */
export async function purgeOtherSchools(keepSchoolId: string): Promise<void> {
  const keys = await kv.getAllKeys();
  const stale = keys.filter(
    (k) =>
      (k.startsWith(MENU_PREFIX) && k !== menuKey(keepSchoolId)) ||
      (k.startsWith(VERSION_PREFIX) && k !== versionKey(keepSchoolId)),
  );
  if (stale.length === 0) return;
  await kv.multiRemove(stale);
  try {
    await Image.clearDiskCache();
    await Image.clearMemoryCache();
  } catch {
    // 웹 등 미지원 플랫폼 — 무시
  }
}
