import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { useLang, t, type DictKey } from '@/lib/i18n';
import { theme, shadow } from '@/lib/theme';
import { PlaceCard } from '@/components/cards/PlaceCard';
import { WeatherCard } from '@/components/cards/WeatherCard';
import { customRecommend } from '@/lib/recommend';
import { fetchClientWeather } from '@/lib/clientWeather';
import { defaultFilters } from '@/lib/types';
import type { CustomFilters, Category, WeatherDay, Recommendation } from '@/lib/types';
import { actorLabels } from '@/lib/people';

const CATEGORIES: { value: Category; key: DictKey }[] = [
  { value: 'nature', key: 'catNature' },
  { value: 'culture', key: 'catCulture' },
  { value: 'food', key: 'catFood' },
  { value: 'shopping', key: 'catShopping' },
  { value: 'date', key: 'catDate' },
  { value: 'ancient-town', key: 'catAncient' },
  { value: 'museum', key: 'catMuseum' },
  { value: 'park', key: 'catPark' },
  { value: 'temple', key: 'catTemple' },
  { value: 'theme-park', key: 'catTheme' },
  { value: 'water-town', key: 'catWaterTown' },
];

const COSTS: { value: 'free' | 'cheap' | 'medium' | 'expensive'; key: DictKey }[] = [
  { value: 'free', key: 'costFree' },
  { value: 'cheap', key: 'costCheap' },
  { value: 'medium', key: 'costMedium' },
  { value: 'expensive', key: 'costExpensive' },
];

const TRAVEL_OPTIONS = [30, 60, 90, 120];
const DATE_SCORE_OPTIONS = [0, 5, 7, 8, 9];

export default function CustomScreen() {
  const lang = useLang(s => s.lang);
  const router = useRouter();
  const { places, visits, wishlist, weekly, profiles, me, refresh, toggleWish, addVisit } = useStore();

  const [filters, setFilters] = useState<CustomFilters>(defaultFilters());
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [adhocWeather, setAdhocWeather] = useState<WeatherDay[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const cities = useMemo(() => Array.from(new Set(places.map(p => p.city))), [places]);
  const placesById = useMemo(() => Object.fromEntries(places.map(p => [p.id, p])), [places]);

  function update<K extends keyof CustomFilters>(k: K, v: CustomFilters[K]) {
    setFilters(prev => ({ ...prev, [k]: v }));
  }
  function toggleArr<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
  }

  async function generate() {
    setBusy(true);
    const now = new Date();

    let weather: WeatherDay[] = [];
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        weather = await fetchClientWeather(start, end);
      }
    } else if (weekly) {
      weather = weekly.weather;
    }

    const events = weekly?.events ?? [];
    const recs = customRecommend(
      places,
      filters,
      visits.map(v => ({ place_id: v.place_id, visited_on: v.visited_on })),
      weather,
      events,
      filters.startDate ? new Date(filters.startDate) : now,
    );
    setResults(recs);
    setAdhocWeather(weather);
    setBusy(false);
  }

  function reset() {
    setFilters(defaultFilters());
    setResults(null);
    setAdhocWeather([]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['left', 'right']}>
      <Stack.Screen
        options={{
          title: t('customTitle', lang),
          headerShown: true,
          headerStyle: { backgroundColor: theme.bg },
          headerTitleStyle: { color: theme.text },
          headerTintColor: theme.accent,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        {/* 시작 날짜 */}
        <Field label={t('filterStartDate', lang)}>
          <TextInput
            style={s.input}
            value={filters.startDate ?? ''}
            onChangeText={v => update('startDate', v || null)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textDim}
            autoCapitalize="none"
          />
        </Field>

        {/* 도시 */}
        <Field label={t('filterCities', lang)}>
          <ChipRow
            items={cities.map(c => ({ value: c, label: c }))}
            selected={filters.cities}
            onToggle={v => update('cities', toggleArr(filters.cities, v))}
          />
        </Field>

        {/* 카테고리 */}
        <Field label={t('filterCategories', lang)}>
          <ChipRow
            items={CATEGORIES.map(c => ({ value: c.value, label: t(c.key, lang) }))}
            selected={filters.categories}
            onToggle={v => update('categories', toggleArr(filters.categories, v as Category))}
          />
        </Field>

        {/* 예산 */}
        <Field label={t('filterCost', lang)}>
          <ChipRow
            items={COSTS.map(c => ({ value: c.value, label: t(c.key, lang) }))}
            selected={filters.costs}
            onToggle={v => update('costs', toggleArr(filters.costs, v as any))}
          />
        </Field>

        {/* 편도 시간 */}
        <Field label={t('filterTravel', lang)}>
          <ChipRow
            items={[
              ...TRAVEL_OPTIONS.map(n => ({ value: n, label: `${n}${lang === 'ko' ? '분' : '分钟'}` })),
              { value: 0, label: t('noLimit', lang) },
            ]}
            selected={filters.maxTravelMinutes === null ? [0] : [filters.maxTravelMinutes]}
            onToggle={v => update('maxTravelMinutes', v === 0 ? null : (v as number))}
            single
          />
        </Field>

        {/* 날씨 선호 */}
        <Field label={t('filterWeather', lang)}>
          <ChipRow
            items={[
              { value: 'any', label: t('weatherAny', lang) },
              { value: 'indoor', label: t('weatherIndoor', lang) },
              { value: 'outdoor', label: t('weatherOutdoor', lang) },
            ]}
            selected={[filters.weather]}
            onToggle={v => update('weather', v as any)}
            single
          />
        </Field>

        {/* 데이트 점수 */}
        <Field label={t('filterDateScore', lang)}>
          <ChipRow
            items={DATE_SCORE_OPTIONS.map(n => ({ value: n, label: `${n}+` }))}
            selected={[filters.minDateScore]}
            onToggle={v => update('minDateScore', v as number)}
            single
          />
        </Field>

        {/* 최근 다녀온 곳 제외 */}
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>{t('filterExcludeRecent', lang)}</Text>
          <Switch
            value={filters.excludeRecent}
            onValueChange={v => update('excludeRecent', v)}
            trackColor={{ true: theme.accent, false: theme.border }}
            thumbColor="#fff"
          />
        </View>

        {/* 버튼 */}
        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={generate} disabled={busy}>
            <Text style={[s.btnText, { color: '#fff' }]}>{busy ? '...' : t('generateBtn', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={reset}>
            <Text style={[s.btnText, { color: theme.textDim }]}>{t('resetBtn', lang)}</Text>
          </TouchableOpacity>
        </View>

        {/* 결과 */}
        {results !== null && (
          <View style={{ marginTop: 24 }}>
            <View style={s.filterSummary}>
              <Text style={s.filterSummaryText}>
                📋 {summarizeFilters(filters, lang)}
              </Text>
            </View>
            <Text style={s.h2}>
              {t('resultsTitle', lang)} ({results.length})
            </Text>

            {adhocWeather.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {adhocWeather.map(w => (
                  <WeatherCard key={w.date} w={w} />
                ))}
              </View>
            )}

            {results.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyText}>{t('noMatches', lang)}</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {results.map((r, i) => {
                  const place = placesById[r.place_id];
                  if (!place) return null;
                  const placeWish = wishlist.filter(w => w.place_id === place.id);
                  return (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      rank={i + 1}
                      score={r.score}
                      reasons={r.reasons}
                      wishCount={placeWish.length}
                      bothWish={placeWish.length >= 2}
                      iWish={!!me && placeWish.some(w => w.user_id === me)}
                      onWish={() => toggleWish(place.id)}
                      onMarkVisited={() => addVisit(place.id, null, '')}
                      wishActors={placeWish.length > 0 ? actorLabels(placeWish.map(w => w.user_id), profiles, me) : undefined}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function summarizeFilters(f: CustomFilters, lang: 'ko' | 'zh'): string {
  const parts: string[] = [];
  if (f.cities.length > 0) parts.push(f.cities.join('·'));
  if (f.categories.length > 0) {
    const map: Record<string, { ko: string; zh: string }> = {
      'nature': { ko: '자연', zh: '自然' },
      'culture': { ko: '문화', zh: '文化' },
      'food': { ko: '먹거리', zh: '美食' },
      'shopping': { ko: '쇼핑', zh: '购物' },
      'date': { ko: '데이트', zh: '约会' },
      'ancient-town': { ko: '고진', zh: '古镇' },
      'museum': { ko: '박물관', zh: '博物馆' },
      'park': { ko: '공원', zh: '公园' },
      'temple': { ko: '사찰', zh: '寺庙' },
      'theme-park': { ko: '테마파크', zh: '主题公园' },
      'water-town': { ko: '수향', zh: '水乡' },
    };
    parts.push(f.categories.map(c => map[c]?.[lang] ?? c).join('·'));
  }
  if (f.costs.length > 0) parts.push(f.costs.join('·'));
  if (f.maxTravelMinutes !== null) parts.push(`${lang === 'ko' ? '편도' : '单程'} ${f.maxTravelMinutes}${lang === 'ko' ? '분 이내' : '分钟以内'}`);
  if (f.weather !== 'any') parts.push(f.weather === 'indoor' ? (lang === 'ko' ? '실내' : '室内') : (lang === 'ko' ? '야외' : '户外'));
  if (f.minDateScore > 0) parts.push(`${lang === 'ko' ? '데이트' : '约会'} ${f.minDateScore}+`);
  return parts.length > 0 ? parts.join(' · ') : (lang === 'ko' ? '필터 없음' : '无筛选');
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow<T extends string | number>({
  items,
  selected,
  onToggle,
  single,
}: {
  items: { value: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
  single?: boolean;
}) {
  return (
    <View style={s.chipRow}>
      {items.map(item => {
        const active = selected.includes(item.value);
        return (
          <TouchableOpacity
            key={String(item.value)}
            style={[s.chip, active && s.chipActive]}
            onPress={() => onToggle(item.value)}
          >
            <Text style={[s.chipText, active && { color: '#fff', fontWeight: '600' }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80 },
  field: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 12,
    color: theme.textDim,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  input: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    color: theme.text,
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
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
  chipText: { fontSize: 12, color: theme.textDim, fontWeight: '500' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },
  switchLabel: { fontSize: 13, color: theme.text, flex: 1 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  btnPrimary: { flex: 1, backgroundColor: theme.accentDeep, ...shadow.glow },
  btnSecondary: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  btnText: { fontSize: 14, fontWeight: '700', color: theme.text },
  h2: { fontSize: 13, fontWeight: '700', color: theme.accentDeep, marginBottom: 12, letterSpacing: 0.4 },
  empty: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border,
    borderRadius: 10,
    padding: 16,
  },
  emptyText: { color: theme.textDim, fontSize: 13, textAlign: 'center' },
  filterSummary: {
    backgroundColor: theme.cardSoft,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  filterSummaryText: {
    fontSize: 11,
    color: theme.textDim,
    lineHeight: 17,
  },
});
