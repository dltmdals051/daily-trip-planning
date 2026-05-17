import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { useLang, t, placeName } from '@/lib/i18n';
import { theme } from '@/lib/theme';
import { PlaceCard } from '@/components/cards/PlaceCard';
import { supabase } from '@/lib/supabase';

export default function PlacesScreen() {
  const lang = useLang(s => s.lang);
  const { places, wishlist, visits, discoveries, loading, refresh, toggleWish, addVisit, addDiscovery, deleteDiscovery } = useStore();
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  const [modalPlace, setModalPlace] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [memo, setMemo] = useState('');

  const [discModal, setDiscModal] = useState(false);
  const [discTitle, setDiscTitle] = useState('');
  const [discUrl, setDiscUrl] = useState('');
  const [discCity, setDiscCity] = useState('');
  const [discMemo, setDiscMemo] = useState('');

  useEffect(() => {
    refresh();
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, [refresh]);

  const cities = useMemo(() => Array.from(new Set(places.map(p => p.city))), [places]);
  const filtered = cityFilter ? places.filter(p => p.city === cityFilter) : places;

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const wa = wishlist.filter(w => w.place_id === a.id).length;
      const wb = wishlist.filter(w => w.place_id === b.id).length;
      if (wa !== wb) return wb - wa;
      return b.dateScore - a.dateScore;
    });
  }, [filtered, wishlist]);

  function openMarkVisited(placeId: string) {
    setModalPlace(placeId);
    setRating(null);
    setMemo('');
  }
  async function saveVisit() {
    if (!modalPlace) return;
    await addVisit(modalPlace, rating, memo);
    setModalPlace(null);
  }

  async function saveDiscovery() {
    if (!discTitle.trim()) return;
    await addDiscovery({
      title: discTitle.trim(),
      url: discUrl.trim() || undefined,
      city: discCity.trim() || undefined,
      memo: discMemo.trim() || undefined,
    });
    setDiscModal(false);
    setDiscTitle(''); setDiscUrl(''); setDiscCity(''); setDiscMemo('');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.text} />}
      >
        <Text style={s.h1}>{t('tabPlaces', lang)}</Text>

        {/* 발견 섹션 */}
        <View style={s.discSection}>
          <View style={s.discHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.discTitle}>{t('discoveriesTitle', lang)}</Text>
              <Text style={s.discSub}>{t('discoveriesSub', lang)}</Text>
            </View>
            <TouchableOpacity style={s.discAddBtn} onPress={() => setDiscModal(true)}>
              <Text style={s.discAddBtnText}>+ {t('addDiscovery', lang)}</Text>
            </TouchableOpacity>
          </View>

          {discoveries.length === 0 ? (
            <Text style={s.discEmpty}>{t('noDiscoveries', lang)}</Text>
          ) : (
            <View style={{ gap: 8, marginTop: 10 }}>
              {discoveries.slice(0, 5).map(d => (
                <View key={d.id} style={s.discCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.discCardTitle}>{d.title}</Text>
                    <Text style={s.discCardMeta}>
                      {d.source ? `${d.source} · ` : ''}
                      {d.city ? `${d.city} · ` : ''}
                      {new Date(d.created_at).toLocaleDateString()}
                    </Text>
                    {d.memo && <Text style={s.discCardMemo}>{d.memo}</Text>}
                    {d.url && (
                      <TouchableOpacity onPress={() => Linking.openURL(d.url!)}>
                        <Text style={s.discCardLink}>{t('openLink', lang)} →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => deleteDiscovery(d.id)}>
                    <Text style={s.discDel}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {discoveries.length > 5 && (
                <Text style={s.discMore}>+ {discoveries.length - 5}{lang === 'ko' ? '개 더' : '个'}</Text>
              )}
            </View>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <Chip active={cityFilter === null} onPress={() => setCityFilter(null)} label={t('filterAll', lang)} />
          {cities.map(c => (
            <Chip key={c} active={cityFilter === c} onPress={() => setCityFilter(c)} label={c} />
          ))}
        </ScrollView>

        <View style={{ gap: 12 }}>
          {sorted.map(place => {
            const placeWish = wishlist.filter(w => w.place_id === place.id);
            const visitCount = visits.filter(v => v.place_id === place.id).length;
            return (
              <PlaceCard
                key={place.id}
                place={place}
                wishCount={placeWish.length}
                bothWish={placeWish.length >= 2}
                iWish={!!me && placeWish.some(w => w.user_id === me)}
                onWish={() => toggleWish(place.id)}
                onMarkVisited={() => openMarkVisited(place.id)}
                visitCount={visitCount}
              />
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={discModal} animationType="slide" transparent onRequestClose={() => setDiscModal(false)}>
        <View style={s.modalRoot}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{t('addDiscovery', lang)}</Text>

            <Text style={s.modalLabel}>{t('discoveryTitle', lang)}</Text>
            <TextInput
              style={s.discInput}
              value={discTitle}
              onChangeText={setDiscTitle}
              placeholderTextColor={theme.textDim}
              placeholder={lang === 'ko' ? '예: 와이탄 야경 카페' : '例如:外滩夜景咖啡店'}
            />

            <Text style={s.modalLabel}>{t('discoveryUrl', lang)}</Text>
            <TextInput
              style={s.discInput}
              value={discUrl}
              onChangeText={setDiscUrl}
              placeholderTextColor={theme.textDim}
              placeholder="https://xhslink.com/... 또는 https://..."
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={s.modalLabel}>{t('discoveryCity', lang)}</Text>
            <TextInput
              style={s.discInput}
              value={discCity}
              onChangeText={setDiscCity}
              placeholderTextColor={theme.textDim}
              placeholder="无锡 / 苏州 / 上海 ..."
            />

            <Text style={s.modalLabel}>{t('discoveryMemo', lang)}</Text>
            <TextInput
              style={[s.discInput, { minHeight: 60, textAlignVertical: 'top' }]}
              value={discMemo}
              onChangeText={setDiscMemo}
              placeholderTextColor={theme.textDim}
              multiline
              numberOfLines={3}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.border }]} onPress={() => setDiscModal(false)}>
                <Text style={{ color: theme.text }}>×</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.accent, flex: 1 }]} onPress={saveDiscovery}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('save', lang)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!modalPlace} animationType="slide" transparent onRequestClose={() => setModalPlace(null)}>
        <View style={s.modalRoot}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>
              {modalPlace ? placeName(places.find(p => p.id === modalPlace)!, lang) : ''}
            </Text>
            <Text style={s.modalLabel}>
              {t('rating', lang)} {rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[s.ratingBtn, rating === n && { backgroundColor: theme.accent }]}
                  onPress={() => setRating(n)}
                >
                  <Text style={{ color: theme.text }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.modalLabel}>{t('memo', lang)}</Text>
            <TextInput
              style={s.memoInput}
              value={memo}
              onChangeText={setMemo}
              multiline
              numberOfLines={4}
              placeholderTextColor={theme.textDim}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.border }]} onPress={() => setModalPlace(null)}>
                <Text style={{ color: theme.text }}>×</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.accent, flex: 1 }]} onPress={saveVisit}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('save', lang)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Chip({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80 },
  h1: { fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
    shadowColor: '#ff9a8b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chipText: { color: theme.textDim, fontSize: 11, fontWeight: '500' },
  modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: theme.card, padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 12 },
  modalLabel: { fontSize: 13, color: theme.textDim, marginBottom: 6 },
  ratingBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoInput: {
    backgroundColor: theme.bg,
    color: theme.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  discSection: {
    backgroundColor: theme.cardSoft,
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    shadowColor: '#a0826e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  discHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  discTitle: { fontSize: 14, fontWeight: '700', color: theme.accentDeep, marginBottom: 2 },
  discSub: { fontSize: 11, color: theme.textDim },
  discAddBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.accentDeep,
    borderRadius: 10,
  },
  discAddBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  discEmpty: { fontSize: 12, color: theme.textDim, marginTop: 10, fontStyle: 'italic' },
  discCard: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  discCardTitle: { fontSize: 13, fontWeight: '600', color: theme.text },
  discCardMeta: { fontSize: 10, color: theme.textDim, marginTop: 2 },
  discCardMemo: { fontSize: 12, color: theme.text, marginTop: 4 },
  discCardLink: { fontSize: 11, color: theme.accentDeep, marginTop: 4, fontWeight: '600' },
  discDel: { fontSize: 18, color: theme.textDim, paddingHorizontal: 6 },
  discMore: { fontSize: 11, color: theme.textDim, textAlign: 'center', marginTop: 4 },
  discInput: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 10,
    color: theme.text,
    fontSize: 14,
    marginBottom: 4,
  },
});
