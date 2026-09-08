import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, Radius, S, won } from '@/constants/coffeul';
import { useCart } from '@/hooks/use-cart';

const PAY_METHODS = [
  { id: 'card', label: '신용카드', dot: C.textSecondary },
  { id: 'kakao', label: '카카오페이', dot: '#F2C94C' },
  { id: 'naver', label: '네이버페이', dot: '#27AE60' },
] as const;

export default function CheckoutScreen() {
  const cart = useCart();
  const [method, setMethod] = useState<string>('card');
  const [request, setRequest] = useState('');

  const placeOrder = () => {
    Alert.alert('주문 완료', '주문이 접수되었습니다. ☕', [
      {
        text: '확인',
        onPress: () => {
          cart.clear();
          router.replace('/menu');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>결제</Text>
        <View style={{ width: 20 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Section title="주문 내역">
            <View style={styles.card}>
              {cart.lines.map(({ item, qty }) => (
                <View key={item.id} style={styles.orderRow}>
                  <Text style={styles.qtyTag}>×{qty}</Text>
                  <Text style={styles.orderName}>{item.name}</Text>
                  <Text style={styles.orderPrice}>{won(item.price * qty)}</Text>
                </View>
              ))}
              {cart.lines.length === 0 && (
                <Text style={styles.muted}>담긴 메뉴가 없습니다.</Text>
              )}
            </View>
          </Section>

          <View style={styles.card}>
            <Row label={`상품 금액 (${cart.count}개)`} value={won(cart.total)} muted />
            <Row label="배달비" value="무료" muted />
            <View style={styles.divider} />
            <Row label="최종 결제 금액" value={won(cart.total)} strong />
          </View>

          <Section title="결제 수단">
            <View style={styles.methods}>
              {PAY_METHODS.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setMethod(m.id)}
                  style={[styles.method, method === m.id && styles.methodActive]}>
                  <View style={[styles.dot, { backgroundColor: m.dot }]} />
                  <Text style={styles.methodText}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
          </Section>

          {method === 'card' && (
            <Section title="카드 정보">
              <TextInput
                style={styles.input}
                placeholder="카드 번호"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
              />
              <View style={{ flexDirection: 'row', gap: S.md }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="유효기간 MM/YY"
                  placeholderTextColor={C.textMuted}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="CVC"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  secureTextEntry
                />
              </View>
            </Section>
          )}

          <Section title="요청 사항">
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="예) 빨대 빼주세요, 아이스로 주세요..."
              placeholderTextColor={C.textMuted}
              multiline
              value={request}
              onChangeText={setRequest}
            />
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.payBtn, cart.count === 0 && { opacity: 0.5 }]}
            disabled={cart.count === 0}
            onPress={placeOrder}>
            <Text style={styles.payText}>{won(cart.total)} 결제하기</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: S.md }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowStrong]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          muted && { color: C.textSecondary },
          strong && styles.rowStrong,
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
  back: { color: C.text, fontSize: 30, lineHeight: 30 },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  content: { padding: S.lg, gap: S.xl, paddingBottom: S.xxl },

  sectionTitle: { color: C.textSecondary, fontSize: 13, fontWeight: '800' },
  card: {
    backgroundColor: C.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: S.lg,
    gap: S.md,
  },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  qtyTag: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: S.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  orderName: { flex: 1, color: C.text, fontSize: 14, fontWeight: '700' },
  orderPrice: { color: C.primary, fontSize: 14, fontWeight: '800' },
  muted: { color: C.textMuted, fontSize: 13 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: C.textSecondary, fontSize: 14 },
  rowValue: { color: C.text, fontSize: 14, fontWeight: '700' },
  rowStrong: { color: C.text, fontSize: 16, fontWeight: '800' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: S.xs },

  methods: { flexDirection: 'row', gap: S.md },
  method: {
    flex: 1,
    alignItems: 'center',
    gap: S.sm,
    paddingVertical: S.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  methodActive: { borderColor: C.primary, backgroundColor: C.surfaceAlt },
  dot: { width: 14, height: 14, borderRadius: 7 },
  methodText: { color: C.text, fontSize: 12, fontWeight: '700' },

  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.lg,
    color: C.text,
    fontSize: 14,
  },
  textarea: { height: 96, textAlignVertical: 'top' },

  footer: {
    padding: S.lg,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  payBtn: {
    backgroundColor: C.primary,
    borderRadius: Radius.md,
    paddingVertical: S.lg,
    alignItems: 'center',
  },
  payText: { color: C.onPrimary, fontSize: 16, fontWeight: '800' },
});
