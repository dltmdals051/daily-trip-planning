import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/lib/store';
import { useLang, t, placeName } from '@/lib/i18n';
import { theme, shadow, gradient, radius, typography } from '@/lib/theme';
import { PlaceCard } from '@/components/cards/PlaceCard';
import { actorLabels } from '@/lib/people';

export default function PlacesScreen() {
  const lang = useLang(s => s.lang);
  const { places, wishlist, visits, discoveries, profiles, me, loading, refresh, toggleWish, addVisit, addDiscovery, deleteDiscovery } = useStore();
  const [cityFilter, setCityFilter] = useState<string | null>(null);

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
  }, [refresh]);

  const cities = useMemo(() => Array.from(new Set(places.map(p => p.city))), [places]);
  const filtered = cityFilter ? places.filter(p => p.city === cityFilter) : places;

  const wishCountById = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of wishlist) m.set(w.place_id, (m.get(w.place_id) ?? 0) + 1);
    return m;
  }, [wishlist]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const wa = wishCountById.get(a.id) ?? 0;
      const wb = wishCountById.get(b.id) ?? 0;
      if (wa !== wb) return wb - wa;
      return b.dateScore - a.dateScore;
    });
  }, [filtered, wishCountById]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['left', 'right', 'top']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.text} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={gradient.warm}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <Text style={s.heroEyebrow}>{t('tabPlaces', lang)}</Text>
          <Text style={s.heroTitle}>
            {lang === 'ko' ? `${places.length}곳 큐레이션` : `${places.length}处精选`}
          </Text>
          <Text style={s.heroSub}>
            {lang === 'ko' ? '하트로 가고싶은 곳 표시, ✓로 다녀온 곳 등록' : '用 ♥ 标记想去,✓ 标记已去过'}
          </Text>
        </LinearGradient>

        {/* 발견 섹션 */}
        <View style={s.discCard}>
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
            <View style={s.discEmpty}>
              <Text style={s.discEmptyEmoji}>🔖</Text>
              <Text style={s.discEmptyText}>{t('noDiscoveries', lang)}</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {discoveries.slice(0, 5).map(d => (
                <View key={d.id} style={s.discItem}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={s.discItemTitle} numberOfLines={1}>
                      {d.title}
                    </Text>
                    <Text style={s.discItemMeta}>
                      {d.source ? `${d.source} · ` : ''}
                      {d.city ? `${d.city} · ` : ''}
                      {actorLabels([d.user_id], profiles, me)} · {new Date(d.created_at).toLocaleDateString()}
                    </Text>
                    {d.memo && <Text style={s.discItemMemo} numberOfLines={2}>{d.memo}</Text>}
                    {d.url && (
                      <TouchableOpacity onPress={() => Linking.openURL(d.url!)}>
                        <Text style={s.discItemLink}>{t('openLink', lang)} →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteDiscovery(d.id)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Text style={s.discDel}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {discoveries.length > 5 && (
                <Text style={s.discMore}>+ {discoveries.length - 5}{t('morePlaces', lang)}</Text>
              )}
            </View>
          )}
        </View>

        {/* 도시 필터 */}
        <View style={s.filterWrap}>
          <Text style={s.sectionTitle}>{t('filterByCity', lang)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip active={cityFilter === null} onPress={() => setCityFilter(null)} label={t('filterAll', lang)} />
            {cities.map(c => (
              <Chip key={c} active={cityFilter === c} onPress={() => setCityFilter(c)} label={c} />
            ))}
          </ScrollView>
        </View>

        {/* 장소 카드 */}
        {sorted.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📍</Text>
            <Text style={s.emptyText}>
              {loading
                ? (lang === 'ko' ? '불러오는 중...' : '加载中...')
                : (lang === 'ko' ? '해당 도시 장소 없음' : '该城市暂无地点')}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
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
                  wishActors={placeWish.length > 0 ? actorLabels(placeWish.map(w => w.user_id), profiles, me) : undefined}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 발견 추가 모달 */}
      <Modal visible={discModal} animationType="slide" transparent onRequestClose={() => setDiscModal(false)}>
        <View style={s.modalRoot}>
          <View style={s.modalBox}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t('addDiscovery', lang)}</Text>

            <Text style={s.modalLabel}>{t('discoveryTitle', lang)}</Text>
            <TextInput
              style={s.modalInput}
              value={discTitle}
              onChangeText={setDiscTitle}
              placeholderTextColor={theme.textDim}
              placeholder={lang === 'ko' ? '예: 와이탄 야경 카페' : '例如:外滩夜景咖啡店'}
            />

            <Text style={s.modalLabel}>{t('discoveryUrl', lang)}</Text>
            <TextInput
              style={s.modalInput}
              value={discUrl}
              onChangeText={setDiscUrl}
              placeholderTextColor={theme.textDim}
              placeholder="https://xhslink.com/... 또는 https://..."
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={s.modalLabel}>{t('discoveryCity', lang)}</Text>
            <TextInput
              style={s.modalInput}
              value={discCity}
              onChangeText={setDiscCity}
              placeholderTextColor={theme.textDim}
              placeholder="无锡 / 苏州 / 上海 ..."
            />

            <Text style={s.modalLabel}>{t('discoveryMemo', lang)}</Text>
            <TextInput
              style={[s.modalInput, { minHeight: 70, textAlignVertical: 'top' }]}
              value={discMemo}
              onChangeText={setDiscMemo}
              placeholderTextColor={theme.textDim}
              multiline
              numberOfLines={3}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: theme.cardSoft, borderWidth: 1, borderColor: theme.border }]}
                onPress={() => setDiscModal(false)}
              >
                <Text style={{ color: theme.text, fontWeight: '600' }}>{t('cancel', lang)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: theme.accentDeep, flex: 1 }]}
                onPress={saveDiscovery}
                disabled={!discTitle.trim()}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('save', lang)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 방문 등록 모달 */}
      <Modal visible={!!modalPlace} animationType="slide" transparent onRequestClose={() => setModalPlace(null)}>
        <View style={s.modalRoot}>
          <View style={s.modalBox}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>
              {modalPlace ? placeName(places.find(p => p.id === modalPlace)!, lang) : ''}
            </Text>

            <Text style={s.modalLabel}>{t('rating', lang)}</Text>
            <View style={s.ratingRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[s.starBtn, rating !== null && n <= rating && s.starBtnOn]}
                  onPress={() => setRating(n === rating ? null : n)}
                >
                  <Text style={[s.starBtnText, rating !== null && n <= rating && { color: '#fff' }]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.modalLabel}>{t('memo', lang)}</Text>
            <TextInput
              style={[s.modalInput, { minHeight: 90, textAlignVertical: 'top' }]}
              value={memo}
              onChangeText={setMemo}
              multiline
              numberOfLines={4}
              placeholderTextColor={theme.textDim}
              placeholder={lang === 'ko' ? '어땠어? 한 줄 메모...' : '感想?简短记录...'}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: theme.cardSoft, borderWidth: 1, borderColor: theme.border }]}
                onPress={() => setModalPlace(null)}
              >
                <Text style={{ color: theme.text, fontWeight: '600' }}>{t('cancel', lang)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: theme.accentDeep, flex: 1 }]}
                onPress={saveVisit}
              >
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
      <Text style={[s.chipText, active && { color: '#fff', fontWeight: '700' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 4 },

  hero: {
    borderRadius: radius.xl,
    padding: 22,
    marginBottom: 18,
    ...shadow.md,
  },
  heroEyebrow: { ...typography.section, color: theme.accentInk, opacity: 0.7, marginBottom: 8, fontSize: 11 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: theme.accentInk, letterSpacing: -0.5 },
  heroSub: { fontSize: 12, color: theme.accentInk, opacity: 0.7, marginTop: 6 },

  discCard: {
    backgroundColor: theme.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: theme.accentSoft,
    padding: 16,
    marginBottom: 22,
    ...shadow.sm,
  },
  discHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  discTitle: { fontSize: 15, fontWeight: '800', color: theme.accentDeep, marginBottom: 3, letterSpacing: -0.2 },
  discSub: { fontSize: 11, color: theme.textDim, lineHeight: 15 },
  discAddBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: theme.accentDeep,
    borderRadius: radius.md,
    ...shadow.xs,
  },
  discAddBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  discEmpty: { alignItems: 'center', paddingVertical: 18, gap: 8 },
  discEmptyEmoji: { fontSize: 32, opacity: 0.5 },
  discEmptyText: { fontSize: 12, color: theme.textDim, fontStyle: 'italic' },

  discItem: {
    flexDirection: 'row',
    backgroundColor: theme.cardSoft,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    alignItems: 'flex-start',
    gap: 8,
  },
  discItemTitle: { fontSize: 13, fontWeight: '700', color: theme.text },
  discItemMeta: { fontSize: 10, color: theme.textDim },
  discItemMemo: { fontSize: 12, color: theme.text, marginTop: 2, lineHeight: 17 },
  discItemLink: { fontSize: 11, color: theme.accentDeep, marginTop: 4, fontWeight: '700' },
  discDel: { fontSize: 20, color: theme.textDim, fontWeight: '300' },
  discMore: { fontSize: 11, color: theme.textDim, textAlign: 'center', marginTop: 4 },

  filterWrap: { marginBottom: 16 },
  sectionTitle: { ...typography.section, color: theme.textDim, fontSize: 11, marginBottom: 8, marginLeft: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
    ...shadow.xs,
  },
  chipText: { color: theme.textDim, fontSize: 12, fontWeight: '600' },

  empty: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border,
    borderRadius: radius.lg,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyEmoji: { fontSize: 36, opacity: 0.45 },
  emptyText: { color: theme.textDim, fontSize: 13 },

  // Modals
  modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: theme.card,
    padding: 22,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHandle: {
    width: 40, height: 4,
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
  ratingRow: { flexDirection: 'row', gap: 8 },
  starBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: theme.cardSoft,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBtnOn: { backgroundColor: theme.accentDeep, borderColor: theme.accentDeep },
  starBtnText: { fontSize: 20, color: theme.border, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    alignItems: 'center',
  },
});
