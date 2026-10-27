import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/kit';
import { C, Radius, S } from '@/constants/coffeul';

// UI mock only — no real cards are stored.
const CARDS = [
  { id: '1', name: '신한카드', last4: '4821', primary: true },
  { id: '2', name: '카카오페이', last4: null, primary: false },
];

export default function PaymentMethodsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="결제수단 관리" />
      <ScrollView contentContainerStyle={styles.content}>
        {CARDS.map((c) => (
          <View key={c.id} style={styles.row}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{c.name}</Text>
              {c.last4 && <Text style={styles.meta}>•••• {c.last4}</Text>}
            </View>
            {c.primary && <Text style={styles.badge}>기본</Text>}
          </View>
        ))}

        <Pressable style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.addText}>+ 결제수단 추가</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: S.lg, gap: S.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: S.lg,
  },
  dot: { width: 32, height: 20, borderRadius: 4, backgroundColor: C.surfaceAlt },
  name: { color: C.text, fontSize: 14, fontWeight: '700' },
  meta: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  badge: {
    color: C.onPrimary,
    backgroundColor: C.primary,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: S.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  addBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: S.lg,
    alignItems: 'center',
  },
  addText: { color: C.textSecondary, fontSize: 14, fontWeight: '700' },
});
