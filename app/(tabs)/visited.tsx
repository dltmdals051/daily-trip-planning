import { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/lib/store';
import { useLang, t, placeName } from '@/lib/i18n';
import { theme, shadow, gradient, radius, typography } from '@/lib/theme';
import { displayLabel } from '@/lib/people';

export default function VisitedScreen() {
  const lang = useLang(s => s.lang);
  const { places, visits, profiles, me, loading, refresh, deleteVisit } = useStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const placesById = useMemo(() => Object.fromEntries(places.map(p => [p.id, p])), [places]);

  const stats = useMemo(() => {
    const uniquePlaces = new Set(visits.map(v => v.place_id)).size;
    const ratings = visits.map(v => v.rating).filter((r): r is number => typeof r === 'number');
    const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return { total: visits.length, uniquePlaces, avg };
  }, [visits]);

  // 월별 그룹핑
  const grouped = useMemo(() => {
    const map = new Map<string, typeof visits>();
    for (const v of visits) {
      const month = v.visited_on.slice(0, 7); // YYYY-MM
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(v);
    }
    return Array.from(map.entries()); // already sorted desc since visits is sorted
  }, [visits]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['left', 'right', 'top']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.text} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero with stats */}
        <LinearGradient
          colors={gradient.warm}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <Text style={s.heroEyebrow}>{t('tabVisited', lang)}</Text>
          {visits.length > 0 ? (
            <View style={s.statsRow}>
              <Stat value={stats.total} label={lang === 'ko' ? '총 방문' : '总访问'} />
              <View style={s.statDivider} />
              <Stat value={stats.uniquePlaces} label={lang === 'ko' ? '장소' : '地点'} />
              {stats.avg > 0 && (
                <>
                  <View style={s.statDivider} />
                  <Stat value={`★${stats.avg.toFixed(1)}`} label={lang === 'ko' ? '평균' : '平均'} />
                </>
              )}
            </View>
          ) : (
            <Text style={s.heroEmpty}>{lang === 'ko' ? '아직 방문한 곳이 없어요' : '还没有去过的地方'}</Text>
          )}
        </LinearGradient>

        {visits.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📭</Text>
            <Text style={s.emptyTitle}>{lang === 'ko' ? '방문 기록이 비어있어요' : '访问记录为空'}</Text>
            <Text style={s.emptyText}>
              {lang === 'ko'
                ? '"장소" 탭에서 다녀온 곳을 ✓ 표시해보세요'
                : '在"地点"标签中标记已去过的地方'}
            </Text>
          </View>
        ) : (
          grouped.map(([month, monthVisits]) => (
            <View key={month} style={{ marginBottom: 22 }}>
              <Text style={s.monthHeader}>{formatMonth(month, lang)}</Text>
              <View style={{ gap: 10 }}>
                {monthVisits.map(v => {
                  const place = placesById[v.place_id];
                  if (!place) return null;
                  return (
                    <View key={v.id} style={s.card}>
                      <View style={s.cardRow}>
                        <View style={s.dateChip}>
                          <Text style={s.dateDay}>{Number(v.visited_on.slice(8, 10))}</Text>
                          <Text style={s.dateMonth}>{Number(v.visited_on.slice(5, 7))}{lang === 'ko' ? '월' : '月'}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={s.name}>{placeName(place, lang)}</Text>
                          <Text style={s.sub}>
                            {lang === 'ko' ? place.nameZh : place.nameKo} · {place.city}
                          </Text>
                          <View style={s.metaRow}>
                            <Text style={s.actor}>{displayLabel(v.user_id, profiles, me)}</Text>
                            {v.rating !== null && v.rating !== undefined && (
                              <Text style={s.rating}>{'★'.repeat(v.rating)}{'☆'.repeat(5 - v.rating)}</Text>
                            )}
                          </View>
                          {v.memo && (
                            <View style={s.memoBox}>
                              <Text style={s.memo}>{v.memo}</Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteVisit(v.id)}
                          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        >
                          <Text style={s.del}>×</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function formatMonth(yyyymm: string, lang: 'ko' | 'zh'): string {
  const [y, m] = yyyymm.split('-');
  return lang === 'ko' ? `${y}년 ${Number(m)}월` : `${y}年 ${Number(m)}月`;
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 4 },
  hero: {
    borderRadius: radius.xl,
    padding: 22,
    marginBottom: 22,
    ...shadow.md,
  },
  heroEyebrow: {
    ...typography.section,
    color: theme.accentInk,
    opacity: 0.7,
    marginBottom: 14,
  },
  heroEmpty: { fontSize: 14, color: theme.accentInk, opacity: 0.65 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stat: { alignItems: 'flex-start' },
  statValue: { fontSize: 32, fontWeight: '800', color: theme.accentInk, letterSpacing: -1 },
  statLabel: { fontSize: 11, color: theme.accentInk, opacity: 0.7, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: theme.accentInk, opacity: 0.15 },

  monthHeader: {
    ...typography.section,
    color: theme.textDim,
    marginBottom: 12,
    fontSize: 11,
  },
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    borderRadius: radius.lg,
    padding: 14,
    ...shadow.xs,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dateChip: {
    width: 50,
    paddingVertical: 8,
    backgroundColor: theme.cardSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    alignItems: 'center',
  },
  dateDay: { fontSize: 20, fontWeight: '800', color: theme.accentDeep, lineHeight: 22 },
  dateMonth: { fontSize: 10, color: theme.textDim, fontWeight: '600', marginTop: 2 },
  name: { fontSize: 15, fontWeight: '700', color: theme.text },
  sub: { fontSize: 12, color: theme.textDim, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  actor: { fontSize: 11, color: theme.textDim, fontWeight: '600' },
  rating: { fontSize: 12, color: '#d49a3a', letterSpacing: 1 },
  memoBox: {
    backgroundColor: theme.cardSoft,
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  memo: { fontSize: 12, color: theme.text, lineHeight: 17 },
  del: { fontSize: 22, color: theme.textDim, paddingHorizontal: 4, fontWeight: '300' },

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
  emptyEmoji: { fontSize: 48, opacity: 0.55 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: theme.text, marginTop: 4 },
  emptyText: { fontSize: 12, color: theme.textDim, textAlign: 'center', lineHeight: 18 },
});
