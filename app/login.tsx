import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useLang, t } from '@/lib/i18n';
import { theme, shadow } from '@/lib/theme';

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
    <SafeAreaView style={s.root}>
      <View style={s.box}>
        <Text style={s.emoji}>🌸</Text>
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
            <TouchableOpacity style={s.btn} onPress={sendLink} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t('sendMagic', lang)}</Text>}
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
            <TouchableOpacity onPress={() => { setSent(false); setErrMsg(null); }}>
              <Text style={s.linkText}>{lang === 'ko' ? '← 이메일 다시 입력' : '← 重新输入邮箱'}</Text>
            </TouchableOpacity>
          </>
        )}

        {errMsg && <Text style={s.err}>{errMsg}</Text>}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', padding: 32 },
  box: { gap: 12 },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: theme.text, textAlign: 'center' },
  sub: { fontSize: 14, color: theme.textDim, marginBottom: 16, textAlign: 'center' },
  input: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: theme.text,
    fontSize: 15,
    ...shadow.sm,
  },
  btn: {
    backgroundColor: theme.accentDeep,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...shadow.glow,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkText: { color: theme.textDim, fontSize: 12, textAlign: 'center', marginTop: 4 },
  sentBox: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    ...shadow.sm,
  },
  sentEmoji: { fontSize: 40 },
  sentEmail: { fontSize: 15, fontWeight: '700', color: theme.accentDeep },
  sentHint: { fontSize: 13, color: theme.textDim },
  err: { color: theme.badInk, fontSize: 13, marginTop: 8, textAlign: 'center' },
});
