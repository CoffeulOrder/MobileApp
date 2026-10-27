/**
 * 닉네임 입력 상태: 입력값, 형식 검사, 서버 중복 확인, 랜덤 생성.
 *
 * - 입력이 바뀌면 확인 결과가 무효가 된다 → 다시 `check()` 해야 `verified` 가 된다.
 * - `random()` 은 "형용사+명사"를 만들어 서버에 확인하고, 사용 가능한 것이 나올 때까지(최대 5번) 반복한다.
 *   처음 2번은 숫자 없이, 이후에는 숫자를 붙여 겹칠 확률을 낮춘다.
 * - 중복 확인은 예약이 아니므로, 가입/변경 요청에서 409 NICKNAME_TAKEN 을 받으면 `markTaken()` 으로 되돌린다.
 */
import { useRef, useState } from 'react';

import { checkNickname, type AvailabilityReason } from '@/api/profile-api';
import { randomNickname, validateNickname } from '@/constants/nickname';

export type NicknameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';

const REASON_TEXT: Record<AvailabilityReason, string> = {
  TAKEN: '이미 사용 중인 닉네임이에요.',
  INVALID: '사용할 수 없는 형식이에요.',
  FORBIDDEN: '사용할 수 없는 닉네임이에요.',
};

const MAX_RANDOM_TRIES = 5;

export function useNicknameInput(opts?: { initial?: string; current?: string }) {
  const [value, setValueState] = useState(opts?.initial ?? '');
  const [status, setStatus] = useState<NicknameStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const seq = useRef(0); // 오래된 응답이 최신 입력을 덮어쓰지 않게

  /** 사용자가 입력을 바꿈 → 이전 확인 결과는 무효 */
  const setValue = (v: string) => {
    seq.current += 1;
    setValueState(v);
    setStatus('idle');
    setMessage(null);
  };

  /** 형식 검사 + 서버 중복 확인. 사용 가능하면 true */
  const check = async (): Promise<boolean> => {
    const err = validateNickname(value);
    if (err) {
      setStatus('invalid');
      setMessage(err);
      return false;
    }
    if (opts?.current && value.toLowerCase() === opts.current.toLowerCase()) {
      setStatus('invalid');
      setMessage('현재 사용 중인 닉네임이에요.');
      return false;
    }
    const run = ++seq.current;
    setStatus('checking');
    setMessage(null);
    try {
      const res = await checkNickname(value);
      if (run !== seq.current) return false;
      if (res.available) {
        setStatus('available');
        setMessage('사용할 수 있는 닉네임이에요.');
        return true;
      }
      setStatus(res.reason === 'TAKEN' ? 'taken' : 'invalid');
      setMessage(REASON_TEXT[res.reason ?? 'INVALID']);
      return false;
    } catch {
      if (run !== seq.current) return false;
      setStatus('error');
      setMessage('확인하지 못했어요. 네트워크를 확인해 주세요.');
      return false;
    }
  };

  /** 랜덤 닉네임을 만들고, 서버에서 사용 가능한 것으로 확인된 것을 채운다 */
  const random = async (): Promise<boolean> => {
    const run = ++seq.current;
    setStatus('checking');
    setMessage(null);
    try {
      for (let attempt = 0; attempt < MAX_RANDOM_TRIES; attempt++) {
        const candidate = randomNickname(attempt >= 2);
        const res = await checkNickname(candidate);
        if (run !== seq.current) return false; // 그 사이 사용자가 직접 입력함
        if (res.available) {
          setValueState(candidate);
          setStatus('available');
          setMessage('사용할 수 있는 닉네임이에요.');
          return true;
        }
      }
      setStatus('error');
      setMessage('닉네임을 만들지 못했어요. 다시 눌러 주세요.');
    } catch {
      if (run !== seq.current) return false;
      setStatus('error');
      setMessage('닉네임을 만들지 못했어요. 네트워크를 확인해 주세요.');
    }
    return false;
  };

  /** 서버가 요청 시점에 "이미 사용 중" 이라고 돌려준 경우 */
  const markTaken = () => {
    seq.current += 1;
    setStatus('taken');
    setMessage('방금 다른 사용자가 사용했어요. 다른 닉네임을 입력해 주세요.');
  };

  return { value, setValue, status, message, check, random, markTaken, verified: status === 'available' };
}

export type NicknameInput = ReturnType<typeof useNicknameInput>;
