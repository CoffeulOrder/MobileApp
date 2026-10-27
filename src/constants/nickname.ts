/**
 * 닉네임 규칙과 랜덤 생성기.
 *
 * 규칙 (앱과 서버가 같은 규칙을 써야 한다 — 서버도 반드시 다시 검증):
 *  - 길이 2~8자 (한글 한 글자 = 1자)
 *  - 한글(완성형), 영문, 숫자만. 공백/특수문자/이모지 불가
 *  - 중복 판정은 대소문자 구분 없이 (서버)
 * 최대 8자는 확정된 요구사항이고, 최소 2자와 허용 문자는 제가 정한 기본값이다. 바꾸려면 이 파일만 고치면 된다.
 */

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 8;

const NICKNAME_PATTERN = /^[가-힣A-Za-z0-9]+$/;

/** 문제가 있으면 사용자에게 보여줄 문구, 없으면 null */
export function validateNickname(value: string): string | null {
  const len = [...value].length;
  if (len === 0) return '닉네임을 입력해 주세요.';
  if (!NICKNAME_PATTERN.test(value)) return '한글, 영문, 숫자만 사용할 수 있어요.';
  if (len < NICKNAME_MIN) return `${NICKNAME_MIN}자 이상 입력해 주세요.`;
  if (len > NICKNAME_MAX) return `${NICKNAME_MAX}자까지 입력할 수 있어요.`;
  return null;
}

// 형용사 ≤3자 + 명사 ≤3자 + 숫자 2자리 = 최대 8자가 되도록 단어 길이를 3자 이하로 제한한다.
const ADJECTIVES = [
  '졸린', '행복한', '배고픈', '용감한', '느긋한', '상큼한', '달콤한', '고소한', '따뜻한', '시원한',
  '씩씩한', '포근한', '귀여운', '든든한', '신난', '엉뚱한', '수줍은', '당당한', '발랄한', '반짝',
];
const NOUNS = [
  '라떼', '모카', '원두', '크림', '머그', '쿠키', '도넛', '푸딩', '곰돌이', '고양이',
  '다람쥐', '토끼', '펭귄', '마카롱', '텀블러', '에이드', '캠퍼스', '카페',
];

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/**
 * "형용사+명사" 닉네임 (예: 졸린라떼). `withNumber` 면 뒤에 숫자를 붙여 겹칠 확률을 낮춘다 (예: 졸린라떼42).
 * 항상 NICKNAME_MAX 이하.
 */
export function randomNickname(withNumber: boolean): string {
  let name = pick(ADJECTIVES) + pick(NOUNS);
  if (withNumber) {
    const digits = Math.min(2, NICKNAME_MAX - name.length);
    if (digits > 0) name += String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, '0');
  }
  return name;
}
