import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang, t } from '@/lib/i18n';
import { theme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';

const EMOJI_PICKS = ['😺', '🌸', '🐰', '🦊', '🐻', '🐼', '🌻', '🍑', '🐳', '🌙', '⭐', '🍀'];

export default function SettingsScreen() {
  const { lang, setLang } = useLang();
  const { profiles, me, refresh, updateProfile, reset } = useStore();
  const [email, setEmail] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('😺');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    refresh();
  }, [refresh]);

  const myProfile = profiles.find(p => p.user_id === me);

  function openEdit() {
    setEditName(myProfile?.display_name ?? email?.split('@')[0] ?? '');
    setEditEmoji(myProfile?.emoji ?? '😺');
    setEditing(true);
  }
  async function saveProfile() {
    await updateProfile({ display_name: editName.trim(), emoji: editEmoji });
    setEditing(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['left', 'right']}>
      <View style={s.content}>
        <Text style={s.h1}>{t('tabSettings', lang)}</Text>

        <View style={s.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={s.label}>{t('profileLabel', lang)}</Text>
            <TouchableOpacity onPress={openEdit}>
              <Text style={{ color: theme.accentDeep, fontSize: 12, fontWeight: '600' }}>{t('editProfile', lang)}</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.email}>
            {myProfile ? `${myProfile.emoji}  ${myProfile.display_name}` : (lang === 'ko' ? '설정해주세요' : '请设置')}
          </Text>
        </View>

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

        <TouchableOpacity
          style={s.signOut}
          onPress={async () => {
            await supabase.auth.signOut();
            reset();
          }}
        >
          <Text style={s.signOutText}>{t('signOut', lang)}</Text>
        </TouchableOpacity>

        <Modal visible={editing} animationType="slide" transparent onRequestClose={() => setEditing(false)}>
          <View style={s.modalRoot}>
            <View style={s.modalBox}>
              <Text style={s.modalTitle}>{t('profileLabel', lang)}</Text>

              <Text style={s.modalLabel}>{t('nicknameLabel', lang)}</Text>
              <TextInput
                style={s.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor={theme.textDim}
                maxLength={20}
              />

              <Text style={s.modalLabel}>{t('emojiLabel', lang)}</Text>
              <View style={s.emojiGrid}>
                {EMOJI_PICKS.map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[s.emojiBtn, editEmoji === e && s.emojiBtnActive]}
                    onPress={() => setEditEmoji(e)}
                  >
                    <Text style={{ fontSize: 22 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.border }]} onPress={() => setEditing(false)}>
                  <Text style={{ color: theme.text }}>×</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.accentDeep, flex: 1 }]} onPress={saveProfile}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{t('save', lang)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: theme.card, padding: 20, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 14 },
  modalLabel: { fontSize: 12, color: theme.textDim, marginTop: 8, marginBottom: 6, fontWeight: '600' },
  modalInput: {
    backgroundColor: theme.cardSoft,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    color: theme.text,
    fontSize: 14,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiBtn: {
    width: 44, height: 44,
    backgroundColor: theme.cardSoft,
    borderWidth: 1, borderColor: theme.border,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiBtnActive: { backgroundColor: theme.accentSoft, borderColor: theme.accent },
  modalBtn: {
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 10, alignItems: 'center',
  },
});
