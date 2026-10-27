import { Image } from 'expo-image';
import { Redirect, router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, LoadingView, RetryView } from '@/components/ui/kit';
import { C, Radius, S, won, type MenuItem } from '@/constants/coffeul';
import { useBanners } from '@/hooks/use-banners';
import { useCart } from '@/hooks/use-cart';
import { useLogout } from '@/hooks/use-logout';
import { useProfile } from '@/hooks/use-profile';
import { useMenu } from '@/hooks/use-menu';
import { useSchool } from '@/hooks/use-school';

const PROFILE_ACTIONS: { icon: string; label: string; go: () => void }[] = [
  { icon: '🧋', label: '주문하기', go: () => {} },
  { icon: '💳', label: '결제수단 관리', go: () => router.push('/payment-methods') },
  { icon: '🔔', label: '주문 알림', go: () => router.push('/notifications') },
  { icon: '🎟️', label: '쿠폰 관리', go: () => router.push('/coupons') },
  { icon: '✏️', label: '닉네임 변경', go: () => router.push('/nickname') },
];

export default function MenuScreen() {
  const [cat, setCat] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const cart = useCart();
  const banners = useBanners();
  const navigation = useNavigation();
  const logout = useLogout();
  const profile = useProfile();
  const { school } = useSchool();
  const { cafe, status, soldOut, sync, retry, refreshSoldOut } = useMenu();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = (width - S.lg * 2 - S.md) / 2;

  const cafeId = cafe?.id ?? null;

  // 화면에 들어올 때마다: 메뉴 버전 체크(30초 이내면 생략) + 이 카페의 품절 현황 조회(캐시 안 함)
  useFocusEffect(
    useCallback(() => {
      void sync('screen');
      if (cafeId) void refreshSoldOut(cafeId);
    }, [sync, refreshSoldOut, cafeId]),
  );

  // 내 닉네임을 아직 못 받았으면 받아온다 (인사말에 표시)
  useEffect(() => {
    if (profile.nickname === null) void profile.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 이벤트 팝업: 로그인 후 첫 메뉴 진입 때 한 번만 준비한다 (세션당 1회, 로그아웃하면 초기화)
  useFocusEffect(
    useCallback(() => {
      banners.prepare();
    }, [banners.prepare]),
  );
  // 후보가 준비됐을 때 이 화면에 머물러 있고 아직 메뉴를 담지 않았을 때만 띄운다 (담는 중이면 방해하지 않고 건너뜀)
  useEffect(() => {
    if (!banners.candidate) return;
    if (navigation.isFocused() && cart.count === 0 && !menuOpen) {
      if (banners.show()) router.push('/banner');
    } else {
      banners.skip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners.candidate]);

  const categories = useMemo(() => [...new Set((cafe?.menus ?? []).map((m) => m.category))], [cafe]);
  const activeCat = cat && categories.includes(cat) ? cat : (categories[0] ?? null);
  const items = useMemo(
    () => (cafe?.menus ?? []).filter((m) => m.category === activeCat),
    [cafe, activeCat],
  );
  const soldOutSet = useMemo(() => new Set(soldOut[cafeId ?? ''] ?? []), [soldOut, cafeId]);
  const qtyOf = (id: string) => cart.lines.find((l) => l.item.id === id)?.qty ?? 0;

  if (!school) return <Redirect href="/" />;
  if (!cafe) {
    if (status === 'loading') return <LoadingView label="메뉴를 불러오는 중…" />;
    if (status === 'error') {
      return (
        <RetryView message="메뉴를 불러오지 못했어요. 네트워크를 확인해 주세요." onRetry={retry} />
      );
    }
    return <Redirect href="/branch" />; // 지점을 아직 고르지 않았거나, 갱신으로 지점이 사라짐
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable style={styles.profileRow} onPress={() => setMenuOpen((v) => !v)} hitSlop={6}>
          <Avatar />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.brand}>ORMO</Text>
            <Text style={styles.hello} numberOfLines={1}>
              안녕하세요, {profile.nickname ?? '고객'}님 ☕
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerRight}>
          <Pressable style={styles.chip} onPress={() => router.replace('/branch')}>
            <Text style={styles.chipText}>
              {cafe.name} <Text style={styles.chipLink}>변경</Text>
            </Text>
          </Pressable>
          <Pressable style={styles.chip} onPress={logout}>
            <Text style={styles.chipText}>로그아웃</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
        style={styles.pillsWrap}
        keyboardShouldPersistTaps="handled">
        {categories.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCat(c)}
            style={[styles.pill, activeCat === c && styles.pillActive]}>
            <Text style={[styles.pillText, activeCat === c && styles.pillTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: cart.count > 0 ? 110 : S.xl },
        ]}>
        {items.length === 0 && <Text style={styles.empty}>등록된 메뉴가 없어요.</Text>}
        {items.map((item) => (
          <Card
            key={item.id}
            item={item}
            width={cardW}
            qty={qtyOf(item.id)}
            soldOut={soldOutSet.has(item.id)}
            onAdd={() => cart.add(item)}
          />
        ))}
      </ScrollView>

      {cart.count > 0 && (
        <View style={styles.barWrap}>
          <Pressable style={styles.bar} onPress={() => router.push('/cart')}>
            <View style={styles.barBadge}>
              <Text style={styles.barBadgeText}>{cart.count}</Text>
            </View>
            <Text style={styles.barLabel}>장바구니 보기</Text>
            <Text style={styles.barTotal}>{won(cart.total)}</Text>
          </Pressable>
        </View>
      )}

      {menuOpen && (
        <View style={styles.menuLayer}>
          <Pressable style={styles.menuDismiss} onPress={() => setMenuOpen(false)} />
          <View style={[styles.menuCard, { top: insets.top + 54 }]}>
            {PROFILE_ACTIONS.map((a) => (
              <Pressable
                key={a.label}
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: C.surfaceAlt }]}
                onPress={() => {
                  setMenuOpen(false);
                  a.go();
                }}>
                <Text style={styles.menuIcon}>{a.icon}</Text>
                <Text style={styles.menuItemLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function Card({
  item,
  width,
  qty,
  soldOut,
  onAdd,
}: {
  item: MenuItem;
  width: number;
  qty: number;
  soldOut: boolean;
  onAdd: () => void;
}) {
  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.thumb}>
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.thumbImg}
            contentFit="cover"
            transition={200}
            cachePolicy="disk"
            recyclingKey={item.id}
          />
        ) : (
          <Text style={styles.thumbFallback}>☕</Text>
        )}
        {qty > 0 && (
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyBadgeText}>{qty}</Text>
          </View>
        )}
        {soldOut && (
          <View style={styles.soldOutMask}>
            <Text style={styles.soldOutBadge}>품절</Text>
          </View>
        )}
      </View>
      <View style={[styles.cardBody, soldOut && { opacity: 0.45 }]}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.desc} numberOfLines={2}>
          {item.desc}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{won(item.price)}</Text>
          <Pressable
            style={[styles.add, soldOut && styles.addDisabled]}
            onPress={onAdd}
            disabled={soldOut}
            hitSlop={8}>
            <Text style={styles.addText}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    paddingTop: S.md,
    paddingBottom: S.md,
    gap: S.sm,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, flexShrink: 1 },
  brand: { fontSize: 20, fontWeight: '900', color: C.ink, letterSpacing: 0.5 },
  hello: { color: C.textSecondary, fontSize: 12, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  chip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.sm,
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
  },
  chipText: { color: C.textSecondary, fontSize: 12 },
  chipLink: { color: C.primary, fontWeight: '800', textDecorationLine: 'underline' },

  pillsWrap: { flexGrow: 0, flexShrink: 0 },
  pills: { paddingHorizontal: S.lg, gap: S.sm, paddingVertical: S.sm, alignItems: 'center' },
  pill: {
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderRadius: Radius.pill,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillActive: { backgroundColor: C.primary, borderColor: C.primary },
  pillText: { color: C.textSecondary, fontWeight: '700', fontSize: 14 },
  pillTextActive: { color: C.onPrimary },

  gridScroll: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
    gap: S.md,
  },
  empty: { color: C.textMuted, fontSize: 14, paddingVertical: S.xl, width: '100%', textAlign: 'center' },
  card: {
    backgroundColor: C.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  thumb: {
    height: 120,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbFallback: { fontSize: 34, opacity: 0.5 },
  qtyBadge: {
    position: 'absolute',
    top: S.sm,
    right: S.sm,
    minWidth: 24,
    height: 24,
    borderRadius: Radius.pill,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qtyBadgeText: { color: C.onPrimary, fontWeight: '800', fontSize: 12 },
  soldOutMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(243,246,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutBadge: {
    color: C.onInk,
    backgroundColor: C.ink,
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  cardBody: { padding: S.md, gap: S.xs },
  name: { color: C.text, fontSize: 15, fontWeight: '800' },
  desc: { color: C.textSecondary, fontSize: 12, lineHeight: 17, minHeight: 34 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: S.xs,
  },
  price: { color: C.primary, fontSize: 15, fontWeight: '800' },
  add: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDisabled: { backgroundColor: C.border },
  addText: { color: C.onPrimary, fontSize: 18, fontWeight: '800', lineHeight: 20 },

  barWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: S.lg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    borderRadius: Radius.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.lg,
    gap: S.md,
  },
  barBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: Radius.pill,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  barBadgeText: { color: C.onInk, fontWeight: '800', fontSize: 12 },
  barLabel: { flex: 1, textAlign: 'center', color: C.onPrimary, fontWeight: '800', fontSize: 15 },
  barTotal: { color: C.onPrimary, fontWeight: '800', fontSize: 15 },

  menuLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  menuDismiss: { flex: 1 },
  menuCard: {
    position: 'absolute',
    left: S.lg,
    minWidth: 210,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    paddingVertical: S.xs,
    gap: 2,
    boxShadow: '0 8px 24px rgba(17,24,39,0.14)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderRadius: Radius.sm,
  },
  menuIcon: { fontSize: 18 },
  menuItemLabel: { color: C.text, fontSize: 14, fontWeight: '700' },
});
