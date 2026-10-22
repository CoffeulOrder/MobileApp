/**
 * 메뉴/주문 관련 API.
 *
 *   GET  /schools/{schoolId}/menu-version -> { version }
 *   GET  /schools/{schoolId}/menus        -> { version, cafes: [...] }
 *   GET  /cafes/{cafeId}/menu-status      -> { soldOutMenuIds: [] }
 *   POST /orders/quote                    -> { subtotal, discounts[], total, vouchers[] }  | 409 MENU_CHANGED
 *   POST /orders                          -> { orderNo, total }   | 409 { code: MENU_CHANGED | MENU_SOLD_OUT | VOUCHER_UNAVAILABLE, ... }
 *
 * ⚠️ POST /orders 의 요청/응답 형태는 협의된 스펙이 없어 아래와 같이 가정했다. 백엔드와 맞춰야 함:
 *   요청  { schoolId, cafeId, menuVersion, items: [{ menuId, qty }], paymentMethod, cancelPolicy, vouchers: [{ id }] }
 *         paymentMethod: 결제액이 0원(교환권으로 전액 충당)이면 'NONE' — PG 를 거치지 않는다
 *         cancelPolicy: 'ALLOW_PARTIAL'(부분 취소 허용) | 'CANCEL_ALL'(일부 취소 시 전체 취소)
 *   성공  { orderNo, total }   (total = 실제 결제 금액)
 *   409   { code: 'MENU_CHANGED' }                          (menuVersion 이 서버 최신과 다름)
 *         { code: 'MENU_SOLD_OUT', menuIds: string[] }      (품절된 메뉴 id)
 *         { code: 'VOUCHER_UNAVAILABLE', voucherIds: string[], reason?: string }  (만료/사용됨/조건 불충족 등)
 *
 * 주문 미리보기(quote): 요청은 주문과 같은 필드 중 { schoolId, cafeId, menuVersion, items, vouchers } .
 *   vouchers 를 비워 보내도 응답의 `vouchers[]` 로 "내 교환권이 지금 이 장바구니에 적용 가능한지"(+사유)를 받는다.
 *   할인 금액/규칙은 전부 서버가 계산한다 — 앱은 받은 금액을 표시만 한다.
 */
import { apiRequest } from '@/api/client';
import { parseMenuPayload, parseSoldOutIds, parseVersion } from '@/api/menu-schema';
import { parseQuote, type Quote } from '@/api/voucher-schema';
import type { CancelPolicy, MenuPayload } from '@/constants/coffeul';

export async function fetchMenuVersion(schoolId: string): Promise<number> {
  return parseVersion(await apiRequest('GET', `/schools/${encodeURIComponent(schoolId)}/menu-version`));
}

/** 검증(parse)까지 통과한 payload 만 돌려준다 → 호출한 쪽은 믿고 저장해도 된다. */
export async function fetchMenus(schoolId: string): Promise<MenuPayload> {
  return parseMenuPayload(await apiRequest('GET', `/schools/${encodeURIComponent(schoolId)}/menus`));
}

export async function fetchMenuStatus(cafeId: string): Promise<string[]> {
  return parseSoldOutIds(await apiRequest('GET', `/cafes/${encodeURIComponent(cafeId)}/menu-status`));
}

export type OrderRequest = {
  schoolId: string;
  cafeId: string;
  /** 주문 시점에 클라이언트가 가진 메뉴 버전 */
  menuVersion: number;
  items: { menuId: string; qty: number }[];
  paymentMethod: string;
  /** 가게 사정으로 일부 메뉴가 취소될 때의 처리 (주문 시 고객이 선택) */
  cancelPolicy: CancelPolicy;
  /** 사용할 교환권. 없으면 빈 배열 */
  vouchers: { id: string }[];
};

export type OrderResult = { orderNo?: string; total?: number };

export type QuoteRequest = Pick<OrderRequest, 'schoolId' | 'cafeId' | 'menuVersion' | 'items' | 'vouchers'>;

export async function quoteOrder(req: QuoteRequest): Promise<Quote> {
  return parseQuote(await apiRequest('POST', '/orders/quote', req));
}

export async function postOrder(req: OrderRequest): Promise<OrderResult> {
  return apiRequest<OrderResult>('POST', '/orders', req);
}
