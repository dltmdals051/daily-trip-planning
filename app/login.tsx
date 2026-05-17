import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useLang, t } from '@/lib/i18n';
import { theme } from '@/lib/theme';

export default function LoginScreen() {
  const lang = useLang(s => s.lang);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function send() {
    if (!email) return;
    setStatus('sending');
    setErrMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'wuxiweekend://login-callback' },
    });
    if (error) {
      setStatus('error');
      setErrMsg(error.message);
    } else {
      setStatus('sent');
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.box}>
        <Text style={s.title}>{t('loginTitle', lang)}</Text>
        <Text style={s.sub}>{t('loginSub', lang)}</Text>

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

        <TouchableOpacity style={s.btn} onPress={send} disabled={status === 'sending'}>
          {status === 'sending' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>{t('sendMagic', lang)}</Text>
          )}
        </TouchableOpacity>

        {status === 'sent' && <Text style={s.ok}>✓ {t('magicSent', lang)}</Text>}
        {status === 'error' && <Text style={s.err}>{errMsg}</Text>}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', padding: 24 },
  box: { gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: theme.text },
  sub: { fontSize: 14, color: theme.textDim, marginBottom: 12 },
  input: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    color: theme.text,
    fontSize: 15,
  },
  btn: {
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ok: { color: theme.good, fontSize: 13, marginTop: 8 },
  err: { color: theme.bad, fontSize: 13, marginTop: 8 },
});
