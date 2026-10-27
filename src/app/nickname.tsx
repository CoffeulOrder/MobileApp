import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/errors';
import { changeNickname } from '@/api/profile-api';
import { LoadingView, NicknameField, PrimaryButton, ScreenHeader } from '@/components/ui/kit';
import { C, Radius, S } from '@/constants/coffeul';
import { useNicknameInput } from '@/hooks/use-nickname';
import { useProfile } from '@/hooks/use-profile';

/** 닉네임 변경 (프로필 메뉴 → 닉네임 변경). 가입 때와 같은 규칙/중복확인을 쓴다. */
export default function NicknameScreen() {
  const profile = useProfile();
  const current = profile.nickname;

  // 내 닉네임을 아직 못 받았으면(앱을 켜자마자 등) 받아온다
  useEffect(() => {
    if (current === null) void profile.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current === null]);

  if (current === null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScreenHeader title="닉네임 변경" />
        <LoadingView label="내 정보를 불러오는 중…" />
      </SafeAreaView>
    );
  }
  return <NicknameForm current={current} />;
}

function NicknameForm({ current }: { current: string }) {
  const profile = useProfile();
  const nick = useNicknameInput({ initial: current, current });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!nick.verified || saving) return;
    setSaving(true);
    setError(null);
    try {
      const me = await changeNickname(nick.value);
      profile.setNickname(me.nickname);
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === 'NICKNAME_TAKEN') {
        nick.markTaken(); // 확인한 뒤 다른 사람이 먼저 사용함
      } else if (e instanceof ApiError && e.code === 'NICKNAME_INVALID') {
        setError('사용할 수 없는 닉네임이에요. 다른 닉네임으로 바꿔 주세요.');
      } else {
        setError('변경하지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="닉네임 변경" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.current}>
            <Text style={styles.currentLabel}>현재 닉네임</Text>
            <Text style={styles.currentValue}>{current}</Text>
          </View>

          <NicknameField label="새 닉네임" nick={nick} />

          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={saving ? '저장 중…' : '저장'}
            style={{ opacity: nick.verified ? 1 : 0.5 }}
            disabled={!nick.verified || saving}
            onPress={save}
          />
          {!nick.verified && (
            <Text style={styles.hint}>새 닉네임의 중복확인을 완료하면 저장할 수 있어요.</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: S.lg, gap: S.xl },
  current: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: S.lg,
    gap: S.xs,
  },
  currentLabel: { color: C.textSecondary, fontSize: 12, fontWeight: '700' },
  currentValue: { color: C.text, fontSize: 20, fontWeight: '900' },
  error: { color: C.danger, fontSize: 13 },
  footer: {
    padding: S.lg,
    gap: S.sm,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  hint: { color: C.textMuted, fontSize: 12, textAlign: 'center' },
});
