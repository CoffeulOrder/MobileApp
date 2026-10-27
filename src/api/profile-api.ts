/**
 * 내 정보 / 닉네임 API.
 *
 *   GET  /nicknames/availability?nickname=  -> { available: boolean, reason?: 'TAKEN' | 'INVALID' | 'FORBIDDEN' }
 *   POST /auth/signup                        -> { nickname }   | 409 NICKNAME_TAKEN | 400 NICKNAME_INVALID
 *   GET  /me                                 -> { nickname }
 *   POST /me/nickname  { nickname }          -> { nickname }   | 409 NICKNAME_TAKEN | 400 NICKNAME_INVALID
 *
 * 중복 확인은 "예약"이 아니다 — 확인 후 가입/변경 사이에 다른 사용자가 먼저 쓸 수 있으므로
 * 서버는 가입/변경 요청에서 다시 검증하고, 앱은 409 NICKNAME_TAKEN 을 받으면 다시 고르게 한다.
 * 닉네임 규칙(2~8자, 한글/영문/숫자)은 `constants/nickname.ts` — 서버도 같은 규칙으로 검증해야 한다.
 *
 * ⚠️ 경로/형태는 협의된 스펙이 없어 가정한 것이다. 백엔드와 맞춰야 함 (docs/GUIDE.md §16).
 *    signup 은 이메일 인증(6자리 코드) 단계가 붙으면 2단계로 나뉜다 — 닉네임은 1단계 요청에 같이 보낸다.
 */
import { apiRequest } from '@/api/client';
import { SchemaError } from '@/api/menu-schema';

export type AvailabilityReason = 'TAKEN' | 'INVALID' | 'FORBIDDEN';
export type Availability = { available: boolean; reason?: AvailabilityReason };
export type Profile = { nickname: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function parseProfile(raw: unknown): Profile {
  if (!isObj(raw) || typeof raw.nickname !== 'string' || raw.nickname.length === 0) {
    throw new SchemaError('profile');
  }
  return { nickname: raw.nickname };
}

export async function checkNickname(nickname: string): Promise<Availability> {
  const raw = await apiRequest('GET', `/nicknames/availability?nickname=${encodeURIComponent(nickname)}`);
  if (!isObj(raw) || typeof raw.available !== 'boolean') throw new SchemaError('availability');
  const reason = raw.reason === 'TAKEN' || raw.reason === 'INVALID' || raw.reason === 'FORBIDDEN' ? raw.reason : undefined;
  return { available: raw.available, reason };
}

export type SignUpRequest = {
  schoolId: string;
  email: string;
  name: string;
  password: string;
  nickname: string;
};

export async function signUp(req: SignUpRequest): Promise<Profile> {
  return parseProfile(await apiRequest('POST', '/auth/signup', req));
}

export async function fetchMe(): Promise<Profile> {
  return parseProfile(await apiRequest('GET', '/me'));
}

export async function changeNickname(nickname: string): Promise<Profile> {
  return parseProfile(await apiRequest('POST', '/me/nickname', { nickname }));
}
