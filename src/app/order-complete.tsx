import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/kit';
import { C, CANCEL_POLICY_OPTIONS, Radius, S } from '@/constants/coffeul';
import { useMenu } from '@/hooks/use-menu';

export default function OrderCompleteScreen() {
  const { cafe } = useMenu();
  const params = useLocalSearchParams<{ orderNo?: string; cancelPolicy?: string; voucher?: string }>();
  const policy = CANCEL_POLICY_OPTIONS.find((o) => o.value === params.cancelPolicy);
  // 서버가 준 주문번호를 쓰고, 없으면(목업) 임시 번호를 만든다
  const orderNo = useMemo(
    () =>
      params.orderNo ?? `${cafe?.code ?? 'OR'}-${Math.floor(100000 + Math.random() * 900000)}`,
    [params.orderNo, cafe?.code],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.check}>
          <Text style={styles.checkGlyph}>✓</Text>
        </View>
        <Text style={styles.title}>주문 완료!</Text>
        <Text style={styles.sub}>주문이 성공적으로 접수되었습니다.</Text>
        <Text style={styles.orderNo}>주문번호 {orderNo}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>예상 준비 시간</Text>
          <Text style={styles.cardTime}>10 ~ 15분</Text>
          <Text style={styles.cardNote}>매장에서 준비 중입니다 ☕</Text>
          {params.voucher && (
            <View style={styles.policyRow}>
              <Text style={styles.policyLabel}>사용한 교환권</Text>
              <Text style={styles.policyValue}>{params.voucher}</Text>
            </View>
          )}
          {policy && (
            <View style={styles.policyRow}>
              <Text style={styles.policyLabel}>취소 발생 시</Text>
              <Text style={styles.policyValue}>{policy.short}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="추가 주문하기" onPress={() => router.replace('/menu')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xl, gap: S.sm },
  check: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.lg,
  },
  checkGlyph: { color: C.onPrimary, fontSize: 40, fontWeight: '900', lineHeight: 44 },
  title: { fontSize: 26, fontWeight: '900', color: C.text },
  sub: { color: C.textSecondary, fontSize: 14 },
  orderNo: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    borderRadius: Radius.pill,
    marginTop: S.xs,
    overflow: 'hidden',
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: S.xl,
    gap: S.xs,
    marginTop: S.xxl,
  },
  cardLabel: { color: C.textSecondary, fontSize: 13, fontWeight: '700' },
  cardTime: { color: C.primary, fontSize: 26, fontWeight: '800' },
  cardNote: { color: C.textSecondary, fontSize: 13 },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: S.md,
    paddingTop: S.md,
  },
  policyLabel: { color: C.textSecondary, fontSize: 13 },
  policyValue: { color: C.text, fontSize: 13, fontWeight: '800' },
  footer: { padding: S.lg },
});
