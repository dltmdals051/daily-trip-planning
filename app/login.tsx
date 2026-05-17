import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useLang, t } from '@/lib/i18n';
import { theme } from '@/lib/theme';

type Step = 'email' | 'otp';

export default function LoginScreen() {
  const lang = useLang(s => s.lang);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function sendCode() {
    if (!email) return;
    setBusy(true);
    setErrMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setErrMsg(error.message);
      return;
    }
    setStep('otp');
  }

  async function verifyCode() {
    if (!code) return;
    setBusy(true);
    setErrMsg(null);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    if (error) {
      setErrMsg(error.message);
    }
    // 성공 시 _layout.tsx의 onAuthStateChange가 자동 라우팅
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.box}>
        <Text style={s.title}>{t('loginTitle', lang)}</Text>
        <Text style={s.sub}>
          {step === 'email' ? t('loginSub', lang) : (lang === 'ko' ? '메일로 받은 6자리 코드 입력' : '请输入邮箱收到的6位验证码')}
        </Text>

        {step === 'email' ? (
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
            <TouchableOpacity style={s.btn} onPress={sendCode} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t('sendMagic', lang)}</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.emailEcho}>{email}</Text>
            <TextInput
              style={[s.input, { fontSize: 24, letterSpacing: 8, textAlign: 'center' }]}
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={theme.textDim}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity style={s.btn} onPress={verifyCode} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{lang === 'ko' ? '확인' : '确认'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('email'); setCode(''); setErrMsg(null); }}>
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
  root: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', padding: 24 },
  box: { gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: theme.text },
  sub: { fontSize: 14, color: theme.textDim, marginBottom: 12 },
  emailEcho: { fontSize: 13, color: theme.accentSoft },
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
  linkText: { color: theme.textDim, fontSize: 12, textAlign: 'center', marginTop: 4 },
  err: { color: theme.bad, fontSize: 13, marginTop: 8 },
});
