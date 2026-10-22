/**
 * ORMO (ORSO Mobile Order) design tokens — light theme.
 * Brand palette: blue #008AFF / ink #111827 / gray #D9D9D9 / tint #F3F6FF.
 * UI-only mock: colors, spacing, radius, schools, branches and menu seed data.
 */

export const C = {
  /** page background (brand tint) */
  bg: '#F3F6FF',
  /** raised surfaces: cards, inputs, sheets */
  surface: '#FFFFFF',
  /** recessed / placeholder areas: thumbnails, suffix chips, pressed rows */
  surfaceAlt: '#E8EEFB',
  /** hairlines */
  border: '#D9D9D9',
  /** brand blue */
  primary: '#008AFF',
  primaryDim: '#006FD0',
  /** text sitting on top of `primary` */
  onPrimary: '#FFFFFF',
  /** brand ink: dark badges, wordmark */
  ink: '#111827',
  /** text sitting on top of `ink` */
  onInk: '#FFFFFF',
  /** text */
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#8A92A0',
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export type School = {
  id: string;
  name: string;
  /** 이 학교의 이메일 도메인 ("@" 제외). 로그인/회원가입 시 접미사로 고정됨. */
  emailDomain: string;
};

/**
 * 서비스 중인 학교 목록 (목업 데이터).
 * TODO: 백엔드 연동 시 API 응답으로 교체 — 화면은 `useSchools()` 로만 접근한다.
 */
export const SCHOOLS: School[] = [
  { id: 'konkuk', name: '건국대학교', emailDomain: 'konkuk.ac.kr' },
  { id: 'hanyang', name: '한양대학교', emailDomain: 'hanyang.ac.kr' },
  { id: 'snu', name: '서울대학교', emailDomain: 'snu.ac.kr' },
];


/**
 * 메뉴 데이터 타입. 서버(`GET /schools/{id}/menus`) 응답 형태와 같고, 로컬 캐시에도 이 모양 그대로 저장된다.
 * 학교(School) → 카페(Cafe, UI 용어로는 "지점") → 메뉴(MenuItem).
 */
export type MenuItem = {
  id: string;
  name: string;
  desc: string;
  /** 표시용 가격. 실제 결제 금액은 주문 시 서버가 검증한다. */
  price: number;
  category: string;
  /** 목록(카드)용 작은 이미지 */
  thumbnailUrl?: string;
  /** 상세용 큰 이미지 (현재 상세 화면은 없음) */
  imageUrl?: string;
};

export type Cafe = {
  id: string;
  name: string;
  /** 주문번호 접두어 (예: BS-114067) */
  code: string;
  menus: MenuItem[];
};

export type MenuPayload = {
  /** 학교 단위 menu_version (정수). 바뀔 때만 메뉴를 다시 받는다. */
  version: number;
  cafes: Cafe[];
};

/**
 * 주문 후 가게 사정(재료 소진 등)으로 일부 메뉴가 취소될 때의 처리 방식. 주문할 때 고객이 고른다.
 *  - ALLOW_PARTIAL: 취소된 메뉴만 환불하고 나머지 주문은 그대로 진행
 *  - CANCEL_ALL   : 일부라도 취소되면 주문 전체를 취소하고 전액 환불
 * 실제 취소/환불은 서버가 수행하며, 앱은 선택값을 `POST /orders` 의 `cancelPolicy` 로 보낸다.
 */
export type CancelPolicy = 'ALLOW_PARTIAL' | 'CANCEL_ALL';

export const DEFAULT_CANCEL_POLICY: CancelPolicy = 'ALLOW_PARTIAL';

export const CANCEL_POLICY_OPTIONS: {
  value: CancelPolicy;
  title: string;
  desc: string;
  /** 주문 완료 화면 등에서 짧게 보여줄 때 */
  short: string;
}[] = [
  {
    value: 'ALLOW_PARTIAL',
    title: '부분 취소 허용',
    desc: '만들 수 없는 메뉴만 취소하고, 나머지는 그대로 준비해요. 취소된 메뉴 금액만 환불돼요.',
    short: '부분 취소 허용',
  },
  {
    value: 'CANCEL_ALL',
    title: '전체 취소',
    desc: '일부 메뉴라도 취소되면 주문 전체를 취소하고 전액 환불해요.',
    short: '전체 취소',
  },
];

/**
 * 교환권/쿠폰. 개인 계정에 귀속되며 양도할 수 없다(코드 입력/선물 기능 없음).
 * 지금은 "매장별 특정 메뉴 교환권"(MENU_EXCHANGE)만 있고, 금액권(매장/앱 단위)은 `kind` 를 추가하는 식으로 얹는다.
 * 서버가 모르는 kind 를 내려줘도 앱이 죽지 않도록 파서가 알 수 없는 kind 는 건너뛴다 (api/voucher-schema.ts).
 *
 * 유효기간(`expiresAt`)은 서버가 주는 절대 시각이며, 앱은 표시(D-day)에만 쓰고 사용 가능 여부는 서버가 판단한다.
 */
export type VoucherStatus = 'AVAILABLE' | 'USED' | 'EXPIRED';

export type Voucher = {
  id: string;
  /** 서버가 주는 표시 이름. 예: "아메리카노 교환권" */
  title: string;
  status: VoucherStatus;
  /** ISO 8601 */
  expiresAt: string;
} & {
  kind: 'MENU_EXCHANGE';
  cafeId: string;
  /** 메뉴가 단종돼도 보여줄 수 있도록 서버가 함께 내려주는 표시용 이름 */
  cafeName: string;
  menuId: string;
  menuName: string;
};
// 이후: | { kind: 'CAFE_CREDIT'; cafeId: string; balance: number } | { kind: 'APP_CREDIT'; balance: number }

/** 한 주문에 쓸 수 있는 교환권 수 (API 는 배열이라 나중에 늘려도 요청 형태가 안 바뀐다) */
export const MAX_VOUCHERS_PER_ORDER = 1;

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 2027.06.30 */
export const formatDate = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
};

/** 만료까지 남은 일수 (표시용). 오늘 만료면 0, 지났으면 음수. */
export const daysLeft = (iso: string, now = Date.now()) =>
  Math.ceil((new Date(iso).getTime() - now) / 86_400_000);
