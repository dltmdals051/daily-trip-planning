import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLang, t } from '@/lib/i18n';
import { theme, shadow, gradient, radius, typography } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';

const EMOJI_PICKS = ['😺', '🌸', '🐰', '🦊', '🐻', '🐼', '🌻', '🍑', '🐳', '🌙', '⭐', '🍀'];
const APP_VERSION = '0.2.0';

function confirm(title: string, message: string, onConfirm: () => void, confirmLabel = 'OK', cancelLabel = 'Cancel') {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

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
  const partner = profiles.find(p => p.user_id !== me);

  function openEdit() {
    setEditName(myProfile?.display_name ?? email?.split('@')[0] ?? '');
    setEditEmoji(myProfile?.emoji ?? '😺');
    setEditing(true);
  }
  async function saveProfile() {
    await updateProfile({ display_name: editName.trim(), emoji: editEmoji });
    setEditing(false);
  }

  function handleSignOut() {
    confirm(
      lang === 'ko' ? '로그아웃' : '退出登录',
      lang === 'ko' ? '정말 로그아웃할까요?' : '确定要退出登录吗?',
      async () => {
        await supabase.auth.signOut();
        reset();
      },
      lang === 'ko' ? '로그아웃' : '退出',
      lang === 'ko' ? '취소' : '取消',
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Profile hero */}
        <LinearGradient
          colors={gradient.warm}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.profileRow}>
            <View style={s.avatar}>
              <Text style={s.avatarEmoji}>{myProfile?.emoji ?? '😺'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.profileName}>{myProfile?.display_name ?? (lang === 'ko' ? '닉네임 미설정' : '未设置昵称')}</Text>
              <Text style={s.profileEmail}>{email ?? '-'}</Text>
            </View>
            <TouchableOpacity onPress={openEdit} style={s.editBtn}>
              <Text style={s.editBtnText}>{t('editProfile', lang)}</Text>
            </TouchableOpacity>
          </View>
          {partner && (
            <View style={s.partnerRow}>
              <Text style={s.partnerLabel}>
                {lang === 'ko' ? '함께 쓰는 사람' : '一起使用'}
              </Text>
              <View style={s.partnerChip}>
                <Text style={s.partnerEmoji}>{partner.emoji}</Text>
                <Text style={s.partnerName}>{partner.display_name}</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Language */}
        <Section title={lang === 'ko' ? '언어' : '语言'}>
          <View style={s.langRow}>
            <TouchableOpacity
              style={[s.langBtn, lang === 'ko' && s.langBtnActive]}
              onPress={() => setLang('ko')}
            >
              <Text style={[s.langText, lang === 'ko' && { color: '#fff', fontWeight: '700' }]}>
                🇰🇷 {t('langKo', lang)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.langBtn, lang === 'zh' && s.langBtnActive]}
              onPress={() => setLang('zh')}
            >
              <Text style={[s.langText, lang === 'zh' && { color: '#fff', fontWeight: '700' }]}>
                🇨🇳 {t('langZh', lang)}
              </Text>
            </TouchableOpacity>
          </View>
        </Section>

        {/* About */}
        <Section title={lang === 'ko' ? '정보' : '关于'}>
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>{lang === 'ko' ? '버전' : '版本'}</Text>
            <Text style={s.aboutValue}>{APP_VERSION}</Text>
          </View>
          <View style={[s.aboutRow, s.aboutRowBorder]}>
            <Text style={s.aboutLabel}>{lang === 'ko' ? '데이터 갱신' : '数据更新'}</Text>
            <Text style={s.aboutValue}>{lang === 'ko' ? '매일 새벽 1시' : '每天凌晨 1 点'}</Text>
          </View>
        </Section>

        <TouchableOpacity style={s.signOut} onPress={handleSignOut}>
          <Text style={s.signOutText}>{t('signOut', lang)}</Text>
        </TouchableOpacity>

        <Modal visible={editing} animationType="slide" transparent onRequestClose={() => setEditing(false)}>
          <View style={s.modalRoot}>
            <View style={s.modalBox}>
              <View style={s.modalHandle} />
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
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: theme.cardSoft, borderWidth: 1, borderColor: theme.border }]}
                  onPress={() => setEditing(false)}
                >
                  <Text style={{ color: theme.text, fontWeight: '600' }}>
                    {lang === 'ko' ? '취소' : '取消'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: theme.accentDeep, flex: 1 }]}
                  onPress={saveProfile}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{t('save', lang)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 4 },

  hero: {
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 22,
    gap: 18,
    ...shadow.md,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  avatarEmoji: { fontSize: 32 },
  profileName: { fontSize: 18, fontWeight: '800', color: theme.accentInk, letterSpacing: -0.3 },
  profileEmail: { fontSize: 12, color: theme.accentInk, opacity: 0.7, marginTop: 2 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 999,
  },
  editBtnText: { color: theme.accentDeep, fontSize: 11, fontWeight: '700' },

  partnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(122, 42, 32, 0.12)',
  },
  partnerLabel: { ...typography.section, color: theme.accentInk, opacity: 0.7, fontSize: 10 },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 999,
  },
  partnerEmoji: { fontSize: 16 },
  partnerName: { fontSize: 12, fontWeight: '700', color: theme.accentInk },

  sectionTitle: {
    ...typography.section,
    color: theme.textDim,
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 11,
  },
  sectionCard: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    borderRadius: radius.lg,
    padding: 14,
    ...shadow.xs,
  },

  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    backgroundColor: theme.card,
  },
  langBtnActive: { backgroundColor: theme.accentDeep, borderColor: theme.accentDeep },
  langText: { color: theme.text, fontSize: 13, fontWeight: '600' },

  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  aboutRowBorder: { borderTopWidth: 1, borderTopColor: theme.borderSoft },
  aboutLabel: { fontSize: 13, color: theme.textDim, fontWeight: '500' },
  aboutValue: { fontSize: 13, color: theme.text, fontWeight: '600' },

  signOut: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.bad,
    alignItems: 'center',
    backgroundColor: theme.card,
  },
  signOutText: { color: theme.badInk, fontSize: 14, fontWeight: '700' },

  modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: theme.card,
    padding: 22,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.border,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 16 },
  modalLabel: { fontSize: 12, color: theme.textDim, marginTop: 12, marginBottom: 6, fontWeight: '600' },
  modalInput: {
    backgroundColor: theme.cardSoft,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.md,
    padding: 12,
    color: theme.text,
    fontSize: 14,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: {
    width: 48,
    height: 48,
    backgroundColor: theme.cardSoft,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBtnActive: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
    borderWidth: 2,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    alignItems: 'center',
  },
});
