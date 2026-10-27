/**
 * 교환권 API (개인 데이터 — 캐시하지 않고 화면에 들어올 때마다 조회한다).
 *
 *   GET /vouchers -> { vouchers: [...], notice? }   (notice: 유의사항 등 서버가 주는 안내 문구)
 *
 * 주문 미리보기(`POST /orders/quote`)는 menu-api.ts 에 있다.
 * ⚠️ 두 엔드포인트의 경로/형태는 협의된 스펙이 없어 가정한 것이다. 백엔드와 맞춰야 함 (docs/GUIDE.md §14).
 */
import { apiRequest } from '@/api/client';
import { parseVoucherList, type VoucherList } from '@/api/voucher-schema';

export async function fetchVouchers(): Promise<VoucherList> {
  return parseVoucherList(await apiRequest('GET', '/vouchers'));
}
