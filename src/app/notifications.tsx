import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/kit';
import { C, Radius, S } from '@/constants/coffeul';

// UI mock only.
const ITEMS = [
  { id: '1', icon: '✅', title: '주문이 수락되었어요', body: 'BS-114067 · 카페 라떼 외 1', time: '방금 전', unread: true },
  { id: '2', icon: '☕', title: '음료가 준비되었어요', body: 'BS-114031 · 아메리카노', time: '10분 전', unread: true },
  { id: '3', icon: '🎉', title: '이벤트 · 아메리카노 1+1', body: '이번 주 금요일까지', time: '어제', unread: false },
];

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="주문 알림" />
      <ScrollView contentContainerStyle={styles.content}>
        {ITEMS.map((n) => (
          <View key={n.id} style={[styles.row, n.unread && styles.unread]}>
            <Text style={styles.icon}>{n.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.body}>{n.body}</Text>
            </View>
            <Text style={styles.time}>{n.time}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: S.lg, gap: S.sm },
  row: {
    flexDirection: 'row',
    gap: S.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: S.lg,
  },
  unread: { borderColor: C.primaryDim },
  icon: { fontSize: 18 },
  title: { color: C.text, fontSize: 14, fontWeight: '700' },
  body: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  time: { color: C.textMuted, fontSize: 11 },
});
