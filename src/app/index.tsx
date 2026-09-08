import { router } from 'expo-router';
import { useState } from 'react';
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

import { Field, Logo, PrimaryButton } from '@/components/ui/kit';
import { C, Radius, S } from '@/constants/coffeul';

type Tab = 'login' | 'signup';

export default function AuthScreen() {
  const [tab, setTab] = useState<Tab>('login');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Logo />
            <Text style={styles.tagline}>원격 주문 시스템</Text>
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
              <Field label="이름" placeholder="홍길동" />
            )}
            <Field
              label="이메일"
              placeholder="brew@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field label="비밀번호" placeholder="••••••••" secureTextEntry />

            <PrimaryButton
              label={tab === 'login' ? '로그인' : '회원가입'}
              style={{ marginTop: S.sm }}
              onPress={() => router.replace('/menu')}
            />

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
          <Text style={styles.footer}>© 2026 Coffeul. All rights reserved.</Text>
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
  header: { alignItems: 'center', gap: S.xs, marginBottom: S.xxl },
  tagline: { color: C.textSecondary, fontSize: 14, letterSpacing: 2 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: C.surface,
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
  switchText: { color: C.textSecondary, fontSize: 13, marginTop: S.xs },
  switchLink: { color: C.primary, fontWeight: '800' },
  footer: {
    color: C.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: S.xl,
  },
});
