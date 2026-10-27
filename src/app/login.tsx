import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/errors';
import { signUp } from '@/api/profile-api';
import { EmailField, Field, Logo, NicknameField, PrimaryButton } from '@/components/ui/kit';
import { C, Radius, S } from '@/constants/coffeul';
import { useNicknameInput } from '@/hooks/use-nickname';
import { useProfile } from '@/hooks/use-profile';
import { useSchool } from '@/hooks/use-school';

type Tab = 'login' | 'signup';

export default function LoginScreen() {
  const { school } = useSchool();
  const profile = useProfile();
  const [tab, setTab] = useState<Tab>('login');
  const [emailId, setEmailId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const nick = useNicknameInput();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefilled = useRef(false);

  // 가입 탭에 처음 들어오면 랜덤 닉네임을 자동으로 채워 준다 (직접 바꾸거나 다시 만들 수 있음)
  useEffect(() => {
    if (tab === 'signup' && !prefilled.current) {
      prefilled.current = true;
      void nick.random();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // 학교를 고르지 않고 들어온 경우(웹 새로고침 등) 첫 화면으로 돌려보냄
  if (!school) return <Redirect href="/" />;

  const login = () => {
    void profile.refresh(); // 내 닉네임 등 프로필은 백그라운드로 받는다
    router.replace('/branch');
  };

  const submitSignup = async () => {
    if (!nick.verified || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const me = await signUp({
        schoolId: school.id,
        email: `${emailId}@${school.emailDomain}`,
        name,
        password,
        nickname: nick.value,
      });
      profile.setNickname(me.nickname);
      router.replace('/branch');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === 'NICKNAME_TAKEN') {
        nick.markTaken(); // 확인한 뒤 다른 사람이 먼저 사용함 → 다시 고르게 한다
      } else if (e instanceof ApiError && e.code === 'NICKNAME_INVALID') {
        setError('사용할 수 없는 닉네임이에요. 다른 닉네임으로 바꿔 주세요.');
      } else {
        setError('가입에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Logo width={180} />
            <Text style={styles.tagline}>대학의 모든 카페를, 한 번에</Text>
            <Pressable style={styles.schoolChip} onPress={() => router.replace('/')}>
              <Text style={styles.schoolChipText}>
                {school.name} <Text style={styles.schoolChipLink}>변경</Text>
              </Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {(['login', 'signup'] as Tab[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tab, tab === t && styles.tabActive]}>
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'login' ? '로그인' : '회원가입'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            {tab === 'signup' && (
              <>
                <Field label="이름" placeholder="홍길동" value={name} onChangeText={setName} />
                <NicknameField nick={nick} />
              </>
            )}
            <EmailField
              label="학교 이메일"
              domain={school.emailDomain}
              value={emailId}
              onChangeText={setEmailId}
            />
            <Field
              label="비밀번호"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {tab === 'login' ? (
              <PrimaryButton label="로그인" style={{ marginTop: S.sm }} onPress={login} />
            ) : (
              <>
                <PrimaryButton
                  label={submitting ? '가입 중…' : '회원가입'}
                  style={[{ marginTop: S.sm }, !nick.verified && { opacity: 0.5 }]}
                  disabled={!nick.verified || submitting}
                  onPress={submitSignup}
                />
                {!nick.verified && (
                  <Text style={styles.hint}>닉네임 중복확인을 완료하면 가입할 수 있어요.</Text>
                )}
                {error && <Text style={styles.error}>{error}</Text>}
              </>
            )}

            {tab === 'login' && (
              <Pressable
                onPress={() => setTab('signup')}
                style={{ alignSelf: 'center' }}>
                <Text style={styles.switchText}>
                  계정이 없으신가요? <Text style={styles.switchLink}>회원가입</Text>
                </Text>
              </Pressable>
            )}
          </View>

          <View style={{ flex: 1 }} />
          <Text style={styles.footer}>© 2026 ORSO. All rights reserved.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: {
    flexGrow: 1,
    paddingHorizontal: S.xl,
    paddingTop: S.xxl,
    paddingBottom: S.xl,
  },
  header: { alignItems: 'center', gap: S.md, marginBottom: S.xl },
  tagline: { color: C.textSecondary, fontSize: 14, letterSpacing: 0.5 },
  schoolChip: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
  },
  schoolChipText: { color: C.textSecondary, fontSize: 12, fontWeight: '700' },
  schoolChipLink: { color: C.primary, fontWeight: '800', textDecorationLine: 'underline' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: S.xs,
    gap: S.xs,
    marginBottom: S.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: S.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: C.primary },
  tabText: { color: C.textSecondary, fontWeight: '700', fontSize: 15 },
  tabTextActive: { color: C.onPrimary },
  form: { gap: S.lg },
  hint: { color: C.textMuted, fontSize: 12, textAlign: 'center' },
  error: { color: C.danger, fontSize: 13, textAlign: 'center' },
  switchText: { color: C.textSecondary, fontSize: 13, marginTop: S.xs },
  switchLink: { color: C.primary, fontWeight: '800' },
  footer: {
    color: C.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: S.xl,
  },
});
