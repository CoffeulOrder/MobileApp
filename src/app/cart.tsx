import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, Radius, S, won } from '@/constants/coffeul';
import { useCart } from '@/hooks/use-cart';

export default function CartModal() {
  const cart = useCart();
  const close = () => router.back();

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={close} />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <Text style={styles.title}>장바구니</Text>
          <Pressable onPress={close} hitSlop={10}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {cart.lines.length === 0 ? (
          <Text style={styles.empty}>장바구니가 비어 있습니다.</Text>
        ) : (
          <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: S.md }}>
            {cart.lines.map(({ item, qty }) => (
              <View key={item.id} style={styles.line}>
                <View style={styles.lineThumb}>
                  <Text style={{ fontSize: 18, opacity: 0.5 }}>☕</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{item.name}</Text>
                  <Text style={styles.linePrice}>{won(item.price)}</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable onPress={() => cart.setQty(item.id, qty - 1)} hitSlop={6}>
                    <Text style={styles.stepBtn}>−</Text>
                  </Pressable>
                  <Text style={styles.stepQty}>{qty}</Text>
                  <Pressable onPress={() => cart.setQty(item.id, qty + 1)} hitSlop={6}>
                    <Text style={styles.stepBtn}>+</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => cart.remove(item.id)} hitSlop={8}>
                  <Text style={styles.remove}>✕</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>합계 ({cart.count}개)</Text>
          <Text style={styles.totalValue}>{won(cart.total)}</Text>
        </View>

        <Pressable
          style={[styles.checkout, cart.count === 0 && { opacity: 0.5 }]}
          disabled={cart.count === 0}
          onPress={() => {
            router.back();
            router.push('/checkout');
          }}>
          <Text style={styles.checkoutText}>결제하기</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,24,39,0.45)',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: S.lg,
    paddingTop: S.md,
    paddingBottom: S.lg,
    gap: S.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: C.text, fontSize: 18, fontWeight: '800' },
  close: { color: C.textSecondary, fontSize: 16 },
  empty: { color: C.textMuted, textAlign: 'center', paddingVertical: S.xl },
  line: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  lineThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineName: { color: C.text, fontSize: 14, fontWeight: '700' },
  linePrice: { color: C.textSecondary, fontSize: 13, marginTop: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.bg,
    borderRadius: Radius.pill,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
  },
  stepBtn: { color: C.primary, fontSize: 18, fontWeight: '800', width: 16, textAlign: 'center' },
  stepQty: { color: C.text, fontSize: 14, fontWeight: '700', minWidth: 14, textAlign: 'center' },
  remove: { color: C.textMuted, fontSize: 14, paddingLeft: S.xs },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: S.lg,
  },
  totalLabel: { color: C.textSecondary, fontSize: 14 },
  totalValue: { color: C.primary, fontSize: 18, fontWeight: '800' },
  checkout: {
    backgroundColor: C.primary,
    borderRadius: Radius.md,
    paddingVertical: S.lg,
    alignItems: 'center',
  },
  checkoutText: { color: C.onPrimary, fontSize: 16, fontWeight: '800' },
});
