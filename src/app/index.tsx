import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/ui/kit';
import { C, Radius, S, type School } from '@/constants/coffeul';
import { useCart } from '@/hooks/use-cart';
import { useSchool, useSchools } from '@/hooks/use-school';

/** 앱 첫 화면: 이용할 학교를 고르면 로그인 화면으로 이동. */
export default function SchoolSelectScreen() {
  const { school, setSchool } = useSchool();
  const { schools, loading } = useSchools();
  const cart = useCart();

  const choose = (s: School) => {
    // 다른 학교를 고르면 이전 학교의 장바구니는 의미가 없다 (메뉴 캐시는 use-menu 가 정리)
    if (school && school.id !== s.id) cart.clear();
    setSchool(s);
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Logo width={200} />
          <Text style={styles.orso}>ORSO Mobile Order</Text>
        </View>

        <Text style={styles.title}>학교 선택</Text>
        <Text style={styles.subtitle}>이용하실 학교를 선택해 주세요</Text>

        <View style={styles.list}>
          {loading && <Text style={styles.muted}>불러오는 중…</Text>}
          {schools.map((s) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [styles.card, pressed && { backgroundColor: C.surfaceAlt }]}
              onPress={() => choose(s)}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{s.name.slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.domain}>@{s.emailDomain}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, paddingHorizontal: S.xl, paddingTop: S.xxl, paddingBottom: S.xl },
  header: { alignItems: 'center', gap: S.sm, marginBottom: S.xxl },
  orso: { color: C.ink, fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  title: { color: C.text, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginTop: S.xs },
  list: { gap: S.md, marginTop: S.xl },
  muted: { color: C.textMuted, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: S.lg,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: C.onPrimary, fontSize: 18, fontWeight: '900' },
  name: { color: C.text, fontSize: 16, fontWeight: '800' },
  domain: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  chevron: { color: C.textMuted, fontSize: 26, lineHeight: 26 },
});
