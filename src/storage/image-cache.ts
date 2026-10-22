/**
 * 메뉴 이미지 prefetch. 디스크 캐시는 expo-image 가 URL 을 키로 관리한다
 * (`<Image cachePolicy="disk">`, prefetch 도 'disk') → URL 이 같으면 다시 받지 않는다.
 *
 * 규칙
 *  - 첫 로드(이전 메뉴 없음): 전체 선다운로드 금지. 지금 보는 카페의 썸네일만 prefetch (`thumbnailUrlsOf`).
 *  - 메뉴 갱신: 이전 JSON 에 없던(= 바뀌거나 새로 생긴) URL 만 prefetch (`diffImageUrls`).
 *      우선순위 1: 현재 카페의 썸네일 + 상세 이미지
 *      우선순위 2: 다른 카페의 썸네일 (상세 이미지는 필요해질 때 받음)
 */
import { Image } from 'expo-image';

import type { Cafe, MenuPayload } from '@/constants/coffeul';

/** 이번 실행 중 prefetch 에 성공한 URL (같은 URL 을 반복 요청하지 않기 위한 것) */
const done = new Set<string>();

export function forgetPrefetched() {
  done.clear();
}

export async function prefetchImages(urls: readonly (string | undefined)[]): Promise<void> {
  const todo = [...new Set(urls.filter((u): u is string => !!u && !done.has(u)))];
  if (todo.length === 0) return;
  try {
    const ok = await Image.prefetch(todo, { cachePolicy: 'disk' });
    if (ok) todo.forEach((u) => done.add(u));
  } catch {
    // 오프라인 등 — 화면에 보일 때 expo-image 가 다시 시도한다
  }
}

export const thumbnailUrlsOf = (cafe: Cafe) => cafe.menus.map((m) => m.thumbnailUrl);

export function diffImageUrls(prev: MenuPayload, next: MenuPayload, priorityCafeId: string | null) {
  const before = new Set<string>();
  for (const cafe of prev.cafes) {
    for (const m of cafe.menus) {
      if (m.thumbnailUrl) before.add(m.thumbnailUrl);
      if (m.imageUrl) before.add(m.imageUrl);
    }
  }

  const priority: string[] = [];
  const rest: string[] = [];
  for (const cafe of next.cafes) {
    const isCurrent = cafe.id === priorityCafeId;
    for (const m of cafe.menus) {
      if (m.thumbnailUrl && !before.has(m.thumbnailUrl)) (isCurrent ? priority : rest).push(m.thumbnailUrl);
      if (isCurrent && m.imageUrl && !before.has(m.imageUrl)) priority.push(m.imageUrl);
    }
  }
  return { priority, rest };
}
