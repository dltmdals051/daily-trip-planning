import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { useLang, t, type DictKey } from '@/lib/i18n';
import { theme } from '@/lib/theme';
import { PlaceCard } from '@/components/cards/PlaceCard';
import { WeatherCard } from '@/components/cards/WeatherCard';
import { customRecommend } from '@/lib/recommend';
import { fetchClientWeather } from '@/lib/clientWeather';
import { defaultFilters } from '@/lib/types';
import type { CustomFilters, Category, WeatherDay, Recommendation } from '@/lib/types';
import { supabase } from '@/lib/supabase';

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
  const { places, visits, wishlist, weekly, refresh, toggleWish, addVisit } = useStore();

  const [filters, setFilters] = useState<CustomFilters>(defaultFilters());
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [adhocWeather, setAdhocWeather] = useState<WeatherDay[]>([]);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    refresh();
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
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
          <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: theme.accent }]} onPress={generate} disabled={busy}>
            <Text style={[s.btnText, { color: '#fff' }]}>{busy ? '...' : t('generateBtn', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: theme.border }]} onPress={reset}>
            <Text style={s.btnText}>{t('resetBtn', lang)}</Text>
          </TouchableOpacity>
        </View>

        {/* 결과 */}
        {results !== null && (
          <View style={{ marginTop: 24 }}>
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
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { fontSize: 12, color: theme.textDim },
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
    borderRadius: 10,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  btnText: { fontSize: 14, fontWeight: '700', color: theme.text },
  h2: { fontSize: 16, fontWeight: '700', color: theme.accentSoft, marginBottom: 12 },
  empty: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border,
    borderRadius: 10,
    padding: 16,
  },
  emptyText: { color: theme.textDim, fontSize: 13, textAlign: 'center' },
});
