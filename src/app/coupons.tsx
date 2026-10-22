import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingView, RetryView, ScreenHeader } from '@/components/ui/kit';
import { C, daysLeft, formatDate, Radius, S, type Voucher } from '@/constants/coffeul';
import { useCart } from '@/hooks/use-cart';
import { useMenu } from '@/hooks/use-menu';
import { useVouchers } from '@/hooks/use-vouchers';

type Tab = 'available' | 'history';

/** 쿠폰 관리: 내 교환권 목록 (개인 계정에 귀속, 코드 등록/양도 없음). */
export default function CouponsScreen() {
  const [tab, setTab] = useState<Tab>('available');
  const { vouchers, notice, status, refresh } = useVouchers();
  const { payload, cafe, soldOut, selectCafe, refreshSoldOut } = useMenu();
  const cart = useCart();

  // 들어올 때마다 새로 조회 (개인 데이터라 캐시하지 않음) + 교환권이 걸린 카페들의 품절 현황
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const cafeIds = useMemo(() => [...new Set(vouchers.map((v) => v.cafeId))], [vouchers]);
  useFocusEffect(
    useCallback(() => {
      cafeIds.forEach((id) => void refreshSoldOut(id));
    }, [cafeIds, refreshSoldOut]),
  );

  const usable = vouchers
    .filter((v) => v.status === 'AVAILABLE' && daysLeft(v.expiresAt) >= 0)
    .sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt)); // 만료 임박순
  const history = vouchers.filter((v) => !usable.includes(v));
  const list = tab === 'available' ? usable : history;

  /** 이 교환권의 메뉴를 지금 주문할 수 있는가? (표시용 판단 — 실제 가능 여부는 결제 때 서버가 판단) */
  const menuOf = (v: Voucher) =>
    payload?.cafes.find((c) => c.id === v.cafeId)?.menus.find((m) => m.id === v.menuId);
  const blockedReason = (v: Voucher) => {
    if (!menuOf(v)) return '지금은 판매하지 않는 메뉴예요. 유효기간까지 보관돼요.';
    if (soldOut[v.cafeId]?.includes(v.menuId)) return '지금은 품절이에요.';
    return null;
  };

  /** 바로 사용: 그 지점으로 이동 + 메뉴 담기 + 교환권 선택 → 메뉴 화면 */
  const useNow = (v: Voucher) => {
    const item = menuOf(v);
    if (!item) return;
    if (cafe?.id !== v.cafeId) cart.clear(); // 다른 지점 메뉴가 섞이지 않게 (지점 선택과 같은 규칙)
    selectCafe(v.cafeId);
    if (cafe?.id !== v.cafeId || !cart.lines.some((l) => l.item.id === item.id)) cart.add(item);
    cart.setVoucherIds([v.id]);
    router.dismissTo('/menu');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="쿠폰 관리" />

      <View style={styles.tabs}>
        {(['available', 'history'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'available' ? `사용 가능 ${usable.length}` : `사용 완료·만료 ${history.length}`}
            </Text>
          </Pressable>
        ))}
      </View>

      {status === 'loading' && <LoadingView label="교환권을 불러오는 중…" />}
      {status === 'error' && (
        <RetryView message="교환권을 불러오지 못했어요. 네트워크를 확인해 주세요." onRetry={refresh} />
      )}

      {(status === 'ready' || vouchers.length > 0) && (
        <ScrollView contentContainerStyle={styles.content}>
          {list.length === 0 && (
            <Text style={styles.empty}>
              {tab === 'available' ? '사용 가능한 교환권이 없어요.' : '내역이 없어요.'}
            </Text>
          )}

          {list.map((v) => {
            const isUsable = tab === 'available';
            const blocked = isUsable ? blockedReason(v) : null;
            const left = daysLeft(v.expiresAt);
            const thumb = menuOf(v)?.thumbnailUrl;
            return (
              <View key={v.id} style={[styles.card, !isUsable && { opacity: 0.55 }]}>
                <View style={styles.thumb}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumbImg} contentFit="cover" cachePolicy="disk" />
                  ) : (
                    <Text style={{ fontSize: 22, opacity: 0.5 }}>☕</Text>
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.cafe}>{v.cafeName}</Text>
                  <Text style={styles.title}>{v.title}</Text>
                  <View style={styles.dueRow}>
                    <Text style={styles.due}>
                      {formatDate(v.expiresAt)}까지
                      {!isUsable && (v.status === 'USED' ? ' · 사용 완료' : ' · 기간 만료')}
                    </Text>
                    {isUsable && left <= 30 && (
                      <Text style={styles.dday}>{left === 0 ? '오늘 만료' : `D-${left}`}</Text>
                    )}
                  </View>
                  {blocked && <Text style={styles.blocked}>{blocked}</Text>}
                </View>
                {isUsable && (
                  <Pressable
                    disabled={!!blocked || !payload}
                    onPress={() => useNow(v)}
                    style={({ pressed }) => [
                      styles.useBtn,
                      (!!blocked || !payload) && styles.useBtnDisabled,
                      pressed && { opacity: 0.7 },
                    ]}>
                    <Text style={styles.useBtnText}>바로 사용</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {notice && <Text style={styles.notice}>{notice}</Text>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  tabs: {
    flexDirection: 'row',
    gap: S.sm,
    paddingHorizontal: S.lg,
    paddingBottom: S.sm,
  },
  tab: {
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    borderRadius: Radius.pill,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { color: C.textSecondary, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: C.onPrimary },
  content: { padding: S.lg, gap: S.md },
  empty: { color: C.textMuted, textAlign: 'center', paddingVertical: S.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: S.md,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  cafe: { color: C.textSecondary, fontSize: 12, fontWeight: '700' },
  title: { color: C.text, fontSize: 15, fontWeight: '800' },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  due: { color: C.textSecondary, fontSize: 12 },
  dday: {
    color: C.onInk,
    backgroundColor: C.ink,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: S.sm,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  blocked: { color: C.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  useBtn: {
    backgroundColor: C.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },
  useBtnDisabled: { backgroundColor: C.border },
  useBtnText: { color: C.onPrimary, fontSize: 13, fontWeight: '800' },
  notice: { color: C.textMuted, fontSize: 12, lineHeight: 18, marginTop: S.md },
});
