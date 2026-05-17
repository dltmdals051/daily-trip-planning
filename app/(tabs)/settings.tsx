import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang, t } from '@/lib/i18n';
import { theme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const { lang, setLang } = useLang();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['left', 'right']}>
      <View style={s.content}>
        <Text style={s.h1}>{t('tabSettings', lang)}</Text>

        <View style={s.section}>
          <Text style={s.label}>{lang === 'ko' ? '계정' : '账号'}</Text>
          <Text style={s.email}>{email ?? '-'}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.label}>{lang === 'ko' ? '언어' : '语言'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[s.langBtn, lang === 'ko' && s.langBtnActive]}
              onPress={() => setLang('ko')}
            >
              <Text style={[s.langText, lang === 'ko' && { color: '#fff' }]}>{t('langKo', lang)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.langBtn, lang === 'zh' && s.langBtnActive]}
              onPress={() => setLang('zh')}
            >
              <Text style={[s.langText, lang === 'zh' && { color: '#fff' }]}>{t('langZh', lang)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={s.signOut} onPress={() => supabase.auth.signOut()}>
          <Text style={s.signOutText}>{t('signOut', lang)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, gap: 20 },
  h1: { fontSize: 24, fontWeight: '700', color: theme.text },
  section: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  label: { fontSize: 12, color: theme.textDim },
  email: { fontSize: 14, color: theme.text },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  langBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  langText: { color: theme.textDim, fontSize: 14 },
  signOut: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.bad,
    alignItems: 'center',
    backgroundColor: theme.cardSoft,
  },
  signOutText: { color: theme.badInk, fontSize: 14, fontWeight: '600' },
});
