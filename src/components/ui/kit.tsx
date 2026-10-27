/** Small shared UI primitives for the ORMO mock. */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
} from 'react-native';

import { C, Radius, S } from '@/constants/coffeul';
import { NICKNAME_MAX } from '@/constants/nickname';
import type { NicknameInput } from '@/hooks/use-nickname';

/** ORMO wordmark (cup + RMO). Source art is 591×193; `width` sets the rendered width. */
export function Logo({ width = 220 }: { width?: number }) {
  return (
    <Image
      source={require('@/assets/images/ormo-logo.png')}
      style={{ width, height: width * (193 / 591) }}
      contentFit="contain"
      accessibilityLabel="ORMO"
    />
  );
}

/**
 * 학교 이메일 입력: 아이디만 입력받고 `@도메인` 은 고정(수정 불가)으로 붙인다.
 * `@` 가 포함된 값을 붙여넣으면 아이디 부분만 남긴다.
 * 최종 이메일은 `${value}@${domain}`.
 */
export function EmailField({
  label,
  domain,
  value,
  onChangeText,
}: {
  label: string;
  domain: string;
  value: string;
  onChangeText: (id: string) => void;
}) {
  return (
    <View style={{ gap: S.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.emailBox}>
        <TextInput
          style={styles.emailInput}
          placeholder="아이디"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={value}
          onChangeText={(t) => onChangeText(t.split('@')[0].trim())}
        />
        <View style={styles.emailSuffix}>
          <Text style={styles.emailSuffixText}>@{domain}</Text>
        </View>
      </View>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  style,
  disabled,
}: {
  label: string;
  onPress?: PressableProps['onPress'];
  style?: object;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        (pressed || disabled) && { opacity: 0.7 },
        style,
      ]}>
      <Text style={styles.btnLabel}>{label}</Text>
    </Pressable>
  );
}

/** Outlined person silhouette in a gold ring — stands in for a profile photo. */
export function Avatar({ size = 40 }: { size?: number }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}>
      <View
        style={{
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size,
          backgroundColor: C.primary,
          marginTop: size * 0.16,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -size * 0.04,
          width: size * 0.56,
          height: size * 0.36,
          borderTopLeftRadius: size,
          borderTopRightRadius: size,
          backgroundColor: C.primary,
        }}
      />
    </View>
  );
}

/**
 * 닉네임 입력: 글자 수(n/8) + 🎲 랜덤 + 중복확인 + 상태 문구.
 * 상태/로직은 `useNicknameInput()` 이 갖고, 이 컴포넌트는 표시만 한다 (회원가입, 닉네임 변경 화면 공용).
 */
export function NicknameField({ label = '닉네임', nick }: { label?: string; nick: NicknameInput }) {
  const len = [...nick.value].length;
  const busy = nick.status === 'checking';
  const isError = nick.status === 'taken' || nick.status === 'invalid' || nick.status === 'error';
  const msgColor = nick.status === 'available' ? C.primary : isError ? C.danger : C.textMuted;

  return (
    <View style={{ gap: S.sm }}>
      <View style={styles.nickHead}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.nickCount}>
          {len}/{NICKNAME_MAX}
        </Text>
      </View>
      <View style={styles.nickRow}>
        <TextInput
          style={[
            styles.input,
            { flex: 1, minWidth: 0 },
            nick.status === 'available' && { borderColor: C.primary },
            isError && { borderColor: C.danger },
          ]}
          value={nick.value}
          onChangeText={nick.setValue}
          maxLength={NICKNAME_MAX}
          placeholder="닉네임 입력"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
        />
        <Pressable
          style={[styles.nickBtn, busy && { opacity: 0.5 }]}
          disabled={busy}
          onPress={() => void nick.random()}
          accessibilityLabel="랜덤 닉네임 생성">
          <Text style={styles.nickBtnText}>🎲 랜덤</Text>
        </Pressable>
        <Pressable
          style={[styles.nickBtn, styles.nickBtnPrimary, (busy || len === 0) && { opacity: 0.5 }]}
          disabled={busy || len === 0}
          onPress={() => void nick.check()}
          accessibilityLabel="닉네임 중복확인">
          <Text style={[styles.nickBtnText, { color: C.onPrimary }]}>중복확인</Text>
        </Pressable>
      </View>
      <Text style={[styles.nickMsg, { color: msgColor }]}>
        {busy ? '확인 중…' : (nick.message ?? '2~8자, 한글·영문·숫자')}
      </Text>
    </View>
  );
}

/** 데이터를 불러오는 동안 보여주는 가운데 정렬 로딩 화면. */
export function LoadingView({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={C.primary} />
      <Text style={styles.centerText}>{label}</Text>
    </View>
  );
}

/** 캐시도 없이 불러오기에 실패했을 때 보여주는 재시도 화면. */
export function RetryView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.centerText}>{message}</Text>
      <PrimaryButton label="다시 시도" onPress={onRetry} style={{ alignSelf: 'stretch', marginTop: S.md }} />
    </View>
  );
}

/** Back arrow + centered title, used by the sub screens. */
export function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.screenHeader}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Text style={styles.backGlyph}>‹</Text>
      </Pressable>
      <Text style={styles.screenTitle}>{title}</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

export function Field({
  label,
  style,
  ...rest
}: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: S.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={C.textMuted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  nickHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nickCount: { color: C.textMuted, fontSize: 12, fontWeight: '700' },
  nickRow: { flexDirection: 'row', alignItems: 'stretch', gap: S.sm },
  nickBtn: {
    justifyContent: 'center',
    paddingHorizontal: S.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  nickBtnPrimary: { backgroundColor: C.primary, borderColor: C.primary },
  nickBtnText: { color: C.textSecondary, fontSize: 13, fontWeight: '800' },
  nickMsg: { fontSize: 12, lineHeight: 17 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.md,
    paddingHorizontal: S.xl,
  },
  centerText: { color: C.textSecondary, fontSize: 14, textAlign: 'center' },
  btn: {
    backgroundColor: C.primary,
    borderRadius: Radius.md,
    paddingVertical: S.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    color: C.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  avatar: {
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.surface,
    alignItems: 'center',
    overflow: 'hidden',
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
  backGlyph: { color: C.text, fontSize: 30, lineHeight: 30, width: 24 },
  screenTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  fieldLabel: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.lg,
    color: C.text,
    fontSize: 15,
  },
  emailBox: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  emailInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: S.lg,
    paddingVertical: S.lg,
    color: C.text,
    fontSize: 15,
  },
  emailSuffix: {
    justifyContent: 'center',
    paddingHorizontal: S.lg,
    backgroundColor: C.surfaceAlt,
    borderLeftWidth: 1,
    borderLeftColor: C.border,
  },
  emailSuffixText: { color: C.textSecondary, fontSize: 14, fontWeight: '700' },
});
