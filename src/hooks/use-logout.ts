/**
 * 로그아웃. 지금은 인증이 없어서 "사용자 데이터 비우기 + 로그인 화면으로 이동" 뿐이다.
 * 인증을 붙이면 토큰 삭제/서버 로그아웃 호출을 여기에 추가한다 (호출하는 쪽은 그대로).
 *
 * 비우는 것: 교환권(개인 데이터). 유지하는 것: 메뉴 캐시(공개 데이터), 학교 선택.
 */
import { router } from 'expo-router';
import { useCallback } from 'react';

import { useVouchers } from '@/hooks/use-vouchers';

export function useLogout() {
  const { reset } = useVouchers();
  return useCallback(() => {
    reset();
    router.replace('/login');
  }, [reset]);
}
