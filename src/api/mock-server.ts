/**
 * 앱 안에서 도는 가짜 백엔드 (EXPO_PUBLIC_API_URL 이 없을 때만 사용됨).
 * 실제 서버가 협의된 스펙대로 응답한다고 가정하고 같은 모양의 JSON 을 돌려준다.
 *
 * 메모리에만 있으므로 앱을 다시 불러오면 버전·가격·품절이 초기값(version 1)으로 돌아간다.
 *
 * 개발 중 콘솔에서 시나리오를 재현하기 위한 제어판이 `globalThis.__ormoMock` 에 노출된다 (__DEV__ 한정):
 *   __ormoMock.setOffline(true)                      // 네트워크 끊김 흉내 (비행기 모드)
 *   __ormoMock.setPrice('americano', 4500)           // 가격 변경 + 학교 menu_version 증가
 *   __ormoMock.bumpVersion('konkuk')                 // 내용 변경 없이 버전만 증가
 *   __ormoMock.setSoldOut('beomseok', 'latte', true) // 품절 토글 (버전은 안 바뀜: 품절은 캐시 대상이 아님)
 *   __ormoMock.calls                                 // 지금까지 받은 요청 목록
 *   __ormoMock.state.lastOrder                       // 마지막 주문 요청 본문 (cancelPolicy 등)
 *   __ormoMock.discontinueMenu('americano')          // 메뉴 단종 (모든 카페에서 제거 + 버전 증가). 교환권은 유효기간까지 보관됨
 *   __ormoMock.expireVoucher('v-americano')          // 교환권을 만료 처리 (앱이 모르는 사이 만료되는 상황)
 *   __ormoMock.state.vouchers                        // 내 교환권 목록
 *   __ormoMock.takeNickname('졸린라떼')               // 다른 사용자가 그 닉네임을 먼저 가져간 상황 재현 (확인 후 가입/변경 사이)
 *   __ormoMock.state.me                              // 내 프로필 (nickname)
 *   __ormoMock.setBanners([...])                     // 이벤트 팝업 목록 교체 (빈 배열이면 팝업 없음)
 *   __ormoMock.state.bannerEvents                    // 서버가 받은 노출/클릭/숨김 집계
 */
import { ApiError, NetworkError } from '@/api/errors';
import { validateNickname } from '@/constants/nickname';
import { MAX_VOUCHERS_PER_ORDER, SCHOOLS, type Cafe, type MenuItem, type Voucher } from '@/constants/coffeul';

const photo = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

function menu(
  id: string,
  name: string,
  desc: string,
  price: number,
  category: string,
  photoId?: string,
): MenuItem {
  return {
    id,
    name,
    desc,
    price,
    category,
    thumbnailUrl: photoId ? photo(photoId, 240) : undefined,
    imageUrl: photoId ? photo(photoId, 800) : undefined,
  };
}

const baseMenus = (): MenuItem[] => [
  menu('espresso', '에스프레소', '진하고 풍부한 에스프레소 샷', 3500, '에스프레소', '1510591509098-f4fdc6d0ff04'),
  menu('americano', '아메리카노', '에스프레소에 물을 더해 깔끔하게', 4000, '에스프레소', '1521302080334-4bebac2763a6'),
  menu('cappuccino', '카푸치노', '에스프레소, 스팀밀크, 우유 거품의 조화', 5000, '에스프레소', '1534778101976-62847782c213'),
  menu('latte', '카페 라떼', '부드러운 스팀밀크와 에스프레소', 5000, '에스프레소', '1541167760496-1628856ab772'),
  menu('vanilla-latte', '바닐라 라떼', '달콤한 바닐라 시럽이 어우러진 라떼', 5500, '에스프레소', '1461023058943-07fcbe16d735'),
  menu('choco', '초콜릿 라떼', '진한 초콜릿과 우유의 달콤한 만남', 5500, '논커피', '1517578239113-b03992dcdd25'),
  menu('milk-tea', '밀크티', '홍차와 우유가 어우러진 부드러운 맛', 5000, '논커피'),
  menu('earl-grey', '얼그레이', '베르가못 향이 은은한 홍차', 4500, '티', '1594631252845-29fc4cc8cde9'),
  menu('peppermint', '페퍼민트', '상쾌하고 깔끔한 허브티', 4500, '티'),
  menu('cheesecake', '뉴욕 치즈케이크', '꾸덕하고 진한 클래식 치즈케이크', 6500, '디저트', '1533134242443-d4fd215305ad'),
  menu('brownie', '브라우니', '겉은 바삭 속은 촉촉한 초코 브라우니', 5000, '디저트'),
];

/** 학교별 카페 (목업). 카페마다 같은 기본 메뉴를 쓰되 일부만 다르게 한다. */
const initialCafes = (): Record<string, Cafe[]> => ({
  konkuk: [
    { id: 'beomseok', name: '범석관', code: 'BS', menus: baseMenus() },
    {
      id: 'newmillennium',
      name: '뉴밀레니엄관',
      code: 'NM',
      menus: baseMenus().filter((m) => m.id !== 'brownie'),
    },
  ],
  hanyang: [
    { id: 'hy-library', name: '중앙도서관', code: 'HL', menus: baseMenus() },
    { id: 'hy-union', name: '학생회관', code: 'HU', menus: baseMenus().filter((m) => m.category !== '티') },
  ],
  snu: [{ id: 'snu-library', name: '중앙도서관', code: 'SL', menus: baseMenus() }],
});

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

/** 내 교환권 (목업: 건국대 계정 기준). 만료 임박/사용 완료/만료 예시를 하나씩 둔다. */
const initialVouchers = (): Voucher[] => [
  { kind: 'MENU_EXCHANGE', id: 'v-americano', title: '아메리카노 교환권', status: 'AVAILABLE', expiresAt: inDays(300), cafeId: 'beomseok', cafeName: '범석관', menuId: 'americano', menuName: '아메리카노' },
  { kind: 'MENU_EXCHANGE', id: 'v-latte-nm', title: '카페 라떼 교환권', status: 'AVAILABLE', expiresAt: inDays(300), cafeId: 'newmillennium', cafeName: '뉴밀레니엄관', menuId: 'latte', menuName: '카페 라떼' },
  { kind: 'MENU_EXCHANGE', id: 'v-brownie', title: '브라우니 교환권', status: 'AVAILABLE', expiresAt: inDays(12), cafeId: 'beomseok', cafeName: '범석관', menuId: 'brownie', menuName: '브라우니' },
  { kind: 'MENU_EXCHANGE', id: 'v-cappuccino', title: '카푸치노 교환권', status: 'USED', expiresAt: inDays(200), cafeId: 'beomseok', cafeName: '범석관', menuId: 'cappuccino', menuName: '카푸치노' },
  { kind: 'MENU_EXCHANGE', id: 'v-earl-grey', title: '얼그레이 교환권', status: 'EXPIRED', expiresAt: inDays(-5), cafeId: 'beomseok', cafeName: '범석관', menuId: 'earl-grey', menuName: '얼그레이' },
];

/**
 * 이벤트 팝업 (목업). 실제로는 서버가 기간/대상을 걸러서 내려준다. 이미지는 마케팅이 만든 문구 포함 이미지를 가정하지만
 * 목업은 사진만 쓴다. 첫 번째 배너의 링크는 친구 초대 화면(미구현)이 생기기 전까지 쿠폰 화면으로 연결해 둔 임시값.
 */
const initialBanners = () => [
  {
    id: 'invite-event',
    title: '친구 초대하고 교환권 받기',
    imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=800&h=1000&q=70&auto=format&fit=crop',
    priority: 10,
    link: { type: 'route', path: '/coupons' } as unknown,
  },
  {
    id: 'semester-event',
    title: '개강 기념 이벤트',
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&h=1000&q=70&auto=format&fit=crop',
    priority: 5,
    link: { type: 'url', url: 'https://docs.expo.dev' } as unknown,
  },
];

/** 이미 사용 중인 닉네임(소문자). 중복 판정은 대소문자 구분 없이 한다. */
const initialNicknames = () => new Set(['졸린라떼', '행복한모카', '달콤한푸딩', '테스트', 'admin']);
/** 운영 사칭 등으로 쓸 수 없는 단어 (포함되면 불가). 실제 서버는 금칙어 정책을 따로 가진다. */
const FORBIDDEN_WORDS = ['관리자', '운영자', 'admin', 'ormo'];

const state = {
  offline: false,
  latencyMs: 250,
  versions: Object.fromEntries(SCHOOLS.map((s) => [s.id, 1])) as Record<string, number>,
  cafes: initialCafes(),
  vouchers: initialVouchers(),
  nicknames: initialNicknames(),
  /** 목업의 내 계정 (인증이 없어서 한 명) */
  me: { nickname: '졸린라떼' },
  banners: initialBanners() as unknown[],
  bannerEvents: [] as { id: string; event: string }[],
  soldOut: {} as Record<string, Set<string>>,
  calls: [] as string[],
  /** 마지막으로 받은 POST /orders 본문 (전송 내용 확인용) */
  lastOrder: null as unknown,
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** 닉네임 상태: 형식 → 금칙어 → 중복 순으로 판정 */
function nicknameStatus(nickname: string): { available: true } | { available: false; reason: 'TAKEN' | 'INVALID' | 'FORBIDDEN' } {
  if (validateNickname(nickname) !== null) return { available: false, reason: 'INVALID' };
  const lower = nickname.toLowerCase();
  if (FORBIDDEN_WORDS.some((w) => lower.includes(w))) return { available: false, reason: 'FORBIDDEN' };
  if (state.nicknames.has(lower)) return { available: false, reason: 'TAKEN' };
  return { available: true };
}

const queryParam = (path: string, key: string) => {
  const q = path.split('?')[1] ?? '';
  for (const pair of q.split('&')) {
    const [k, v = ''] = pair.split('=');
    if (decodeURIComponent(k) === key) return decodeURIComponent(v);
  }
  return '';
};

type OrderCtx = {
  schoolId: string;
  cafeId: string;
  items: { menuId: string; qty: number }[];
  vouchers?: { id: string }[];
};

/** 이 교환권을 지금 이 장바구니에 쓸 수 있는가? (서버 판단 + 사유 문구) */
function evaluateVoucher(v: Voucher, ctx: OrderCtx): { ok: true; price: number } | { ok: false; reason: string } {
  if (v.status !== 'AVAILABLE') return { ok: false, reason: '사용할 수 없는 교환권이에요' };
  if (Date.parse(v.expiresAt) < Date.now()) return { ok: false, reason: '유효기간이 지났어요' };
  if (v.cafeId !== ctx.cafeId) return { ok: false, reason: `${v.cafeName} 교환권이에요` };
  const menu = state.cafes[ctx.schoolId]?.find((c) => c.id === ctx.cafeId)?.menus.find((m) => m.id === v.menuId);
  if (!menu) return { ok: false, reason: '지금은 판매하지 않는 메뉴예요. 유효기간까지 보관돼요' };
  if (state.soldOut[ctx.cafeId]?.has(v.menuId)) return { ok: false, reason: '지금은 품절이에요' };
  if (!ctx.items.some((i) => i.menuId === v.menuId)) {
    return { ok: false, reason: `장바구니에 '${v.menuName}'을(를) 담아 주세요` };
  }
  return { ok: true, price: menu.price };
}

/** 주문 미리보기: 금액 계산 + 내 교환권 각각의 적용 가능 여부 */
function buildQuote(ctx: OrderCtx) {
  const menus = state.cafes[ctx.schoolId]?.find((c) => c.id === ctx.cafeId)?.menus ?? [];
  const subtotal = ctx.items.reduce(
    (n, i) => n + (menus.find((m) => m.id === i.menuId)?.price ?? 0) * i.qty,
    0,
  );
  const selected = new Set((ctx.vouchers ?? []).map((v) => v.id));
  const discounts: { voucherId: string; amount: number; label: string }[] = [];
  const states: { id: string; applicable: boolean; reason?: string }[] = [];
  let used = 0;

  for (const v of state.vouchers.filter((x) => x.status === 'AVAILABLE')) {
    const r = evaluateVoucher(v, ctx);
    if (!r.ok) {
      states.push({ id: v.id, applicable: false, reason: r.reason });
    } else if (selected.has(v.id) && used >= MAX_VOUCHERS_PER_ORDER) {
      states.push({ id: v.id, applicable: false, reason: '주문당 1장만 사용할 수 있어요' });
    } else {
      if (selected.has(v.id)) {
        used += 1;
        discounts.push({ voucherId: v.id, amount: r.price, label: v.title });
      }
      states.push({ id: v.id, applicable: true });
    }
  }
  const total = Math.max(0, subtotal - discounts.reduce((n, d) => n + d.amount, 0));
  return { subtotal, discounts, total, vouchers: states };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function handleMockRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  state.calls.push(`${method} ${path}`);
  await sleep(state.latencyMs);
  if (state.offline) throw new NetworkError();

  let m: RegExpMatchArray | null;

  if (method === 'GET' && (m = path.match(/^\/schools\/([^/]+)\/menu-version$/))) {
    const sid = decodeURIComponent(m[1]);
    if (!(sid in state.versions)) throw new ApiError(404, 'SCHOOL_NOT_FOUND');
    return { version: state.versions[sid] } as T;
  }

  if (method === 'GET' && (m = path.match(/^\/schools\/([^/]+)\/menus$/))) {
    const sid = decodeURIComponent(m[1]);
    if (!(sid in state.versions)) throw new ApiError(404, 'SCHOOL_NOT_FOUND');
    return clone({ version: state.versions[sid], cafes: state.cafes[sid] ?? [] }) as T;
  }

  if (method === 'GET' && (m = path.match(/^\/cafes\/([^/]+)\/menu-status$/))) {
    const cafeId = decodeURIComponent(m[1]);
    return { soldOutMenuIds: [...(state.soldOut[cafeId] ?? [])] } as T;
  }

  if (method === 'GET' && path.startsWith('/nicknames/availability')) {
    return nicknameStatus(queryParam(path, 'nickname')) as T;
  }

  if (method === 'GET' && path === '/me') {
    return clone(state.me) as T;
  }

  if (method === 'POST' && (path === '/auth/signup' || path === '/me/nickname')) {
    const nickname = String((body as { nickname?: unknown })?.nickname ?? '');
    const r = nicknameStatus(nickname);
    if (!r.available) {
      // 확인과 요청 사이에 다른 사용자가 먼저 가져간 경우(TAKEN)와 형식/금칙어 오류를 구분해서 돌려준다
      if (r.reason === 'TAKEN') throw new ApiError(409, 'NICKNAME_TAKEN', { code: 'NICKNAME_TAKEN' });
      throw new ApiError(400, 'NICKNAME_INVALID', { code: 'NICKNAME_INVALID', reason: r.reason });
    }
    if (path === '/me/nickname') state.nicknames.delete(state.me.nickname.toLowerCase()); // 이전 닉네임 반납
    state.nicknames.add(nickname.toLowerCase());
    state.me = { nickname };
    return { nickname } as T;
  }

  if (method === 'GET' && path === '/banners') {
    return { banners: clone(state.banners) } as T;
  }

  if (method === 'POST' && (m = path.match(/^\/banners\/([^/]+)\/events$/))) {
    state.bannerEvents.push({ id: decodeURIComponent(m[1]), event: (body as { event?: string })?.event ?? '' });
    return {} as T;
  }

  if (method === 'GET' && path === '/vouchers') {
    const vouchers = clone(state.vouchers).map((v) =>
      v.status === 'AVAILABLE' && Date.parse(v.expiresAt) < Date.now() ? { ...v, status: 'EXPIRED' as const } : v,
    );
    return {
      vouchers,
      notice:
        '[목업 문구] 교환권은 계정에 귀속되며 양도할 수 없어요. 유효기간이 지나면 사라져요. 판매하지 않는 메뉴의 교환권은 유효기간까지 보관돼요.',
    } as T;
  }

  if (method === 'POST' && path === '/orders/quote') {
    const req = body as OrderCtx & { menuVersion: number };
    if (req.menuVersion !== state.versions[req.schoolId]) {
      throw new ApiError(409, 'MENU_CHANGED', { code: 'MENU_CHANGED' });
    }
    return buildQuote(req) as T;
  }

  if (method === 'POST' && path === '/orders') {
    const req = body as {
      schoolId: string;
      cafeId: string;
      menuVersion: number;
      items: { menuId: string; qty: number }[];
      cancelPolicy?: string;
      vouchers?: { id: string }[];
    };
    state.lastOrder = req;
    if (req.cancelPolicy !== 'ALLOW_PARTIAL' && req.cancelPolicy !== 'CANCEL_ALL') {
      throw new ApiError(400, 'INVALID_CANCEL_POLICY', { code: 'INVALID_CANCEL_POLICY' });
    }
    if (req.menuVersion !== state.versions[req.schoolId]) {
      throw new ApiError(409, 'MENU_CHANGED', { code: 'MENU_CHANGED' });
    }
    const soldOut = req.items.map((i) => i.menuId).filter((id) => state.soldOut[req.cafeId]?.has(id));
    if (soldOut.length > 0) {
      throw new ApiError(409, 'MENU_SOLD_OUT', { code: 'MENU_SOLD_OUT', menuIds: soldOut });
    }
    const quote = buildQuote(req);
    const selectedIds = (req.vouchers ?? []).map((v) => v.id);
    const bad = selectedIds.filter((id) => !quote.vouchers.find((v) => v.id === id)?.applicable);
    if (bad.length > 0) {
      const reason = quote.vouchers.find((v) => v.id === bad[0])?.reason ?? '사용할 수 없는 교환권이에요';
      throw new ApiError(409, 'VOUCHER_UNAVAILABLE', { code: 'VOUCHER_UNAVAILABLE', voucherIds: bad, reason });
    }
    for (const v of state.vouchers) if (selectedIds.includes(v.id)) v.status = 'USED';
    const code = state.cafes[req.schoolId]?.find((c) => c.id === req.cafeId)?.code ?? 'OR';
    return { orderNo: `${code}-${Math.floor(100000 + Math.random() * 900000)}`, total: quote.total } as T;
  }

  throw new ApiError(404, 'NOT_FOUND');
}

const controls = {
  get calls() {
    return state.calls;
  },
  setOffline(on: boolean) {
    state.offline = on;
  },
  bumpVersion(schoolId: string) {
    state.versions[schoolId] = (state.versions[schoolId] ?? 0) + 1;
  },
  /** 해당 메뉴 id 의 가격을 (모든 학교/카페에서) 바꾸고, 영향받은 학교의 버전을 올린다. */
  setPrice(menuId: string, price: number) {
    for (const [sid, cafes] of Object.entries(state.cafes)) {
      let touched = false;
      for (const cafe of cafes) {
        for (const item of cafe.menus) {
          if (item.id === menuId) {
            item.price = price;
            touched = true;
          }
        }
      }
      if (touched) controls.bumpVersion(sid);
    }
  },
  setSoldOut(cafeId: string, menuId: string, on: boolean) {
    const set = (state.soldOut[cafeId] ??= new Set());
    if (on) set.add(menuId);
    else set.delete(menuId);
  },
  /** 다른 사용자가 이 닉네임을 먼저 가져간 상황 재현 */
  takeNickname(nickname: string) {
    state.nicknames.add(nickname.toLowerCase());
  },
  /** 이벤트 팝업 목록 교체 */
  setBanners(list: unknown[]) {
    state.banners = list;
  },
  /** 교환권을 만료 처리 (앱이 모르는 사이에 만료되는 상황 재현) */
  expireVoucher(id: string) {
    const v = state.vouchers.find((x) => x.id === id);
    if (v) v.expiresAt = new Date(Date.now() - 1000).toISOString();
  },
  /** 메뉴 단종: 모든 카페에서 제거하고 영향받은 학교의 버전을 올린다. 교환권은 그대로 남는다. */
  discontinueMenu(menuId: string) {
    for (const [sid, cafes] of Object.entries(state.cafes)) {
      let touched = false;
      for (const cafe of cafes) {
        const before = cafe.menus.length;
        cafe.menus = cafe.menus.filter((m) => m.id !== menuId);
        if (cafe.menus.length !== before) touched = true;
      }
      if (touched) controls.bumpVersion(sid);
    }
  },
  state,
};

if (__DEV__) {
  (globalThis as { __ormoMock?: typeof controls }).__ormoMock = controls;
}
