# Coffeul 앱 개발 가이드

원격 커피 주문 앱 **Coffeul**의 UI 목업 코드 구조와 유지보수 방법을 정리한 문서입니다.
현재 단계는 **UI만 구현된 상태**이며, 백엔드/인증/결제는 모두 흉내만 냅니다.

---

## 1. 기술 스택

| 항목 | 버전 / 내용 |
|---|---|
| Expo SDK | 57 |
| React Native | 0.86 |
| React | 19.2 |
| 라우팅 | `expo-router` (파일 기반 라우팅) |
| 이미지 | `expo-image` |
| 언어 | TypeScript (strict) |
| 스타일 | `StyleSheet` (RN 기본, 별도 CSS 라이브러리 없음) |

> 추가로 설치한 패키지는 **없습니다.** 프로젝트 생성 시 들어온 것만 사용합니다.
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
├── app/                    # 화면 = 라우트 (파일 이름이 곧 URL 경로)
│   ├── _layout.tsx         # 루트 레이아웃: 네비게이션 + 전역 Provider
│   ├── index.tsx           # "/"        로그인 / 회원가입
│   ├── menu.tsx            # "/menu"    메뉴 목록 + 장바구니 바
│   ├── cart.tsx            # "/cart"    장바구니 (반투명 모달)
│   └── checkout.tsx        # "/checkout" 결제
│
├── components/
│   └── ui/
│       └── kit.tsx         # 공용 컴포넌트: Logo, PrimaryButton, Field
│
├── constants/
│   ├── coffeul.ts          # ⭐ 디자인 토큰 + 메뉴 더미 데이터 (여기부터 보면 됨)
│   └── theme.ts            # (스타터 잔재, 현재 미사용)
│
└── hooks/
    ├── use-cart.tsx        # 장바구니 전역 상태 (Context)
    ├── use-theme.ts        # (스타터 잔재, 현재 미사용)
    └── use-color-scheme*   # (스타터 잔재, 현재 미사용)
```

`@/` 는 `src/` 의 별칭입니다. (`import { C } from '@/constants/coffeul'`)

`theme.ts`, `use-theme.ts`, `use-color-scheme*` 는 프로젝트 생성 시 딸려온 파일로 지금은
아무 데서도 import 하지 않습니다. 라이트/다크 테마를 도입할 계획이 없으면 삭제해도 됩니다.

---

## 4. 라우팅 구조 (expo-router)

`src/app/` 안의 파일이 자동으로 화면이 됩니다. 별도 라우트 등록이 필요 없습니다.

```
파일                     경로          이동 코드
─────────────────────────────────────────────────────────────
src/app/index.tsx        /            router.replace('/')
src/app/menu.tsx         /menu        router.replace('/menu')
src/app/cart.tsx         /cart        router.push('/cart')
src/app/checkout.tsx     /checkout    router.push('/checkout')
```

- **`router.push`** — 화면을 스택에 쌓음 (뒤로가기 가능). 장바구니, 결제에 사용.
- **`router.replace`** — 현재 화면을 교체 (뒤로가기 불가). 로그인→메뉴, 로그아웃→로그인에 사용.
- **`router.back()`** — 뒤로가기.

`_layout.tsx` 의 `<Stack.Screen>` 설정:

- 모든 화면 `headerShown: false` — 헤더는 각 화면이 직접 그림.
- `cart` 만 `presentation: 'transparentModal'` — 뒤 화면이 비치는 바텀시트 모달.

`app.json` 에 `"typedRoutes": true` 가 켜져 있어서, 새 화면 파일을 추가하면
`expo start` 가 경로 타입을 자동 생성합니다. 새 경로가 타입 에러로 뜨면 서버를 재시작하세요.

---

## 5. 디자인 토큰 — `src/constants/coffeul.ts`

색상, 간격, 모서리 둥글기를 이 파일 하나에서 관리합니다. **하드코딩된 색상값을 화면에 직접 쓰지 마세요.**

### 색상 `C`

| 토큰 | 용도 |
|---|---|
| `C.bg` / `C.bgDeep` | 배경 |
| `C.surface` / `C.surfaceAlt` | 카드, 입력창, 시트 등 떠 있는 면 |
| `C.border` | 테두리 선 |
| `C.primary` / `C.primaryDim` | 브랜드 골드 (버튼, 강조) |
| `C.onPrimary` | 골드 배경 위에 올라가는 글자색 (진한 갈색) |
| `C.text` / `C.textSecondary` / `C.textMuted` | 글자 (기본 / 보조 / 흐림) |

### 간격 `S` 와 둥글기 `Radius`

```ts
S.xs(4)  S.sm(8)  S.md(12)  S.lg(16)  S.xl(24)  S.xxl(32)
Radius.sm(10)  Radius.md(16)  Radius.lg(22)  Radius.pill(999)
```

### 유틸

- `won(5000)` → `"5,000원"` (가격 표시는 항상 이걸 사용)
- `SERIF` — 로고용 세리프 폰트 이름

### 색 테마를 통째로 바꾸고 싶을 때

`coffeul.ts` 의 `C` 객체 값만 수정하면 전 화면에 반영됩니다.

---

## 6. 장바구니 상태 — `src/hooks/use-cart.tsx`

React Context 기반의 **메모리 전용** 장바구니입니다. 앱을 껐다 켜거나 웹에서 새로고침하면 비워집니다.

`_layout.tsx` 에서 `<CartProvider>` 로 전체 앱을 감싸고 있으므로,
어느 화면에서든 `useCart()` 로 접근합니다.

```tsx
const cart = useCart();

cart.lines            // { item, qty }[]  담긴 항목들
cart.count            // 총 수량 (숫자)
cart.total            // 총 금액 (숫자)

cart.add(item)        // 항목 담기 (이미 있으면 수량 +1)
cart.setQty(id, n)    // 수량 지정 (0 이하 → 자동 삭제)
cart.remove(id)       // 항목 제거
cart.clear()          // 전체 비우기 (결제 완료 시 호출)
```

`item` 은 `coffeul.ts` 의 `MenuItem` 타입입니다.

---

## 7. 자주 하는 수정 작업 (레시피)

### 7.1 메뉴 항목 추가 / 수정

`src/constants/coffeul.ts` 의 `MENU` 배열을 편집합니다.

```ts
{
  id: 'cold-brew',          // 고유값 (영문). 장바구니 식별에 쓰임
  name: '콜드브루',
  desc: '12시간 저온 추출한 부드러운 커피',
  price: 5500,
  category: '논커피',        // CATEGORIES 중 하나여야 함
  image: img('사진ID'),      // 생략 가능 (생략 시 ☕ 아이콘 표시)
}
```

`img('...')` 의 인자는 Unsplash 사진 ID입니다. 로컬 이미지를 쓰려면 7.4 참고.

### 7.2 카테고리 추가

같은 파일에서 두 곳을 수정:

```ts
export type Category = '에스프레소' | '논커피' | '티' | '디저트' | '시즌메뉴';
export const CATEGORIES: Category[] = ['에스프레소', '논커피', '티', '디저트', '시즌메뉴'];
```

메뉴 화면의 카테고리 칩은 `CATEGORIES` 를 그대로 렌더하므로 자동 반영됩니다.

### 7.3 색상 / 여백 조정

`src/constants/coffeul.ts` 의 `C`, `S`, `Radius` 수정 → 전 화면 반영.
특정 화면만 바꾸려면 해당 화면 파일 하단 `StyleSheet.create({...})` 를 수정.

### 7.4 이미지를 로컬 파일로 교체

1. `assets/images/` 에 파일 추가 (예: `latte.png`)
2. `coffeul.ts` 의 `MenuItem` 이미지 필드를 URL 문자열 대신 `require` 로:
   ```ts
   image: require('@/assets/images/latte.png'),
   ```
   타입도 `image?: string` → `image?: string | number` 로 넓혀야 합니다.
3. `menu.tsx` 의 `<Image source={{ uri: item.image }} />` 를
   `<Image source={item.image} />` 로 (require 결과는 객체가 아님).

### 7.5 새 화면 추가

1. `src/app/새이름.tsx` 파일 생성, `export default function` 으로 컴포넌트 작성
2. 필요하면 `_layout.tsx` 에 `<Stack.Screen name="새이름" />` 추가 (옵션 지정할 때만 필수)
3. 다른 화면에서 `router.push('/새이름')` 로 이동
4. 타입 에러가 나면 `expo start` 재시작

### 7.6 공용 버튼 / 입력창 사용

`src/components/ui/kit.tsx` 의 `PrimaryButton`, `Field`, `Logo` 를 재사용하세요.
새로운 공용 요소가 생기면 이 파일에 추가합니다.

---

## 8. 실제 앱으로 발전시킬 때 할 일

현재는 UI 목업입니다. 프로덕션으로 가려면:

| 영역 | 현재 상태 | 해야 할 일 |
|---|---|---|
| 인증 | 버튼 누르면 검증 없이 `/menu` 이동 | 실제 로그인 API, 토큰 저장 (`expo-secure-store`) |
| 장바구니 | 메모리에만 존재, 새로고침 시 소실 | `@react-native-async-storage/async-storage` 로 영속화, 또는 서버 장바구니 |
| 메뉴 데이터 | `coffeul.ts` 하드코딩 | API 연동 + 로딩/에러 상태 처리 |
| 결제 | `Alert` 팝업만 띄움 | 실제 PG 연동 (토스페이먼츠, 카카오페이 등) |
| 결제수단 아이콘 | 단색 원 | 각 페이 공식 로고 에셋 |
| 주문 완료 후 | 메뉴로 복귀 | 주문 상세/상태 추적 화면 |
| 서버 상태 관리 | 없음 | 데이터 요청 많아지면 TanStack Query 등 검토 |

---

## 9. 알려진 제약

- **웹**: 새로고침 시 장바구니 초기화 (메모리 상태라서). `Alert` 는 브라우저 기본 팝업 모양.
- **이미지**: Unsplash 원격 URL이라 네트워크가 없으면 안 뜸. 이미지 없는 항목은 ☕ 아이콘으로 대체됨.
- **다크모드 전용**: 라이트 모드 대응 안 함. 색상은 어두운 배경 기준으로만 맞춰져 있음.
- **폼 검증 없음**: 이메일 형식, 카드번호 등 아무 검증도 하지 않음.

---

## 10. 참고 링크

- Expo SDK 57 문서: https://docs.expo.dev/versions/v57.0.0/
- Expo Router (라우팅): https://docs.expo.dev/router/introduction/
- expo-image: https://docs.expo.dev/versions/v57.0.0/sdk/image/
- React Native 컴포넌트: https://reactnative.dev/docs/components-and-apis
