import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
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

import { ApiError } from '@/api/errors';
import { postOrder, quoteOrder } from '@/api/menu-api';
import type { Quote } from '@/api/voucher-schema';
import {
  C,
  CANCEL_POLICY_OPTIONS,
  DEFAULT_CANCEL_POLICY,
  MAX_VOUCHERS_PER_ORDER,
  Radius,
  S,
  formatDate,
  won,
  type CancelPolicy,
  type Voucher,
} from '@/constants/coffeul';
import { useCart } from '@/hooks/use-cart';
import { useMenu } from '@/hooks/use-menu';
import { useSchool } from '@/hooks/use-school';
import { useVouchers } from '@/hooks/use-vouchers';

const PAY_METHODS = [
  { id: 'card', label: '신용카드', dot: C.textSecondary },
  { id: 'kakao', label: '카카오페이', dot: '#F2C94C' },
  { id: 'naver', label: '네이버페이', dot: '#27AE60' },
] as const;

type Notice = { text: string; removeSoldOut?: boolean };

export default function CheckoutScreen() {
  const cart = useCart();
  const { school } = useSchool();
  const { payload, cafe, soldOut, sync, markSoldOut, refreshSoldOut } = useMenu();
  const [method, setMethod] = useState<string>('card');
  const [cancelPolicy, setCancelPolicy] = useState<CancelPolicy>(DEFAULT_CANCEL_POLICY);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const vouchers = useVouchers();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const quoteSeq = useRef(0);
  const selectedIds = cart.voucherIds;

  // 이 카페에서 품절로 확인된 메뉴가 장바구니에 있으면 결제할 수 없다
  const soldOutIds = new Set(soldOut[cafe?.id ?? ''] ?? []);
  const soldOutLines = cart.lines.filter((l) => soldOutIds.has(l.item.id));
  // 교환권을 골랐다면, 서버가 계산한 금액(quote)을 받은 뒤에만 결제할 수 있다
  const quoteOk = selectedIds.length === 0 || (quoteStatus === 'ready' && !!quote);
  const canPay =
    cart.count > 0 &&
    soldOutLines.length === 0 &&
    !submitting &&
    quoteStatus !== 'loading' &&
    quoteOk &&
    !!payload &&
    !!cafe &&
    !!school;

  // 금액 표시: 할인/최종 금액은 항상 서버(quote) 값. 교환권을 안 골랐으면 할인 없음.
  const subtotal = quote?.subtotal ?? cart.total;
  const discounts = selectedIds.length > 0 ? (quote?.discounts ?? []) : [];
  const total = selectedIds.length === 0 ? subtotal : (quote?.total ?? cart.total);
  const free = selectedIds.length > 0 && quoteStatus === 'ready' && !!quote && quote.total === 0;

  const myVouchers = vouchers.vouchers.filter((v) => v.status === 'AVAILABLE');
  const stateOf = (id: string) => quote?.vouchers.find((v) => v.id === id);
  const cafeVouchers = myVouchers
    .filter((v) => v.cafeId === cafe?.id)
    .sort((a, b) => Number(!!stateOf(b.id)?.applicable) - Number(!!stateOf(a.id)?.applicable));
  const otherCafeCount = myVouchers.length - cafeVouchers.length;

  const toggleVoucher = (v: Voucher) => {
    if (selectedIds.includes(v.id)) {
      cart.setVoucherIds(selectedIds.filter((id) => id !== v.id));
    } else if (stateOf(v.id)?.applicable !== false) {
      cart.setVoucherIds([...selectedIds, v.id].slice(-MAX_VOUCHERS_PER_ORDER));
    }
  };

  /** 409 MENU_CHANGED: 메뉴를 강제 갱신하고 장바구니를 최신 메뉴(가격/품목)에 맞춘 뒤 안내 */
  const handleMenuChanged = async () => {
    if (!cafe) return;
    const fresh = await sync('order-conflict', { force: true });
    const menus = fresh?.cafes.find((c) => c.id === cafe.id)?.menus;
    if (!menus) {
      setNotice({ text: '메뉴가 변경되었습니다. 잠시 후 다시 시도해 주세요.' });
      return;
    }
    const { removed, priceChanged } = cart.reconcile(menus);
    const parts = ['메뉴가 변경되었습니다. 장바구니를 확인해 주세요.'];
    if (priceChanged.length) parts.push(`가격 변경: ${priceChanged.join(', ')}`);
    if (removed.length) parts.push(`판매 종료되어 제외됨: ${removed.join(', ')}`);
    setNotice({ text: parts.join('\n') });
    void refreshSoldOut(cafe.id);
  };

  /** 409 MENU_SOLD_OUT: 해당 메뉴를 품절로 표시하고 안내 */
  const handleSoldOut = (e: ApiError) => {
    if (!cafe) return;
    const body = e.body as { menuIds?: unknown } | undefined;
    const ids = Array.isArray(body?.menuIds) ? body.menuIds.filter((v): v is string => typeof v === 'string') : [];
    markSoldOut(cafe.id, ids);
    const names = cart.lines.filter((l) => ids.includes(l.item.id)).map((l) => l.item.name);
    setNotice({
      text: `품절된 메뉴가 있어요${names.length ? `: ${names.join(', ')}` : ''}`,
      removeSoldOut: true,
    });
  };

  /** 주문 미리보기: 금액 + "내 교환권이 지금 이 장바구니에 적용 가능한지" 를 서버에서 받는다 */
  const loadQuote = async () => {
    if (!school || !cafe || !payload || cart.lines.length === 0) {
      setQuote(null);
      setQuoteStatus('ready');
      return;
    }
    const seq = ++quoteSeq.current;
    setQuoteStatus('loading');
    try {
      const q = await quoteOrder({
        schoolId: school.id,
        cafeId: cafe.id,
        menuVersion: payload.version,
        items: cart.lines.map((l) => ({ menuId: l.item.id, qty: l.qty })),
        vouchers: selectedIds.map((id) => ({ id })),
      });
      if (seq !== quoteSeq.current) return; // 더 최근 요청이 있음
      setQuote(q);
      setQuoteStatus('ready');
      // 서버가 "적용 불가" 라고 한 교환권은 선택에서 뺀다 (품절/만료/다른 지점 등)
      const dropped = selectedIds.filter((id) => !q.vouchers.find((v) => v.id === id)?.applicable);
      if (dropped.length > 0) {
        cart.setVoucherIds(selectedIds.filter((id) => !dropped.includes(id)));
        const reason = q.vouchers.find((v) => v.id === dropped[0])?.reason;
        setNotice({ text: `교환권을 사용할 수 없어요${reason ? `: ${reason}` : ''}` });
      }
    } catch (e) {
      if (seq !== quoteSeq.current) return;
      if (e instanceof ApiError && e.status === 409 && e.code === 'MENU_CHANGED') {
        await handleMenuChanged(); // 메뉴/가격이 바뀜 → 갱신하면 아래 effect 가 다시 계산
        if (seq === quoteSeq.current) setQuoteStatus('error');
        return;
      }
      setQuoteStatus('error');
    }
  };

  // 장바구니/교환권 선택/메뉴 버전/품절 정보가 바뀔 때마다 다시 계산
  const quoteKey = JSON.stringify([
    school?.id,
    cafe?.id,
    payload?.version,
    cart.lines.map((l) => [l.item.id, l.qty]),
    selectedIds,
    soldOut[cafe?.id ?? ''] ?? [],
  ]);
  useEffect(() => {
    void loadQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  // 내 교환권 목록은 결제 화면에 들어올 때 새로 받는다
  useEffect(() => {
    void vouchers.refresh();
  }, [vouchers.refresh]);

  const placeOrder = async () => {
    if (!canPay || !payload || !cafe || !school) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await postOrder({
        schoolId: school.id,
        cafeId: cafe.id,
        menuVersion: payload.version, // 서버가 이 버전과 최신 버전을 비교해 가격 변경을 검증한다
        items: cart.lines.map((l) => ({ menuId: l.item.id, qty: l.qty })),
        paymentMethod: free ? 'NONE' : method, // 0원이면 PG 를 거치지 않는다
        cancelPolicy,
        vouchers: selectedIds.map((id) => ({ id })),
      });
      const usedTitles = myVouchers
        .filter((v) => selectedIds.includes(v.id))
        .map((v) => v.title)
        .join(' · ');
      cart.clear();
      router.replace({
        pathname: '/order-complete',
        params: {
          cancelPolicy,
          ...(res.orderNo ? { orderNo: res.orderNo } : {}),
          ...(usedTitles ? { voucher: usedTitles } : {}),
        },
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === 'MENU_CHANGED') {
        await handleMenuChanged();
      } else if (e instanceof ApiError && e.status === 409 && e.code === 'MENU_SOLD_OUT') {
        handleSoldOut(e);
      } else if (e instanceof ApiError && e.status === 409 && e.code === 'VOUCHER_UNAVAILABLE') {
        // 앱이 모르는 사이 교환권이 만료/사용됨 등 → 선택을 풀고 목록/금액을 새로 받는다
        const reason = (e.body as { reason?: unknown } | undefined)?.reason;
        cart.setVoucherIds([]);
        void vouchers.refresh();
        setNotice({
          text: `교환권을 사용할 수 없어요${typeof reason === 'string' ? `: ${reason}` : ''}`,
        });
      } else {
        setNotice({ text: '주문에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const removeSoldOutLines = () => {
    soldOutLines.forEach((l) => cart.remove(l.item.id));
    setNotice(null);
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
          {notice && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{notice.text}</Text>
              {notice.removeSoldOut && soldOutLines.length > 0 && (
                <Pressable style={styles.noticeBtn} onPress={removeSoldOutLines}>
                  <Text style={styles.noticeBtnText}>품절 메뉴 빼기</Text>
                </Pressable>
              )}
            </View>
          )}

          <Section title="주문 내역">
            <View style={styles.card}>
              {cart.lines.map(({ item, qty }) => (
                <View key={item.id} style={styles.orderRow}>
                  <Text style={styles.qtyTag}>×{qty}</Text>
                  <Text style={styles.orderName}>{item.name}</Text>
                  {soldOutIds.has(item.id) && <Text style={styles.soldOutTag}>품절</Text>}
                  <Text style={styles.orderPrice}>{won(item.price * qty)}</Text>
                </View>
              ))}
              {cart.lines.length === 0 && (
                <Text style={styles.muted}>담긴 메뉴가 없습니다.</Text>
              )}
            </View>
          </Section>

          {(myVouchers.length > 0 || quoteStatus === 'error') && (
            <Section title="교환권">
              {quoteStatus === 'error' && (
                <View style={styles.inlineError}>
                  <Text style={styles.inlineErrorText}>금액/교환권 정보를 불러오지 못했어요.</Text>
                  <Pressable onPress={() => void loadQuote()}>
                    <Text style={styles.inlineErrorLink}>다시 시도</Text>
                  </Pressable>
                </View>
              )}
              {cafeVouchers.length === 0 && myVouchers.length > 0 && (
                <Text style={styles.sectionHint}>이 지점에서 쓸 수 있는 교환권이 없어요.</Text>
              )}
              <View style={{ gap: S.sm }}>
                {cafeVouchers.map((v) => {
                  const st = stateOf(v.id);
                  const selected = selectedIds.includes(v.id);
                  const disabled = st?.applicable === false;
                  return (
                    <Pressable
                      key={v.id}
                      disabled={disabled}
                      onPress={() => toggleVoucher(v)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected, disabled }}
                      style={[
                        styles.policy,
                        selected && styles.policyActive,
                        disabled && { opacity: 0.55 },
                      ]}>
                      <View style={[styles.radio, selected && styles.radioActive]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.policyTitle}>
                          {v.cafeName} · {v.title}
                        </Text>
                        <Text style={styles.policyDesc}>
                          {disabled && st?.reason
                            ? st.reason
                            : `${formatDate(v.expiresAt)}까지 사용 가능`}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {otherCafeCount > 0 && (
                <Text style={styles.sectionHint}>
                  다른 지점 교환권 {otherCafeCount}장은 해당 지점에서 사용할 수 있어요.
                </Text>
              )}
            </Section>
          )}

          <View style={styles.card}>
            <Row label={`상품 금액 (${cart.count}개)`} value={won(subtotal)} muted />
            {discounts.map((d) => (
              <Row key={d.voucherId} label={`${d.label} 사용`} value={`−${won(d.amount)}`} accent />
            ))}
            <Row label="배달비" value="무료" muted />
            <View style={styles.divider} />
            <Row label="최종 결제 금액" value={won(total)} strong />
          </View>

          {!free && (
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
          )}

          {!free && method === 'card' && (
            <Section title="카드 정보">
              <TextInput
                style={styles.input}
                placeholder="카드 번호"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
              />
              <View style={{ flexDirection: 'row', gap: S.md }}>
                <TextInput
                  style={[styles.input, { flex: 1, minWidth: 0 }]}
                  placeholder="유효기간 MM/YY"
                  placeholderTextColor={C.textMuted}
                />
                <TextInput
                  style={[styles.input, { flex: 1, minWidth: 0 }]}
                  placeholder="CVC"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  secureTextEntry
                />
              </View>
            </Section>
          )}

          <Section title="주문 취소 시 처리">
            <Text style={styles.sectionHint}>
              가게 사정(재료 소진 등)으로 일부 메뉴를 만들 수 없을 때의 처리 방식을 골라 주세요.
            </Text>
            <View style={{ gap: S.sm }}>
              {CANCEL_POLICY_OPTIONS.map((opt) => {
                const selected = cancelPolicy === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setCancelPolicy(opt.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.policy, selected && styles.policyActive]}>
                    <View style={[styles.radio, selected && styles.radioActive]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.policyTitle}>{opt.title}</Text>
                      <Text style={styles.policyDesc}>{opt.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.payBtn, !canPay && { opacity: 0.5 }]}
            disabled={!canPay}
            onPress={placeOrder}>
            <Text style={styles.payText}>
              {submitting
                ? '주문 처리 중…'
                : quoteStatus === 'loading'
                  ? '금액 계산 중…'
                  : free
                    ? '교환권으로 주문하기'
                    : `${won(total)} 결제하기`}
            </Text>
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
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowStrong]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          muted && { color: C.textSecondary },
          accent && { color: C.primary },
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
  soldOutTag: {
    color: C.onInk,
    backgroundColor: C.ink,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: S.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  notice: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: Radius.md,
    padding: S.lg,
    gap: S.md,
  },
  noticeText: { color: C.text, fontSize: 14, fontWeight: '700', lineHeight: 21 },
  noticeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: C.ink,
    borderRadius: Radius.sm,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },
  noticeBtnText: { color: C.onInk, fontSize: 13, fontWeight: '800' },
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
  sectionHint: { color: C.textSecondary, fontSize: 12, lineHeight: 18, marginTop: -S.xs },
  policy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: S.lg,
  },
  policyActive: { borderColor: C.primary, backgroundColor: C.surfaceAlt },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioActive: { borderColor: C.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  policyTitle: { color: C.text, fontSize: 14, fontWeight: '800' },
  policyDesc: { color: C.textSecondary, fontSize: 12, lineHeight: 18 },

  inlineError: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: S.md,
  },
  inlineErrorText: { color: C.textSecondary, fontSize: 13 },
  inlineErrorLink: { color: C.primary, fontSize: 13, fontWeight: '800' },

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
