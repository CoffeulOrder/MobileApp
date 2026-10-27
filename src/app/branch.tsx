import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingView, RetryView } from '@/components/ui/kit';
import { C, Radius, S, type Cafe } from '@/constants/coffeul';
import { useCart } from '@/hooks/use-cart';
import { useLogout } from '@/hooks/use-logout';
import { useMenu } from '@/hooks/use-menu';
import { useSchool } from '@/hooks/use-school';

/** 지점(= 서버의 cafe) 선택. 목록은 이 학교의 메뉴 데이터(캐시 또는 서버)에서 온다. */
export default function BranchScreen() {
  const { school } = useSchool();
  const { payload, status, cafe: current, selectCafe, retry } = useMenu();
  const cart = useCart();
  const logout = useLogout();

  if (!school) return <Redirect href="/" />;

  const choose = (c: Cafe) => {
    if (current && current.id !== c.id) cart.clear(); // 다른 지점 메뉴가 섞이지 않게
    selectCafe(c.id);
    router.replace('/menu');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topbar}>
        <Pressable style={styles.logout} onPress={logout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>

      {status === 'loading' && <LoadingView label="지점 정보를 불러오는 중…" />}
      {status === 'error' && (
        <RetryView message="지점 정보를 불러오지 못했어요. 네트워크를 확인해 주세요." onRetry={retry} />
      )}

      {payload && (
        <View style={styles.body}>
          <Text style={styles.title}>지점 선택</Text>
          <Text style={styles.subtitle}>주문하실 지점을 선택해 주세요</Text>

          <View style={styles.cards}>
            {payload.cafes.map((c) => (
              <Pressable
                key={c.id}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
                onPress={() => choose(c)}>
                <View style={styles.icon}>
                  <Text style={styles.iconGlyph}>🏛️</Text>
                </View>
                <Text style={styles.cardName}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: S.lg,
    paddingTop: S.md,
  },
  logout: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.sm,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },
  logoutText: { color: C.textSecondary, fontSize: 13 },
  body: { paddingHorizontal: S.xl, paddingTop: S.xxl, gap: S.sm },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: C.text,
    textAlign: 'center',
  },
  subtitle: { color: C.textSecondary, fontSize: 14, textAlign: 'center' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginTop: S.xl },
  card: {
    flexBasis: '47%',
    aspectRatio: 0.82,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.md,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: { fontSize: 30 },
  cardName: { color: C.text, fontSize: 16, fontWeight: '800' },
});
