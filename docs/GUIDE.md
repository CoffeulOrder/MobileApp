# ORMO 앱 개발 가이드

대학 카페 통합 모바일 오더 앱 **ORMO (ORSO Mobile Order)** 의 UI 목업 코드 구조와 유지보수 방법을 정리한 문서입니다.
(저장소/폴더 이름과 `constants/coffeul.ts` 파일명은 예전 이름 Coffeul 그대로입니다.)
현재 단계는 **UI만 구현된 상태**이며, 백엔드/인증/결제는 모두 흉내만 냅니다.

---

## 1. 기술 스택

| 항목 | 버전 / 내용 |
|---|---|
| Expo SDK | 57 |
| React Native | 0.86 |
| React | 19.2 |
| 라우팅 | `expo-router` (파일 기반 라우팅) |
| 이미지 | `expo-image` (디스크 캐시 + prefetch) |
| 로컬 저장 | `@react-native-async-storage/async-storage` (메뉴 캐시) |
| 언어 | TypeScript (strict) |
| 스타일 | `StyleSheet` (RN 기본, 별도 CSS 라이브러리 없음) |

> 프로젝트 생성 시 들어온 패키지 외에 **`@react-native-async-storage/async-storage` 하나만** 추가로 설치했습니다 (`npx expo install`).
> Expo는 버전마다 API가 바뀌므로 코드 수정 전 [SDK 57 문서](https://docs.expo.dev/versions/v57.0.0/)를 확인하세요.

---

## 2. 실행 방법

```bash
npm install          # 최초 1회
npx expo start       # 개발 서버 시작
```

개발 서버가 뜬 뒤:

- **휴대폰**: Expo Go 앱으로 QR 코드 스캔
- **PC 브라우저**: 터미널에서 `w` 키 → `http://localhost:8081`
- **웹으로 바로 시작**: `npx expo start --web`

기타 스크립트 (`package.json`):

| 명령 | 설명 |
|---|---|
| `npm run android` / `npm run ios` | 에뮬레이터/시뮬레이터로 실행 |
| `npm run web` | 웹으로 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run reset-project` | 예제 코드 초기화 (⚠️ 지금 코드가 밀림, 쓰지 말 것) |

타입 체크:

```bash
npx tsc --noEmit
```

---

## 3. 폴더 구조

```
src/
├── app/                      # 화면 = 라우트 (파일 이름이 곧 URL 경로)
│   ├── _layout.tsx           # 루트 레이아웃: 네비게이션 + 전역 Provider
│   ├── index.tsx             # "/"                학교 선택 (앱 첫 화면)
│   ├── login.tsx             # "/login"           로그인 / 회원가입 (학교 이메일 접미사 고정)
│   ├── branch.tsx            # "/branch"          지점(건물) 선택
│   ├── menu.tsx              # "/menu"            메뉴 목록 + 장바구니 바 + 프로필 메뉴
│   ├── cart.tsx              # "/cart"            장바구니 (반투명 모달)
│   ├── checkout.tsx          # "/checkout"        결제
│   ├── order-complete.tsx    # "/order-complete"  주문 완료
│   ├── payment-methods.tsx   # "/payment-methods" 결제수단 관리
│   ├── notifications.tsx     # "/notifications"   주문 알림
│   └── coupons.tsx           # "/coupons"         쿠폰 관리
│
├── components/
│   └── ui/
│       └── kit.tsx           # 공용 컴포넌트: Logo, Avatar, PrimaryButton, Field, EmailField, ScreenHeader
│
├── constants/
│   ├── coffeul.ts            # ⭐ 디자인 토큰 + 학교(SCHOOLS) + 메뉴/카페 타입 (Cafe, MenuItem, MenuPayload)
│   └── theme.ts              # (스타터 잔재, 현재 미사용)
│
├── api/                      # 서버 통신 (§9)
│   ├── client.ts             # fetch 래퍼. EXPO_PUBLIC_API_URL 이 없으면 목업 서버로 응답
│   ├── errors.ts             # NetworkError / ApiError
│   ├── menu-api.ts           # menu-version, menus, menu-status, POST /orders
│   ├── menu-schema.ts        # 응답/캐시 JSON 검증 (잘못된 데이터가 캐시를 덮어쓰지 못하게)
│   ├── voucher-api.ts        # GET /vouchers (교환권)
│   ├── voucher-schema.ts     # 교환권·주문 미리보기(quote) 검증 (모르는 kind 는 건너뜀)
│   └── mock-server.ts        # 앱 안의 가짜 백엔드 + 개발용 제어판(__ormoMock)
│
├── storage/                  # 로컬 저장 (§9)
│   ├── kv.ts                 # AsyncStorage 래퍼 (MMKV 로 바꿀 때 이 파일만 수정)
│   ├── menu-cache.ts         # menu:{schoolId} / menuVersion:{schoolId} 읽기·쓰기·삭제
│   └── image-cache.ts        # 이미지 prefetch 규칙
│
└── hooks/
    ├── use-school.tsx        # 선택한 학교 전역 상태 + useSchools() (Context)
    ├── use-menu.tsx          # ⭐ 메뉴 캐시·버전 갱신·품절·선택한 카페 (Context)
    ├── use-cart.tsx          # 장바구니 전역 상태 (Context) + 고른 교환권 id
    ├── use-vouchers.tsx      # 내 교환권 (개인 데이터, 메모리 전용) (Context)
    ├── use-logout.ts         # 로그아웃: 개인 데이터 비우고 /login 으로 (인증 붙이면 여기에 추가)
    ├── use-theme.ts          # (스타터 잔재, 현재 미사용)
    └── use-color-scheme*     # (스타터 잔재, 현재 미사용)
```

`@/` 는 `src/` 의 별칭입니다. (`import { C } from '@/constants/coffeul'`)

`assets/images/ormo-logo.png` 는 브랜드 시안에서 잘라낸 **투명 배경 PNG**(591×193)이며 `Logo` 컴포넌트가 사용합니다. 라이트 배경 전용입니다.

`theme.ts`, `use-theme.ts`, `use-color-scheme*` 는 프로젝트 생성 시 딸려온 파일로 지금은
아무 데서도 import 하지 않습니다. 라이트/다크 테마를 도입할 계획이 없으면 삭제해도 됩니다.

---

## 4. 화면 흐름 & 라우팅 (expo-router)

`src/app/` 안의 파일이 자동으로 화면이 됩니다. 별도 라우트 등록이 필요 없습니다.

```
학교 선택(/) ─replace─▶ 로그인·회원가입(/login) ─replace─▶ 지점 선택(/branch) ─replace─▶ 메뉴(/menu)
   ▲                         │  ▲                                                          │
   └──── "건국대학교 변경" ───┘  └──────────── 로그아웃 (메뉴·지점 화면) ────────────────────┤
                                                                                           │
                        ┌──────────── 프로필 아이콘 탭 ─────────────────────────────────────┤
                        │                                                                  │
             결제수단(/payment-methods)                                              장바구니(/cart, 모달)
             주문 알림(/notifications)                                                      │ push
             쿠폰(/coupons)                                                           결제(/checkout)
                        ▲ push                                                             │ replace
                        └──── "범석관 변경" ─▶ /branch                               주문 완료(/order-complete)
                                                                                           │ "추가 주문하기" replace
                                                                                           ▼
                                                                                         /menu
```

- 로그아웃은 **학교 선택을 유지한 채** `/login` 으로 돌아갑니다. 학교를 바꾸려면 로그인 화면의 `○○대학교 변경` 칩.
- `/login` 에 학교 선택 없이 직접 들어오면(웹 새로고침 등) `<Redirect href="/" />` 로 첫 화면으로 되돌립니다.

- **`router.push`** — 화면을 스택에 쌓음 (뒤로가기 가능). 장바구니, 결제, 프로필 하위 화면.
- **`router.replace`** — 현재 화면을 교체 (뒤로가기 불가). 학교→로그인→지점→메뉴, 결제완료→메뉴, 로그아웃.
- **`router.back()`** — 뒤로가기. (`ScreenHeader` 의 ‹ 버튼이 사용)

`_layout.tsx` 의 `<Stack.Screen>` 설정:

- 모든 화면 `headerShown: false` — 헤더는 각 화면이 직접 그림.
- `cart` 만 `presentation: 'transparentModal'` — 뒤 화면이 비치는 바텀시트 모달.
- 나머지 화면은 옵션이 없어도 자동 등록되지만, 문서화를 위해 전부 나열해 둠.

`app.json` 에 `"typedRoutes": true` 가 켜져 있어서, 새 화면 파일을 추가하면
`expo start` 가 경로 타입을 자동 생성합니다. 새 경로가 타입 에러로 뜨면 서버를 재시작하세요.

---

## 5. 디자인 토큰 — `src/constants/coffeul.ts`

색상, 간격, 모서리 둥글기를 이 파일 하나에서 관리합니다. **하드코딩된 색상값을 화면에 직접 쓰지 마세요.**

### 색상 `C` — ORMO 라이트 팔레트

브랜드 시안 기준: 블루 `#008AFF` / 잉크 `#111827` / 그레이 `#D9D9D9` / 틴트 `#F3F6FF`.

| 토큰 | 값 | 용도 |
|---|---|---|
| `C.bg` | `#F3F6FF` | 화면 배경 (브랜드 틴트) |
| `C.surface` | `#FFFFFF` | 카드, 입력창, 시트 등 떠 있는 면 |
| `C.surfaceAlt` | `#E8EEFB` | 썸네일 자리, 이메일 접미사 칩, 눌림 배경 |
| `C.border` | `#D9D9D9` | 테두리 선 |
| `C.primary` / `C.primaryDim` | `#008AFF` / `#006FD0` | 브랜드 블루 (버튼, 가격, 강조) |
| `C.onPrimary` | `#FFFFFF` | 블루 배경 위 글자 |
| `C.ink` / `C.onInk` | `#111827` / `#FFFFFF` | 어두운 배지(장바구니 수량), 워드마크 / 그 위 글자 |
| `C.text` / `C.textSecondary` / `C.textMuted` | `#111827` / `#4B5563` / `#8A92A0` | 글자 (기본 / 보조 / 흐림) |

> 라이트 전용입니다. `StatusBar` 는 `dark`(`_layout.tsx`). 떠 있는 요소(프로필 드롭다운)는 `boxShadow` 로 구분합니다.

### 간격 `S` 와 둥글기 `Radius`

```ts
S.xs(4)  S.sm(8)  S.md(12)  S.lg(16)  S.xl(24)  S.xxl(32)
Radius.sm(10)  Radius.md(16)  Radius.lg(22)  Radius.pill(999)
```

### 유틸

- `won(5000)` → `"5,000원"` (가격 표시는 항상 이걸 사용)
- 제목/브랜드 글자는 별도 폰트 없이 `fontWeight: '900'` 을 사용합니다 (시안의 굵고 둥근 느낌). 전용 폰트를 도입하면 `expo-font` 로 로드하세요.

### 색 테마를 통째로 바꾸고 싶을 때

`coffeul.ts` 의 `C` 객체 값만 수정하면 전 화면에 반영됩니다.

---

## 6. 전역 상태 (Context)

`_layout.tsx` 에서 `<BranchProvider>` 와 `<CartProvider>` 로 앱 전체를 감싸므로,
어느 화면에서든 훅으로 접근합니다. 둘 다 **메모리 전용** — 앱 재시작/웹 새로고침 시 초기화됩니다.

### 6.1 학교 — `src/hooks/use-school.tsx`

```tsx
const { school, setSchool } = useSchool();   // school: School | null (선택 전에는 null)
const { schools, loading } = useSchools();   // 학교 목록 (지금은 SCHOOLS 상수)

school.name          // "건국대학교"
school.emailDomain   // "konkuk.ac.kr"   ← 로그인/회원가입 이메일 접미사로 고정됨
```

기본값은 `null` — 첫 화면(`/`)에서 고르기 전에는 `/login` 이 접근되지 않습니다 (§8 참고).

### 6.2 메뉴 · 선택한 카페(지점) — `src/hooks/use-menu.tsx`

```tsx
const { payload, status, cafe, selectCafe, soldOut, sync, retry, refreshSoldOut, markSoldOut } = useMenu();

payload      // { version, cafes[] } — 캐시 또는 서버 데이터 (없으면 null)
status       // 'loading' | 'ready' | 'error'  (error 는 "캐시도 없고 실패" 일 때만)
cafe         // 선택한 카페 { id, name, code, menus[] } — 메뉴가 갱신되면 같이 최신으로 바뀜
selectCafe(id)   // branch.tsx 에서 호출
```

자세한 동작은 §9. 지점 = 서버의 `cafe` 입니다 (§10).

### 6.3 장바구니 — `src/hooks/use-cart.tsx`

```tsx
const cart = useCart();

cart.lines            // { item, qty }[]  담긴 항목들
cart.count            // 총 수량 (숫자)
cart.total            // 총 금액 (숫자)

cart.add(item)        // 항목 담기 (이미 있으면 수량 +1)
cart.setQty(id, n)    // 수량 지정 (0 이하 → 자동 삭제)
cart.remove(id)       // 항목 제거
cart.clear()          // 전체 비우기 (결제 완료 / 학교·지점 변경 시 호출)
cart.voucherIds       // 이 주문에 쓰려고 고른 교환권 id (clear() 하면 같이 비워짐)
cart.setVoucherIds(ids)
cart.reconcile(menus) // 메뉴 갱신 후 장바구니를 최신 메뉴에 맞춤 (사라진 메뉴 제거, 이름·가격 갱신)
                      //   → { removed: string[], priceChanged: string[] }
```

`item` 은 `coffeul.ts` 의 `MenuItem` 타입입니다.

---

## 7. 프로필 메뉴 (메뉴 화면)

`menu.tsx` 헤더 왼쪽의 프로필 아이콘(`Avatar`)을 탭하면 드롭다운이 열립니다.
항목은 `menu.tsx` 상단의 `PROFILE_ACTIONS` 배열에서 정의합니다.

```ts
const PROFILE_ACTIONS = [
  { icon: '🧋', label: '주문하기',     go: () => {} },                          // 그냥 닫힘 (이미 메뉴)
  { icon: '💳', label: '결제수단 관리', go: () => router.push('/payment-methods') },
  { icon: '🔔', label: '주문 알림',     go: () => router.push('/notifications') },
  { icon: '🎟️', label: '쿠폰 관리',     go: () => router.push('/coupons') },
];
```

항목을 추가/변경하려면 이 배열만 고치면 됩니다. 새 항목이 새 화면으로 가야 하면
`src/app/` 에 파일을 만들고 (11.5 참고) `go` 에 `router.push('/경로')` 를 넣습니다.

드롭다운이 가리키는 세 화면(`payment-methods`, `notifications`, `coupons`)은
**전부 더미 데이터**입니다. 각 파일 상단의 배열(`CARDS`, `ITEMS`, `COUPONS`)을 고치면 내용이 바뀝니다.

---

## 8. 학교 선택 & 학교 이메일 고정

앱 첫 화면(`index.tsx`)에서 학교를 고르면 `/login` 으로 이동합니다.

```ts
// coffeul.ts
export type School = { id: string; name: string; emailDomain: string };   // emailDomain 은 "@" 제외

export const SCHOOLS: School[] = [
  { id: 'konkuk', name: '건국대학교', emailDomain: 'konkuk.ac.kr' },
  ...
];
```

- 화면은 상수를 직접 읽지 않고 **`useSchools()`** 로만 목록을 얻습니다.
  **백엔드 연동 시 `use-school.tsx` 의 `useSchools()` 만 `fetch` 로 바꾸면 됩니다** (`{ schools, loading }` 형태 유지, 도메인도 응답에 포함).
- 로그인/회원가입 이메일은 `EmailField` (`kit.tsx`) 가 **아이디만 입력**받고 `@도메인` 은 고정 표시합니다.
  - `@` 가 들어간 값을 입력/붙여넣으면 `@` 앞부분만 남깁니다 (다른 도메인 입력 불가).
  - 최종 이메일은 `` `${emailId}@${school.emailDomain}` `` (`login.tsx` 의 `emailId` 상태 + `school.emailDomain`).
  - ⚠️ 클라이언트 고정은 UX 용도입니다. **서버에서도 가입 이메일 도메인이 학교 도메인과 일치하는지 반드시 검증**해야 합니다.
- 학교를 바꾸려면 로그인 화면의 `○○대학교 변경` 칩 → `/` 로 이동.

현재 `SCHOOLS` 는 목업 데이터입니다. 학교별 지점(카페) 목록은 메뉴 데이터 안에 들어 있습니다 (§9, §10).

---

## 9. 메뉴 데이터 캐시 & 서버 API

메뉴 JSON 과 이미지를 로컬에 캐시하고, **서버의 학교 단위 `menu_version`(정수)이 바뀔 때만** 다시 받습니다.
구현은 `src/hooks/use-menu.tsx` (흐름), `src/storage/*` (저장), `src/api/*` (통신).

### 9.1 API

| 요청 | 응답 |
|---|---|
| `GET /schools/{schoolId}/menu-version` | `{ version }` |
| `GET /schools/{schoolId}/menus` | `{ version, cafes: [{ id, name, code, menus: [...] }] }` |
| `GET /cafes/{cafeId}/menu-status` | `{ soldOutMenuIds: [] }` |
| `GET /vouchers` | `{ vouchers: [...], notice? }` — 내 교환권 (§14) |
| `POST /orders/quote` | `{ subtotal, discounts[], total, vouchers[] }` / 409 `MENU_CHANGED` — 주문 미리보기 (§14) |
| `POST /orders` | `{ orderNo, total }` / 409 `{ code: "MENU_CHANGED" }` / 409 `{ code: "MENU_SOLD_OUT", menuIds: [] }` / 409 `{ code: "VOUCHER_UNAVAILABLE", voucherIds: [], reason? }` |

메뉴 항목: `{ id, name, desc, price, category, thumbnailUrl?, imageUrl? }` (`MenuItem`, `constants/coffeul.ts`).

> ⚠️ **협의 스펙에 없어 가정한 부분** — 백엔드와 맞춰야 합니다.
> - `POST /orders` 요청: `{ schoolId, cafeId, menuVersion, items: [{ menuId, qty }], paymentMethod, cancelPolicy, vouchers: [{ id }] }`.
>   결제액이 0원(교환권으로 전액 충당)이면 `paymentMethod: 'NONE'` — PG 를 거치지 않는 주문을 서버가 받아야 함.
>   `cancelPolicy` 는 `'ALLOW_PARTIAL'`(부분 취소 허용) 또는 `'CANCEL_ALL'`(일부라도 취소되면 전체 취소) — §9.5-b.
>   서버는 `menuVersion` 이 최신과 다르면 `MENU_CHANGED`, 품절 메뉴가 있으면 `MENU_SOLD_OUT`(+ `menuIds`)을 409 로 돌려준다고 가정.
> - 성공 응답의 `orderNo` (없으면 화면이 임시 번호를 만듦)와 `total`(실제 결제 금액).
> - 교환권 관련 `GET /vouchers`, `POST /orders/quote`, 409 `VOUCHER_UNAVAILABLE` 의 형태 (§14.4).
> - 메뉴 JSON 의 카페 `code`(주문번호 접두어)와 `category`(문자열, 카페별 상이 가능).
> - 인증 헤더는 아직 없음 (`api/client.ts` 에 추가).

서버 주소는 환경변수 `EXPO_PUBLIC_API_URL` (`.env.example` 참고). **비워 두면 앱 안의 목업 서버**(§9.7)가 응답합니다.

### 9.2 로컬 저장

| 키 | 값 |
|---|---|
| `menu:{schoolId}` | 메뉴 JSON 전체 (`version` 포함) |
| `menuVersion:{schoolId}` | localVersion (문자열) |

- 스펙은 MMKV(또는 AsyncStorage) 였는데, **MMKV 는 Expo Go 에서 돌지 않아** AsyncStorage 를 썼습니다. 호출부는 `storage/kv.ts` 하나만 거치므로 나중에 교체하기 쉽습니다.
- **교체의 원자성**: ① 서버 응답은 `parseMenuPayload` 검증을 통과한 것만 저장 ② 두 키를 `multiSet` 한 번으로 같이 기록 ③ 읽을 때 JSON 안의 `version` 과 `menuVersion` 키가 다르면(쓰기 도중 종료 등) 캐시가 없는 것으로 취급.
- **품절은 캐시하지 않습니다** (메모리에만). 가격은 표시용이며 실제 결제 금액은 서버가 검증합니다.

### 9.3 버전 체크

`MenuProvider` 가 아래 시점에 `sync()` 를 호출합니다. 마지막 체크 후 **30초 이내면 생략**(`MENU_CHECK_MIN_INTERVAL_MS`), 진행 중인 체크는 하나로 합칩니다.

| 시점 | 위치 |
|---|---|
| 앱 시작 — 학교가 정해진 시점 (자동 로그인으로 학교가 복원되면 시작 직후) | `use-menu.tsx` (학교 effect) |
| 백그라운드 → 포그라운드 복귀 | `use-menu.tsx` (`AppState`) |
| 메뉴 화면 진입 | `menu.tsx` (`useFocusEffect`) |

```
캐시 없음 → GET /menus → 검증 → 저장 → 렌더          (실패 시에만 재시도 화면)
캐시 있음 → 캐시로 즉시 렌더 → (백그라운드) GET /menu-version
              같음 → 아무것도 안 함
              다름 → GET /menus → 검증 → JSON+localVersion 함께 교체 → 화면 갱신 → 변경된 이미지만 prefetch
네트워크 실패 → 캐시가 있으면 조용히 유지, 없을 때만 재시도 화면
```

### 9.4 이미지

- 모든 메뉴 이미지는 `expo-image` 의 `<Image cachePolicy="disk">` 를 씁니다 (RN 기본 `Image` 사용 금지). URL 이 같으면 디스크 캐시를 그대로 씁니다 → **서버는 이미지가 바뀌면 URL 도 바꿔야 합니다.**
- 목록은 `thumbnailUrl`, 상세는 `imageUrl` (현재 상세 화면은 없음).
- **첫 로드에 전체 선다운로드 금지**: 지금 보는 카페의 썸네일만 prefetch (`use-menu.tsx` 의 cafe effect).
- **갱신 시**: 이전 JSON 에 없던 URL 만 prefetch — 현재 카페는 썸네일+상세, 다른 카페는 썸네일만 (`diffImageUrls`).

### 9.5 주문 시 409 처리 (`checkout.tsx`)

| 코드 | 동작 |
|---|---|
| `MENU_CHANGED` | 메뉴를 **강제 갱신**(`/menus` 바로 호출) → 장바구니를 최신 메뉴에 맞춤(`cart.reconcile`) → 화면 위에 "메뉴가 변경되었습니다" + 가격 변경/제외된 메뉴 안내. 이후 사용자가 다시 결제 |
| `VOUCHER_UNAVAILABLE` | 교환권 선택을 풀고(`setVoucherIds([])`) 교환권 목록·금액을 새로 받은 뒤 "교환권을 사용할 수 없어요: 사유" 안내 (§14) |
| `MENU_SOLD_OUT` | 해당 메뉴를 품절로 표시(`markSoldOut`) → 안내 + `품절 메뉴 빼기` 버튼. 품절 메뉴가 장바구니에 있는 동안 결제 버튼 비활성 |

### 9.5-b 주문 취소 시 처리 옵션 (부분 취소 / 전체 취소)

가게 사정(재료 소진 등)으로 주문 **일부 메뉴가 취소될 수 있어서**, 고객이 주문할 때 처리 방식을 고릅니다.
결제 화면 `checkout.tsx` 의 **"주문 취소 시 처리"** 섹션 (라디오 2개)이며, 기본값은 부분 취소 허용입니다.

| 값 (`CancelPolicy`) | 화면 문구 | 의미 |
|---|---|---|
| `ALLOW_PARTIAL` (기본) | 부분 취소 허용 | 만들 수 없는 메뉴만 취소하고 나머지는 그대로 준비. 취소된 메뉴 금액만 환불 |
| `CANCEL_ALL` | 전체 취소 | 일부라도 취소되면 주문 전체를 취소하고 전액 환불 |

- 선택값은 `POST /orders` 의 `cancelPolicy` 로 전송되고, 주문 완료 화면에 "취소 발생 시: …" 로 다시 보여줍니다.
- 옵션 정의(값·문구·기본값)는 `constants/coffeul.ts` 의 `CANCEL_POLICY_OPTIONS`, `DEFAULT_CANCEL_POLICY` 한 곳. 문구/기본값은 여기만 고치면 됩니다.
- ⚠️ **앱이 하는 일은 선택값을 서버에 보내는 것까지**입니다. 실제 부분/전체 취소와 PG 부분 환불, 취소 알림은 백엔드·매장 앱(관리자) 몫이며, 서버는 주문에 저장된 `cancelPolicy` 에 따라 처리해야 합니다.
- 목업 서버는 값이 둘 중 하나가 아니면 400 `INVALID_CANCEL_POLICY` 를 돌려주고, `__ormoMock.state.lastOrder` 로 마지막 주문 본문을 확인할 수 있습니다.

### 9.6 캐시 삭제 조건

- **학교가 바뀌면** 이전 학교의 `menu:*` / `menuVersion:*` 와 이미지 디스크 캐시를 삭제 (`purgeOtherSchools`). 장바구니도 비움.
- **로그아웃은 캐시를 건드리지 않습니다** (공개 데이터). 지점을 바꾸면 장바구니만 비움.

### 9.7 목업 서버와 테스트 방법

백엔드가 없는 동안 `api/mock-server.ts` 가 위 API 를 흉내 냅니다 (지연 250ms, 메모리 상태 — **새로고침하면 version 1·원래 가격으로 초기화**).
웹 개발 서버(`localhost:8082`)의 브라우저 콘솔에서 제어판 `__ormoMock` 으로 시나리오를 재현합니다.

```js
__ormoMock.setOffline(true)                 // 비행기 모드 흉내
__ormoMock.setPrice('americano', 4500)      // 가격 변경 + 학교 version 증가
__ormoMock.bumpVersion('konkuk')            // 버전만 증가
__ormoMock.setSoldOut('beomseok', 'latte', true)   // 품절 토글 (버전 불변)
__ormoMock.discontinueMenu('americano')     // 메뉴 단종 (모든 카페에서 제거 + 버전 증가)
__ormoMock.expireVoucher('v-americano')     // 교환권을 서버에서 만료 처리
__ormoMock.state.vouchers                   // 내 교환권 (목업: v-americano, v-latte-nm, v-brownie(D-12), 사용완료/만료 각 1)
__ormoMock.calls                            // 받은 요청 목록 (어떤 호출이 생략/발생했는지 확인)
```

| 확인할 것 | 방법 |
|---|---|
| 오프라인에서도 캐시 표시 | 한 번 메뉴를 본 뒤 새로고침 → `setOffline(true)` → 학교 선택~메뉴 진입. 캐시된 메뉴가 보이고 오류 화면은 없음 |
| 변경분만 갱신 | `setPrice(...)` 후 앱을 백그라운드→포그라운드로 (웹: 탭 전환) → `calls` 에 `menu-version` → `menus` |
| 30초 규칙 | 위 과정을 30초 안에 반복하면 `calls` 에 새 요청이 없음 |
| 409 | 메뉴 화면에서 담은 뒤 `setPrice(...)`(앱이 모르는 사이) → 결제 → 안내 + 가격 갱신. `setSoldOut` 도 동일 |

⚠️ **실기기에서 이미지 디스크 캐시/비행기 모드는 직접 확인**해야 합니다 (웹은 브라우저 HTTP 캐시를 쓰므로 `expo-image` 디스크 캐시 검증이 아님).

---

## 10. 지점(= 카페)

UI 에서는 "지점", 서버·코드에서는 **카페(`Cafe`)** 입니다. 학교마다 카페 목록이 다르고, 목록은 이 학교의 메뉴 데이터
(`payload.cafes`) 안에 들어 있어서 별도 상수는 없습니다.

- `branch.tsx` 는 `payload.cafes` 를 카드로 렌더 → 지점 추가/삭제는 **서버 데이터**(목업은 `mock-server.ts` 의 `initialCafes`) 에서.
- 고르면 `selectCafe(id)` → `useMenu().cafe` 로 읽음. 다른 지점을 고르면 장바구니를 비웁니다.
- `cafe.code` 는 주문번호 접두어 (`order-complete.tsx`, 서버가 `orderNo` 를 주면 그 값이 우선).
- 갱신으로 선택한 카페가 사라지면 `menu.tsx` 가 `/branch` 로 돌려보냅니다.

---

## 11. 자주 하는 수정 작업 (레시피)

### 11.1 메뉴 항목 추가 / 수정

메뉴는 **서버 데이터**입니다. 앱 코드에는 메뉴 상수가 없습니다 (스키마: `MenuItem`, `constants/coffeul.ts`).
백엔드가 없는 동안에는 목업 서버의 `baseMenus()` (`src/api/mock-server.ts`) 를 편집합니다.

```ts
menu('cold-brew', '콜드브루', '12시간 저온 추출한 부드러운 커피', 5500, '논커피', '사진ID')
//   id(고유, 영문)  name        desc                                  price  category  Unsplash 사진 ID (생략 가능)
```

메뉴를 바꾼 뒤에는 학교의 `menu_version` 이 올라가야 앱이 변경을 감지합니다 (목업은 `__ormoMock.bumpVersion('학교id')`).
이미 캐시한 기기는 다음 버전 체크 때 갱신됩니다.

### 11.2 카테고리 추가

카테고리는 `category` 문자열 값입니다. 메뉴 화면의 칩은 **이 카페 메뉴들의 category 를 중복 없이 모아서**
자동으로 만듭니다 (`menu.tsx`). 새 category 문자열로 메뉴를 추가하면 칩이 생깁니다.

### 11.3 색상 / 여백 조정

`src/constants/coffeul.ts` 의 `C`, `S`, `Radius` 수정 → 전 화면 반영.
특정 화면만 바꾸려면 해당 화면 파일 하단 `StyleSheet.create({...})` 를 수정.

### 11.4 이미지를 로컬 파일로 교체

메뉴 이미지는 서버가 주는 **URL** 이고 `expo-image` 가 디스크에 캐시합니다 (§9.4). 앱에 번들한 이미지를 쓰려면:

1. `assets/images/` 에 파일 추가
2. `MenuItem.thumbnailUrl` 타입을 `string | number` 로 넓히고 값에 `require('@/assets/images/latte.png')`
3. `menu.tsx` 의 `<Image source={{ uri: item.thumbnailUrl }} />` 를 `source={item.thumbnailUrl}` 로 (require 결과는 객체가 아님)

(서버 데이터로 가는 경로에서는 보통 필요하지 않습니다.)

### 11.5 새 화면 추가

1. `src/app/새이름.tsx` 파일 생성, `export default function` 으로 컴포넌트 작성
2. 뒤로가기 헤더가 필요하면 `import { ScreenHeader } from '@/components/ui/kit'` 후 맨 위에 `<ScreenHeader title="제목" />`
3. `_layout.tsx` 에 `<Stack.Screen name="새이름" />` 추가 (특수 옵션 없으면 생략 가능하지만 문서화 차원에서 추가 권장)
4. 다른 화면에서 `router.push('/새이름')` 로 이동
5. 타입 에러가 나면 `expo start` 재시작

### 11.6 학교 추가 / 이메일 도메인 변경

`coffeul.ts` 의 `SCHOOLS` 배열에 항목을 추가하거나 `emailDomain` 을 수정합니다.
첫 화면 목록과 로그인 이메일 접미사에 자동 반영됩니다 (백엔드 연동 후에는 서버 데이터가 기준).

### 11.7 공용 컴포넌트

`src/components/ui/kit.tsx`:

| 컴포넌트 | 용도 |
|---|---|
| `Logo` | ORMO 워드마크 이미지 (`width` 로 크기 지정, 라이트 배경 전용) |
| `Avatar` | 프로필 아이콘 (블루 링 안의 사람 실루엣) |
| `PrimaryButton` | 블루 채움 기본 버튼 |
| `Field` | 라벨 + 입력창 (이름, 비밀번호 등) |
| `EmailField` | 아이디 입력 + `@학교도메인` 고정 접미사 (로그인, 회원가입) |
| `ScreenHeader` | ‹ 뒤로가기 + 가운데 제목 (하위 화면들) |

새 공용 요소가 생기면 이 파일에 추가합니다.

---

## 12. 실제 앱으로 발전시킬 때 할 일

현재는 UI 목업입니다. 프로덕션으로 가려면:

| 영역 | 현재 상태 | 해야 할 일 |
|---|---|---|
| 학교 | `SCHOOLS` 하드코딩, 선택값은 메모리 상태 | `useSchools()` 를 API 호출로 교체, 선택값 영속화(자동 로그인 시 학교 복원 → 앱 시작 시 메뉴 체크가 바로 동작) |
| 인증 | 버튼 누르면 검증 없이 `/branch` 이동 | 실제 로그인 API, 토큰 저장 (`expo-secure-store`), 서버측 이메일 도메인 검증 + 메일 인증 |
| 지점 선택 | 선택값은 메모리 상태 | 선택값 영속화 (`async-storage`) |
| 장바구니 | 메모리에만 존재, 새로고침 시 소실 | `@react-native-async-storage/async-storage` 로 영속화, 또는 서버 장바구니 |
| 메뉴 데이터 | 캐시/버전 로직은 구현됨, 서버는 앱 안의 목업 | `EXPO_PUBLIC_API_URL` 설정 + 백엔드와 API 형태 확정 (§9.1 가정 항목), 인증 헤더 |
| 결제 | `POST /orders` 호출까지만 (PG 없음) | 실제 PG 연동 (토스페이먼츠, 포트원 등) + 서버 승인 검증 |
| 주문 완료 | 서버 `orderNo` 사용(없으면 임시 번호), 고정 "10~15분" | 서버가 주는 예상시간, 실시간 상태 추적 |
| 결제수단 / 알림 | 전부 더미 배열 | API 연동, 푸시 알림(`expo-notifications` — 원격 푸시는 개발 빌드 필요) |
| 쿠폰(교환권) | 목업 서버로 동작 (§14) | 백엔드와 API 형태 확정 (§14.4), 인증 후 사용자별 조회 |
| 서버 상태 관리 | 없음 | 데이터 요청 많아지면 TanStack Query 등 검토 |

> 백엔드 설계 방향(모듈러 모놀리식, PostgreSQL, 사장님 PG 가맹점 모델 등)은
> 별도 논의 내용을 참고하세요.

---

## 13. 알려진 제약

- **이미지**: 목업 이미지는 Unsplash 원격 URL. 한 번 받은 이미지는 디스크 캐시에서 보이지만, 처음부터 오프라인이면 안 뜸. 이미지 없는 항목은 ☕ 아이콘으로 대체됨.
- **라이트 전용**: 다크 모드 대응 안 함 (`app.json` 의 `userInterfaceStyle` 은 아직 `automatic` — 다크 모드 기기에서 키보드 등 시스템 UI만 어둡게 보일 수 있음).
- **앱 아이콘/스플래시**: `app.json` 의 아이콘·스플래시 색은 스타터 기본값 그대로 (ORMO 브랜드 미적용).
- **학교 선택은 메모리 상태**: 앱을 껐다 켜면 학교 선택부터 다시 시작 (인증/자동 로그인이 없어서). 그래서 "앱 시작 시 메뉴 체크"는 지금은 학교를 고른 직후에 일어남.
- **웹 새로고침**: 장바구니·학교·지점 선택은 사라지지만 메뉴 캐시(localStorage)는 남음.
- **상세 이미지(`imageUrl`)**: 상세 화면이 없어 현재 화면에서는 쓰이지 않음 (현재 카페 것만 갱신 시 prefetch).
- **폼 검증 없음**: 이메일 형식, 카드번호 등 아무 검증도 하지 않음.
- **프로필 메뉴 위치**: 드롭다운 `top` 값은 `insets.top + 54` 로 고정 계산 — 헤더 높이를 크게 바꾸면 같이 조정해야 함 (`menu.tsx` 의 `menuCard`).

---

## 14. 쿠폰(교환권)

### 14.1 확정된 정책

- 지금은 **매장별 특정 메뉴 교환권**(`kind: 'MENU_EXCHANGE'`): "범석관 · 아메리카노 1잔"처럼 지점과 메뉴가 정해진 교환권.
  나중에 **매장 단위 금액권 / 앱 단위 금액권**이 추가될 예정 → `Voucher` 타입에 `kind` 를 추가하는 식으로 확장 (§14.5).
- **개인 계정에 귀속**되고 양도·선물·코드 등록 기능은 없음 (그래서 쿠폰 화면에 코드 입력칸이 없다).
- 유효기간은 길지만 존재함 (서버가 절대 시각 `expiresAt` 으로 줌, 앱은 표시용 D-day 만 계산).
- **메뉴가 단종되면** 교환권은 **유효기간까지 보관**한다 (소멸 X, 메뉴가 다시 생기면 사용 가능). 앱은 "지금은 판매하지 않는 메뉴예요. 유효기간까지 보관돼요."로 표시하고 `바로 사용`을 막는다.
- **품절**이면 사용 불가(소멸 X): 결제 화면의 교환권이 비활성 + 사유 표시, 쿠폰 화면은 `바로 사용` 비활성.
- 주문당 1장 (`MAX_VOUCHERS_PER_ORDER`). API 는 배열이라 나중에 늘려도 요청 형태는 그대로.
- 주문이 (부분) 취소되어 교환권 메뉴를 못 받게 되면 교환권을 **복구**하는 것이 맞다 — 서버 정책이며 앱은 상태 표시만 한다 (§9.5-b).

### 14.2 화면 동작

| 화면 | 동작 |
|---|---|
| 쿠폰 관리 (`coupons.tsx`) | 들어올 때마다 `GET /vouchers` 로 새로 조회(개인 데이터라 캐시 안 함). 탭: `사용 가능` / `사용 완료·만료`. 만료 임박순 정렬, 30일 이내면 D-day 뱃지. 서버가 준 `notice`(유의사항)를 아래에 표시. |
| `바로 사용` | 그 지점으로 이동(다른 지점이면 장바구니 비움) → 교환권 메뉴 담기 → 교환권 선택 → 메뉴 화면. 이어서 결제하면 자동 적용. |
| 결제 (`checkout.tsx`) | 현재 지점 교환권을 보여주고 선택. 서버 미리보기(`quote`)가 적용 가능 여부+사유와 할인/최종 금액을 줌. 서버가 "적용 불가"라 하면 선택을 자동 해제하고 안내. 최종 0원이면 결제 수단/카드 입력을 숨기고 `교환권으로 주문하기`. |
| 주문 완료 | "사용한 교환권" 표시. |
| 로그아웃 | `useLogout()` 이 교환권 상태를 비움 (메뉴 캐시는 공개 데이터라 유지). |

원칙: **할인 금액과 적용 가능 여부는 전부 서버가 계산**하고 앱은 표시만 한다 (메뉴 가격과 같은 원칙).
교환권 종류가 늘어도 앱이 규칙을 따로 구현하지 않도록 `POST /orders/quote` 를 쓴다.

### 14.3 파일

`constants/coffeul.ts`(`Voucher` 타입, `MAX_VOUCHERS_PER_ORDER`, `formatDate`, `daysLeft`) ·
`api/voucher-api.ts`, `api/voucher-schema.ts`, `api/menu-api.ts`(`quoteOrder`, 주문 요청) ·
`hooks/use-vouchers.tsx`, `hooks/use-cart.tsx`(`voucherIds`), `hooks/use-logout.ts` ·
`app/coupons.tsx`, `app/checkout.tsx`, `app/order-complete.tsx` · 목업: `api/mock-server.ts`

### 14.4 API 가정 (백엔드와 맞춰야 함)

```jsonc
// GET /vouchers
{ "vouchers": [{
    "kind": "MENU_EXCHANGE", "id": "v1", "title": "아메리카노 교환권",
    "status": "AVAILABLE",                     // AVAILABLE | USED | EXPIRED
    "expiresAt": "2027-08-17T14:59:59Z",
    "cafeId": "beomseok", "cafeName": "범석관", // 메뉴가 단종돼도 보여줄 수 있게 이름도 함께
    "menuId": "americano", "menuName": "아메리카노" }],
  "notice": "유의사항 문구 (법적 문구는 서버에서 내려 앱 배포 없이 수정)" }

// POST /orders/quote   요청: { schoolId, cafeId, menuVersion, items:[{menuId,qty}], vouchers:[{id}] }
{ "subtotal": 8500,
  "discounts": [{ "voucherId": "v1", "amount": 5000, "label": "카페 라떼 교환권" }],
  "total": 3500,
  "vouchers": [{ "id": "v1", "applicable": true },                       // 내 AVAILABLE 교환권 전부에 대해
               { "id": "v2", "applicable": false, "reason": "지금은 품절이에요" }] }
// menuVersion 이 최신과 다르면 409 { code: "MENU_CHANGED" } (주문과 동일)

// POST /orders  409
{ "code": "VOUCHER_UNAVAILABLE", "voucherIds": ["v1"], "reason": "유효기간이 지났어요" }
```

- `reason` 은 서버가 내려주는 **사용자용 문구**를 그대로 보여준다 (규칙 변경 시 앱 배포 불필요).
- `vouchers` 를 비워 보내도 응답의 `vouchers[]` 로 적용 가능 여부를 받는다 (결제 화면 진입 시 호출).

### 14.5 금액권(매장/앱 단위)을 추가할 때

1. `constants/coffeul.ts` 의 `Voucher` 에 `kind` 추가 (예: `CAFE_CREDIT { cafeId, balance }`, `APP_CREDIT { balance }`)
2. `api/voucher-schema.ts` 의 `parseVoucher` 에 해당 kind 파싱 추가 (지금은 알 수 없는 kind 를 **건너뛰므로** 서버가 먼저 내려줘도 구버전 앱이 깨지지 않음)
3. `coupons.tsx` 카드에 kind 별 표시(잔액 등) 추가, `바로 사용` 동작 정의
4. 결제 화면은 `quote` 의 `discounts` 를 그대로 보여주므로 대부분 변경 없음 (잔액 차감·여러 장 사용 규칙은 서버)
5. 한 주문에 여러 장을 허용하려면 `MAX_VOUCHERS_PER_ORDER` 만 올리면 UI 가 따라감

### 14.6 테스트 방법 (목업, 웹 `localhost:8082`)

| 확인할 것 | 방법 |
|---|---|
| 단종 시 보관 | `__ormoMock.discontinueMenu('americano')` → 앱을 백그라운드→포그라운드(30초 규칙 주의) → 쿠폰 화면에 "판매하지 않는 메뉴예요… 보관돼요", `바로 사용` 비활성, 목록에는 그대로 있음 |
| 바로 사용 → 0원 주문 | 쿠폰 화면에서 `바로 사용` → 장바구니 → 결제: 교환권 자동 선택, 최종 0원, 결제 수단 숨김, `교환권으로 주문하기` |
| 일부만 할인 | 교환권 메뉴 + 다른 메뉴를 담고 결제: 할인 후 금액이 결제 대상 |
| 앱이 모르는 사이 만료 | 결제 화면에서 `__ormoMock.expireVoucher('id')` → 결제 → 409 안내, 선택 해제, 금액 복구 |
| 품절 | `__ormoMock.setSoldOut('cafeId','menuId',true)` → 결제 화면 교환권이 비활성 + "지금은 품절이에요" |
| 서버 수신 확인 | `__ormoMock.state.lastOrder` 의 `vouchers`, `paymentMethod`('NONE' 포함) |

---

## 15. 친구 초대 이벤트 계획 (미구현 — 결정된 사항)

이벤트 규칙: 학생 1이 추천인 코드/링크로 신규 가입자 5명을 초대하면, **선착순 N명**에게 교환권 지급. (초대 수 집계·선착순 판정은 전부 서버.)

| 결정 | 내용 |
|---|---|
| 배포 | iOS/Android **스토어 앱**. 링크는 앱 설치 후 정보가 사라지므로 **추천인 코드 직접 입력을 기본 경로**로, 링크는 이미 설치한 사용자용 보조 수단으로 |
| 초대 인정 시점 | **가입 완료 = 이메일 인증 완료**. 인증 없이는 계정이 생성되지 않음 |
| 이메일 인증 방식 | **6자리 코드를 앱에서 입력** (링크 방식은 app link 설정에 기대야 해서 제외) |
| 보상 | 매장별 특정 메뉴 교환권 (§14). 개인 귀속, 양도 불가 |

가입 흐름 변경(예정): `가입 정보 입력(+추천인 코드) → 인증 메일 발송 → 코드 입력 → 계정 생성(=초대 인정)`

- 추천인 코드는 **가입 요청(1단계)에 함께 보낸다** — 서버가 가입 대기 건과 같이 보관했다가 인증 완료 시 인정.
- 메일 앱을 보러 나갔다 와도 이어지도록 **진행 중인 가입 상태(아이디, 추천인 코드)를 AsyncStorage 에 저장**하고 코드 입력 화면에서 복구.
- 코드 입력 화면: 만료 타이머, 재전송 쿨다운(60초 안팎), 오류 횟수 제한 안내.
- ⚠️ `EmailField` 는 지금 `@` 만 걸러서 `아이디+1` 같은 **`+` 별칭**을 입력할 수 있다 → 앱에서 `+` 입력 차단(UX), **서버에서 정규화해 중복 계정 방지(필수)**.
- 초대 현황 화면은 "가입 완료한 친구"만 표시하면 됨 (인증 대기 중인 친구는 서버에 계정이 없음). 친구 이름은 마스킹, 남은 쿠폰 수/기간/유의사항은 서버 값을 **캐시 없이** 표시.

이벤트 배너/팝업(예정): 로그인 후 첫 메뉴 화면 진입 시 세션당 1회, `오늘 하루 보지 않기`(기기 로컬 자정까지, 키 `popup:{userId}:{bannerId}`) / `닫기`,
서버 주도(`GET /banners`, 기간·타겟은 서버 필터), 이미지 로드 후에만 표시, `transparentModal` 라우트로 구현, 링크는 앱 내부 경로 허용 목록만.

구현 순서: ① 쿠폰(교환권) API화 + 결제 연동 **(완료, §14)** → ② 배너 팝업 → ③ 가입 2단계 + 초대 화면 → ④ 딥링크/푸시 (개발 빌드 필요 — 원격 푸시는 Expo Go Android 불가).

---

## 16. 참고 링크

- Expo SDK 57 문서: https://docs.expo.dev/versions/v57.0.0/
- Expo Router (라우팅): https://docs.expo.dev/router/introduction/
- expo-image: https://docs.expo.dev/versions/v57.0.0/sdk/image/
- React Native 컴포넌트: https://reactnative.dev/docs/components-and-apis
