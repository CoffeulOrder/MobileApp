/**
 * 교환권 / 주문 미리보기(quote) 응답 검증.
 * 알 수 없는 kind 의 교환권은 에러가 아니라 "건너뛴다" — 서버가 새 종류(금액권 등)를 먼저 내려줘도
 * 구버전 앱이 목록을 통째로 못 보여주는 일이 없도록.
 */
import { SchemaError } from '@/api/menu-schema';
import type { Voucher, VoucherStatus } from '@/constants/coffeul';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const STATUSES: VoucherStatus[] = ['AVAILABLE', 'USED', 'EXPIRED'];

function parseVoucher(raw: unknown): Voucher | null {
  if (!isObj(raw)) throw new SchemaError('voucher');
  if (raw.kind !== 'MENU_EXCHANGE') return null; // 모르는 종류는 건너뜀
  const { id, title, status, expiresAt, cafeId, cafeName, menuId, menuName } = raw;
  if (!isStr(id) || !isStr(title) || !isStr(cafeId) || !isStr(menuId)) throw new SchemaError('voucher.fields');
  if (!STATUSES.includes(status as VoucherStatus)) throw new SchemaError('voucher.status');
  if (!isStr(expiresAt) || Number.isNaN(Date.parse(expiresAt))) throw new SchemaError('voucher.expiresAt');
  return {
    kind: 'MENU_EXCHANGE',
    id,
    title,
    status: status as VoucherStatus,
    expiresAt,
    cafeId,
    cafeName: isStr(cafeName) ? cafeName : '',
    menuId,
    menuName: isStr(menuName) ? menuName : '',
  };
}

export type VoucherList = { vouchers: Voucher[]; notice?: string };

export function parseVoucherList(raw: unknown): VoucherList {
  if (!isObj(raw) || !Array.isArray(raw.vouchers)) throw new SchemaError('vouchers');
  const vouchers = raw.vouchers.map(parseVoucher).filter((v): v is Voucher => v !== null);
  return { vouchers, notice: isStr(raw.notice) ? raw.notice : undefined };
}

export type QuoteDiscount = { voucherId: string; amount: number; label: string };
/** 내 교환권 각각이 "지금 이 장바구니에" 적용 가능한지 (서버 판단 + 사유 문구) */
export type VoucherState = { id: string; applicable: boolean; reason?: string };
export type Quote = {
  subtotal: number;
  discounts: QuoteDiscount[];
  total: number;
  vouchers: VoucherState[];
};

export function parseQuote(raw: unknown): Quote {
  if (!isObj(raw) || !isNum(raw.subtotal) || !isNum(raw.total)) throw new SchemaError('quote');
  if (!Array.isArray(raw.discounts) || !Array.isArray(raw.vouchers)) throw new SchemaError('quote.lists');
  return {
    subtotal: raw.subtotal,
    total: raw.total,
    discounts: raw.discounts.map((d) => {
      if (!isObj(d) || !isStr(d.voucherId) || !isNum(d.amount)) throw new SchemaError('quote.discount');
      return { voucherId: d.voucherId, amount: d.amount, label: isStr(d.label) ? d.label : '교환권' };
    }),
    vouchers: raw.vouchers.map((v) => {
      if (!isObj(v) || !isStr(v.id) || typeof v.applicable !== 'boolean') throw new SchemaError('quote.voucher');
      return { id: v.id, applicable: v.applicable, reason: isStr(v.reason) ? v.reason : undefined };
    }),
  };
}
