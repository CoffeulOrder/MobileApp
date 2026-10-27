/**
 * 이벤트 배너(팝업) API. 노출 기간·대상(학교, 이벤트 미달성자 등)은 **서버가 걸러서** 내려준다 —
 * 앱은 기기 시계로 이벤트 기간을 판단하지 않는다.
 *
 *   GET  /banners             -> { banners: [{ id, title, imageUrl, priority, link? }] }
 *   POST /banners/{id}/events -> (본문 무시)  body: { event: 'impression' | 'open' | 'close' | 'hide_today' }  (성과 측정용, 실패해도 무시)
 *
 * link:
 *   { type: 'route', path: '/coupons' }   앱 내부 화면 — **허용 목록(BANNER_ROUTES)에 있는 경로만** 연다
 *   { type: 'url',   url: 'https://…' }   외부 페이지 — https 만 허용, 인앱 브라우저로 연다
 *
 * ⚠️ 경로/형태는 협의된 스펙이 없어 가정한 것이다. 백엔드와 맞춰야 함 (docs/GUIDE.md §15).
 * 이미지(imageUrl)는 문구가 들어간 완성된 마케팅 이미지를 가정한다 (앱은 텍스트를 덧그리지 않음).
 */
import { apiRequest } from '@/api/client';
import { SchemaError } from '@/api/menu-schema';

/** 배너가 열 수 있는 앱 내부 경로 (허용 목록). 친구 초대 화면이 생기면 '/invite' 를 추가한다. */
export const BANNER_ROUTES = ['/menu', '/branch', '/coupons', '/notifications', '/payment-methods'] as const;
export type BannerRoute = (typeof BANNER_ROUTES)[number];

export type BannerLink = { type: 'route'; path: BannerRoute } | { type: 'url'; url: string };

export type Banner = {
  id: string;
  /** 접근성 라벨 용 (이미지에 글이 들어 있으므로 화면에는 그리지 않음) */
  title: string;
  imageUrl: string;
  /** 클수록 먼저. 한 번에 팝업은 1개만 뜬다. */
  priority: number;
  link?: BannerLink;
};

export type BannerEvent = 'impression' | 'open' | 'close' | 'hide_today';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

function parseLink(raw: unknown): BannerLink | undefined {
  // 잘못되거나 허용되지 않은 링크는 에러가 아니라 "링크 없음" 으로 취급 (팝업은 보여주되 이동은 막음)
  if (!isObj(raw)) return undefined;
  if (raw.type === 'route' && BANNER_ROUTES.includes(raw.path as BannerRoute)) {
    return { type: 'route', path: raw.path as BannerRoute };
  }
  if (raw.type === 'url' && isStr(raw.url) && raw.url.startsWith('https://')) {
    return { type: 'url', url: raw.url };
  }
  return undefined;
}

export function parseBanners(raw: unknown): Banner[] {
  if (!isObj(raw) || !Array.isArray(raw.banners)) throw new SchemaError('banners');
  const out: Banner[] = [];
  for (const b of raw.banners) {
    // 배너 하나가 깨져 있어도 나머지는 살린다
    if (!isObj(b) || !isStr(b.id) || !isStr(b.imageUrl)) continue;
    out.push({
      id: b.id,
      title: isStr(b.title) ? b.title : '이벤트',
      imageUrl: b.imageUrl,
      priority: typeof b.priority === 'number' ? b.priority : 0,
      link: parseLink(b.link),
    });
  }
  return out;
}

export async function fetchBanners(): Promise<Banner[]> {
  return parseBanners(await apiRequest('GET', '/banners'));
}

/** 노출/클릭/숨김 집계. 실패해도 사용자 흐름에 영향이 없도록 결과를 기다리지도, 에러를 던지지도 않는다. */
export function reportBannerEvent(bannerId: string, event: BannerEvent): void {
  apiRequest('POST', `/banners/${encodeURIComponent(bannerId)}/events`, { event }).catch(() => {});
}
