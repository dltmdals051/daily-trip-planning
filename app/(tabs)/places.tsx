import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { useLang, t, placeName } from '@/lib/i18n';
import { theme } from '@/lib/theme';
import { PlaceCard } from '@/components/cards/PlaceCard';
import { supabase } from '@/lib/supabase';

export default function PlacesScreen() {
  const lang = useLang(s => s.lang);
  const { places, wishlist, visits, loading, refresh, toggleWish, addVisit } = useStore();
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  const [modalPlace, setModalPlace] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [memo, setMemo] = useState('');

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.text} />}
      >
        <Text style={s.h1}>{t('tabPlaces', lang)}</Text>

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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.textDim, fontSize: 12 },
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
});
