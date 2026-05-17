import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useStore } from '@/lib/store';
import { useLang, t, type DictKey } from '@/lib/i18n';
import { theme, shadow } from '@/lib/theme';
import { AIPlaceCard } from '@/components/cards/AIPlaceCard';
import { supabase } from '@/lib/supabase';
import { defaultFilters } from '@/lib/types';
import type { CustomFilters, Category, AIPlace, AIRecommendResponse } from '@/lib/types';

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

const CITY_OPTIONS = ['无锡', '苏州', '南京', '常州', '扬州', '镇江', '上海', '杭州'];
const TRAVEL_OPTIONS = [30, 60, 90, 120, 180];
const DATE_SCORE_OPTIONS = [0, 5, 7, 8, 9];

export default function CustomScreen() {
  const lang = useLang(s => s.lang);
  const { discoveries, addDiscovery } = useStore();

  const [filters, setFilters] = useState<CustomFilters>(defaultFilters());
  const [results, setResults] = useState<AIPlace[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const savedTitles = useMemo(
    () => new Set(discoveries.map(d => d.title.trim().toLowerCase())),
    [discoveries],
  );

  function update<K extends keyof CustomFilters>(k: K, v: CustomFilters[K]) {
    setFilters(prev => ({ ...prev, [k]: v }));
  }
  function toggleArr<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setNotes(null);
    setSavedKeys(new Set());
    try {
      const { data, error: fnErr } = await supabase.functions.invoke<AIRecommendResponse>('ai-recommend', {
        body: filters,
      });
      if (fnErr) throw fnErr;
      if (!data) throw new Error('빈 응답');
      if (data.error) throw new Error(data.error);
      setResults(data.places);
      setNotes(data.notes ?? null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setResults([]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFilters(defaultFilters());
    setResults(null);
    setError(null);
    setNotes(null);
    setSavedKeys(new Set());
  }

  async function saveToDiscovery(p: AIPlace) {
    const key = `${p.nameKo}|${p.nameZh}`;
    await addDiscovery({
      title: `${p.nameKo} (${p.nameZh})`,
      url: p.sourceUrl,
      city: p.city,
      category: p.category,
      memo: p.why + (p.tips ? `\n💡 ${p.tips}` : ''),
      source: 'AI',
    });
    setSavedKeys(prev => new Set(prev).add(key));
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
        <View style={s.aiBanner}>
          <Text style={s.aiBannerTitle}>🤖 {lang === 'ko' ? 'AI 실시간 검색' : 'AI 实时搜索'}</Text>
          <Text style={s.aiBannerSub}>
            {lang === 'ko'
              ? 'Gemini가 구글 검색으로 매번 새로 찾아옴. 큐레이션 목록 기반 아님.'
              : 'Gemini 通过谷歌搜索实时查找,不基于固定列表'}
          </Text>
        </View>

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
            items={CITY_OPTIONS.map(c => ({ value: c, label: c }))}
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
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[s.btnText, { color: '#fff' }]}>
                ✨ {lang === 'ko' ? 'AI에게 추천 받기' : '让 AI 推荐'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={reset}>
            <Text style={[s.btnText, { color: theme.textDim }]}>{t('resetBtn', lang)}</Text>
          </TouchableOpacity>
        </View>

        {busy && (
          <View style={s.loadingBox}>
            <Text style={s.loadingText}>
              {lang === 'ko' ? 'Gemini가 검색 중... 보통 5~15초' : 'Gemini 正在搜索... 通常 5~15 秒'}
            </Text>
          </View>
        )}

        {error && (
          <View style={s.errBox}>
            <Text style={s.errText}>⚠️ {error}</Text>
          </View>
        )}

        {/* 결과 */}
        {results !== null && !busy && (
          <View style={{ marginTop: 16 }}>
            <Text style={s.h2}>
              {t('resultsTitle', lang)} ({results.length})
            </Text>

            {notes && (
              <View style={s.notesBox}>
                <Text style={s.notesText}>📝 {notes}</Text>
              </View>
            )}

            {results.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyText}>
                  {error
                    ? (lang === 'ko' ? '에러로 결과 없음' : '出错,无结果')
                    : t('noMatches', lang)}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {results.map((p, i) => {
                  const key = `${p.nameKo}|${p.nameZh}`;
                  const alreadySaved =
                    savedKeys.has(key) ||
                    savedTitles.has(`${p.nameKo} (${p.nameZh})`.toLowerCase());
                  return (
                    <AIPlaceCard
                      key={key}
                      place={p}
                      rank={i + 1}
                      onSave={() => saveToDiscovery(p)}
                      saved={alreadySaved}
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
  aiBanner: {
    backgroundColor: theme.lavender,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  aiBannerTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  aiBannerSub: { fontSize: 12, color: '#fff', opacity: 0.9, lineHeight: 17 },
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
    justifyContent: 'center',
    paddingHorizontal: 18,
    minHeight: 48,
  },
  btnPrimary: { flex: 1, backgroundColor: theme.accentDeep, ...shadow.glow },
  btnSecondary: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  btnText: { fontSize: 14, fontWeight: '700', color: theme.text },
  loadingBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: theme.cardSoft,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: { fontSize: 13, color: theme.textDim },
  errBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff0f0',
    borderColor: theme.bad,
    borderWidth: 1,
    borderRadius: 10,
  },
  errText: { fontSize: 13, color: theme.badInk },
  h2: { fontSize: 13, fontWeight: '700', color: theme.accentDeep, marginBottom: 12, letterSpacing: 0.4 },
  notesBox: {
    backgroundColor: theme.cardSoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  notesText: { fontSize: 11, color: theme.textDim, lineHeight: 16 },
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
