/**
 * 로그아웃. 지금은 인증이 없어서 "사용자 데이터 비우기 + 로그인 화면으로 이동" 뿐이다.
 * 인증을 붙이면 토큰 삭제/서버 로그아웃 호출을 여기에 추가한다 (호출하는 쪽은 그대로).
 *
 * 비우는 것: 교환권·프로필/닉네임(개인 데이터), 이벤트 팝업 세션(다시 로그인하면 첫 메뉴 진입 때 팝업을 다시 시도).
 * 유지하는 것: 메뉴 캐시(공개 데이터), 학교 선택, "오늘 하루 보지 않기" 기록.
 */
import { router } from 'expo-router';
import { useCallback } from 'react';

import { useBanners } from '@/hooks/use-banners';
import { useProfile } from '@/hooks/use-profile';
import { useVouchers } from '@/hooks/use-vouchers';

export function useLogout() {
  const { reset: resetVouchers } = useVouchers();
  const { reset: resetBanners } = useBanners();
  const { reset: resetProfile } = useProfile();
  return useCallback(() => {
    resetVouchers();
    resetBanners();
    resetProfile();
    router.replace('/login');
  }, [resetVouchers, resetBanners, resetProfile]);
}
