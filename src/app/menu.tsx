import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, CATEGORIES, MENU, Radius, S, SERIF, won, type Category, type MenuItem } from '@/constants/coffeul';
import { useCart } from '@/hooks/use-cart';

export default function MenuScreen() {
  const [cat, setCat] = useState<Category>('에스프레소');
  const cart = useCart();
  const { width } = useWindowDimensions();
  const cardW = (width - S.lg * 2 - S.md) / 2;

  const items = useMemo(() => MENU.filter((m) => m.category === cat), [cat]);
  const qtyOf = (id: string) => cart.lines.find((l) => l.item.id === id)?.qty ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Coffeul</Text>
          <Text style={styles.hello}>안녕하세요, 고객님 ☕</Text>
        </View>
        <Pressable style={styles.logout} onPress={() => router.replace('/')}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
        style={styles.pillsWrap}
        keyboardShouldPersistTaps="handled">
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCat(c)}
            style={[styles.pill, cat === c && styles.pillActive]}>
            <Text style={[styles.pillText, cat === c && styles.pillTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: cart.count > 0 ? 110 : S.xl },
        ]}>
        {items.map((item) => (
          <Card
            key={item.id}
            item={item}
            width={cardW}
            qty={qtyOf(item.id)}
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
    </SafeAreaView>
  );
}

function Card({
  item,
  width,
  qty,
  onAdd,
}: {
  item: MenuItem;
  width: number;
  qty: number;
  onAdd: () => void;
}) {
  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.thumb}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.thumbImg} contentFit="cover" transition={200} />
        ) : (
          <Text style={styles.thumbFallback}>☕</Text>
        )}
        {qty > 0 && (
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyBadgeText}>{qty}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.desc} numberOfLines={2}>
          {item.desc}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{won(item.price)}</Text>
          <Pressable style={styles.add} onPress={onAdd} hitSlop={8}>
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
  },
  brand: { fontFamily: SERIF, fontSize: 24, fontWeight: '700', color: C.text },
  hello: { color: C.textSecondary, fontSize: 13, marginTop: 2 },
  logout: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.sm,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },
  logoutText: { color: C.textSecondary, fontSize: 13 },

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
    backgroundColor: C.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  barBadgeText: { color: C.text, fontWeight: '800', fontSize: 12 },
  barLabel: { flex: 1, textAlign: 'center', color: C.onPrimary, fontWeight: '800', fontSize: 15 },
  barTotal: { color: C.onPrimary, fontWeight: '800', fontSize: 15 },
});
