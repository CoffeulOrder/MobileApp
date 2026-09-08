/** Small shared UI primitives for the Coffeul mock. */
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
} from 'react-native';

import { C, Radius, S, SERIF } from '@/constants/coffeul';

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <View style={{ alignItems: 'center', gap: S.sm }}>
      <View style={styles.badge}>
        <Text style={{ fontSize: 26 }}>☕</Text>
      </View>
      <Text style={[styles.wordmark, { fontSize: size }]}>Coffeul</Text>
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
  badge: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: SERIF,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 0.5,
  },
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
});
