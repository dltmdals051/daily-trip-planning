import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useLang, t } from '@/lib/i18n';
import { theme, shadow, gradient, radius, typography } from '@/lib/theme';

function getRedirectUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) return window.location.origin + '/';
  const baseUrl = (Constants.expoConfig as any)?.experiments?.baseUrl ?? '';
  return window.location.origin + baseUrl + '/';
}

export default function LoginScreen() {
  const lang = useLang(s => s.lang);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function sendLink() {
    if (!email) return;
    setBusy(true);
    setErrMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: getRedirectUrl(),
      },
    });
    setBusy(false);
    if (error) {
      setErrMsg(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.root}
      >
        {/* Top decorative gradient */}
        <LinearGradient
          colors={gradient.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroOrb}
          pointerEvents="none"
        />

        <View style={s.card}>
          <Text style={s.bigEmoji}>🌸</Text>
          <Text style={s.brand}>{lang === 'ko' ? '우시 주말' : '无锡周末'}</Text>
          <Text style={s.title}>{t('loginTitle', lang)}</Text>
          <Text style={s.sub}>
            {sent
              ? (lang === 'ko' ? '메일에서 "Sign in" 링크 클릭하면 자동 로그인' : '点击邮件中的 "Sign in" 链接即可登录')
              : t('loginSub', lang)}
          </Text>

          {!sent ? (
            <>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('emailPlaceholder', lang)}
                placeholderTextColor={theme.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[s.btn, !email && s.btnDisabled]}
                onPress={sendLink}
                disabled={busy || !email}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.btnText}>{t('sendMagic', lang)}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.sentBox}>
                <Text style={s.sentEmoji}>📬</Text>
                <Text style={s.sentEmail}>{email}</Text>
                <Text style={s.sentHint}>
                  {lang === 'ko' ? '메일함 (스팸함도) 확인' : '请查看邮箱 (含垃圾邮件)'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setSent(false); setErrMsg(null); }}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Text style={s.linkText}>
                  {lang === 'ko' ? '← 이메일 다시 입력' : '← 重新输入邮箱'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {errMsg && (
            <View style={s.errBox}>
              <Text style={s.err}>⚠️ {errMsg}</Text>
            </View>
          )}
        </View>

        <Text style={s.footer}>
          {lang === 'ko' ? '둘만 들어오는 사적인 공간 ✨' : '只属于我们两人的小空间 ✨'}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  heroOrb: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 999,
    opacity: 0.7,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: radius.xl,
    padding: 28,
    gap: 12,
    ...shadow.lg,
  },
  bigEmoji: { fontSize: 56, textAlign: 'center', marginBottom: 4 },
  brand: { ...typography.section, color: theme.accentDeep, textAlign: 'center', fontSize: 11 },
  title: { ...typography.h1, color: theme.text, textAlign: 'center', marginTop: 2 },
  sub: { fontSize: 13, color: theme.textDim, marginBottom: 12, textAlign: 'center', lineHeight: 19 },
  input: {
    backgroundColor: theme.cardSoft,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    color: theme.text,
    fontSize: 15,
  },
  btn: {
    backgroundColor: theme.accentDeep,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: 'center',
    ...shadow.glow,
  },
  btnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
  linkText: { color: theme.textDim, fontSize: 12, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  sentBox: {
    backgroundColor: theme.cardSoft,
    borderColor: theme.borderSoft,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  sentEmoji: { fontSize: 42 },
  sentEmail: { fontSize: 15, fontWeight: '800', color: theme.accentDeep },
  sentHint: { fontSize: 12, color: theme.textDim, textAlign: 'center' },
  errBox: {
    backgroundColor: '#fff0f0',
    borderColor: theme.bad,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
    marginTop: 4,
  },
  err: { color: theme.badInk, fontSize: 12, textAlign: 'center', fontWeight: '600' },
  footer: {
    ...typography.micro,
    color: theme.textDim,
    textAlign: 'center',
    marginTop: 24,
  },
});
