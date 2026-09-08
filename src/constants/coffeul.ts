/**
 * Coffeul design tokens — a warm, dark "coffee shop" palette.
 * UI-only mock: colors, spacing, radius, and the menu seed data.
 */

export const C = {
  /** page background (top of the subtle vertical fade) */
  bg: '#241811',
  bgDeep: '#1A0F09',
  /** raised surfaces: cards, inputs, sheets */
  surface: '#2E2016',
  surfaceAlt: '#3A2A1D',
  /** hairlines */
  border: '#4A3626',
  /** brand gold */
  primary: '#D6A15E',
  primaryDim: '#B9863F',
  /** text sitting on top of `primary` */
  onPrimary: '#2A1B0C',
  /** text */
  text: '#F4ECE2',
  textSecondary: '#C7B39E',
  textMuted: '#8C7861',
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

export const SERIF = 'Georgia';

export type Category = '에스프레소' | '논커피' | '티' | '디저트';

export const CATEGORIES: Category[] = ['에스프레소', '논커피', '티', '디저트'];

export type MenuItem = {
  id: string;
  name: string;
  desc: string;
  price: number;
  category: Category;
  image?: string;
};

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=400&q=70&auto=format&fit=crop`;

export const MENU: MenuItem[] = [
  {
    id: 'espresso',
    name: '에스프레소',
    desc: '진하고 풍부한 에스프레소 샷',
    price: 3500,
    category: '에스프레소',
    image: img('1510591509098-f4fdc6d0ff04'),
  },
  {
    id: 'americano',
    name: '아메리카노',
    desc: '에스프레소에 물을 더해 깔끔하게',
    price: 4000,
    category: '에스프레소',
    image: img('1521302080334-4bebac2763a6'),
  },
  {
    id: 'cappuccino',
    name: '카푸치노',
    desc: '에스프레소, 스팀밀크, 우유 거품의 조화',
    price: 5000,
    category: '에스프레소',
    image: img('1534778101976-62847782c213'),
  },
  {
    id: 'latte',
    name: '카페 라떼',
    desc: '부드러운 스팀밀크와 에스프레소',
    price: 5000,
    category: '에스프레소',
    image: img('1541167760496-1628856ab772'),
  },
  {
    id: 'vanilla-latte',
    name: '바닐라 라떼',
    desc: '달콤한 바닐라 시럽이 어우러진 라떼',
    price: 5500,
    category: '에스프레소',
    image: img('1461023058943-07fcbe16d735'),
  },
  {
    id: 'choco',
    name: '초콜릿 라떼',
    desc: '진한 초콜릿과 우유의 달콤한 만남',
    price: 5500,
    category: '논커피',
    image: img('1517578239113-b03992dcdd25'),
  },
  {
    id: 'milk-tea',
    name: '밀크티',
    desc: '홍차와 우유가 어우러진 부드러운 맛',
    price: 5000,
    category: '논커피',
  },
  {
    id: 'earl-grey',
    name: '얼그레이',
    desc: '베르가못 향이 은은한 홍차',
    price: 4500,
    category: '티',
    image: img('1594631252845-29fc4cc8cde9'),
  },
  {
    id: 'peppermint',
    name: '페퍼민트',
    desc: '상쾌하고 깔끔한 허브티',
    price: 4500,
    category: '티',
  },
  {
    id: 'cheesecake',
    name: '뉴욕 치즈케이크',
    desc: '꾸덕하고 진한 클래식 치즈케이크',
    price: 6500,
    category: '디저트',
    image: img('1533134242443-d4fd215305ad'),
  },
  {
    id: 'brownie',
    name: '브라우니',
    desc: '겉은 바삭 속은 촉촉한 초코 브라우니',
    price: 5000,
    category: '디저트',
  },
];

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
