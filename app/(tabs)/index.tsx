import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { useLang, t } from '@/lib/i18n';
import { theme, shadow, gradient, radius, typography } from '@/lib/theme';
import { WeatherCard } from '@/components/cards/WeatherCard';
import { EventCard } from '@/components/cards/EventCard';
import { AIPlaceCard } from '@/components/cards/AIPlaceCard';

export default function WeekendScreen() {
  const lang = useLang(s => s.lang);
  const router = useRouter();
  const { discoveries, addDiscovery, weekendData, weekendLoading, refreshWeekend, refresh } = useStore();

  useEffect(() => {
    // 1순위: weekend 데이터 (캐시는 이미 동기 로드됨, 백그라운드 새로고침)
    refreshWeekend();
    // 2순위: 다른 테이블 (장소/방문/하트/투표/프로필) — 첫 페인트 뒤로 미룸
    const id = setTimeout(() => refresh(), 0);
    return () => clearTimeout(id);
  }, [refresh, refreshWeekend]);

  const start = weekendData ? new Date(weekendData.startDate + 'T00:00:00') : null;
  const end = weekendData ? new Date(weekendData.endDate + 'T00:00:00') : null;

  const savedTitles = new Set(discoveries.map(d => d.title.trim().toLowerCase()));

  async function saveToDiscovery(p: typeof weekendData extends null ? never : NonNullable<typeof weekendData>['recommendations'][number]) {
    await addDiscovery({
      title: `${p.nameKo} (${p.nameZh})`,
      url: p.sourceUrl,
      city: p.city,
      category: p.category,
      memo: p.why + (p.tips ? `\n💡 ${p.tips}` : ''),
      source: 'AI',
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['left', 'right', 'top']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={weekendLoading}
            onRefresh={() => refreshWeekend(true)}
            tintColor={theme.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={gradient.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroTopRow}>
            <Text style={s.heroEyebrow}>{lang === 'ko' ? '이번 주말까지' : '到本周末'}</Text>
            <TouchableOpacity onPress={() => refreshWeekend(true)} disabled={weekendLoading} style={s.refreshBtn}>
              {weekendLoading ? (
                <ActivityIndicator size="small" color={theme.accentInk} />
              ) : (
                <Text style={s.refreshIcon}>↻</Text>
              )}
            </TouchableOpacity>
          </View>
          {start && end ? (
            <View style={s.heroDates}>
              <View>
                <Text style={s.dateNum}>{start.getDate()}</Text>
                <Text style={s.dateMon}>
                  {start.getMonth() + 1}{lang === 'ko' ? '월 ' : '月 '}{dowLabel(start, lang)}
                </Text>
              </View>
              <Text style={s.heroDash}>—</Text>
              <View>
                <Text style={s.dateNum}>{end.getDate()}</Text>
                <Text style={s.dateMon}>
                  {end.getMonth() + 1}{lang === 'ko' ? '월 ' : '月 '}{dowLabel(end, lang)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={s.heroEmpty}>
              {weekendLoading
                ? (lang === 'ko' ? 'AI가 찾는 중...' : 'AI 正在搜索...')
                : t('noData', lang)}
            </Text>
          )}
          {weekendData && (
            <Text style={s.heroMeta}>
              {t('generatedAt', lang)} {new Date(weekendData.generatedAt).toLocaleString()}
            </Text>
          )}
        </LinearGradient>

        {/* AI 맞춤 추천 CTA */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/custom')} style={s.ctaWrap}>
          <LinearGradient
            colors={gradient.lavender}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.cta}
          >
            <View style={s.ctaIcon}>
              <Text style={s.ctaIconText}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ctaTitle}>{t('customCta', lang)}</Text>
              <Text style={s.ctaSub}>{t('customCtaSub', lang)}</Text>
            </View>
            <Text style={s.ctaArrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>

        {weekendData?.error && (
          <View style={s.errBox}>
            <Text style={s.errText}>⚠️ {weekendData.error}</Text>
          </View>
        )}

        {/* 날씨 */}
        <Section title={lang === 'ko' ? '매일 날씨' : '每日天气'} icon="🌤">
          {weekendData && weekendData.weather.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
              {weekendData.weather.map(w => (
                <View key={w.date} style={{ width: 140 }}>
                  <WeatherCard w={w} />
                </View>
              ))}
            </ScrollView>
          ) : weekendLoading ? (
            <Loading text={lang === 'ko' ? '날씨 가져오는 중...' : '获取天气中...'} />
          ) : (
            <Empty text={t('noData', lang)} />
          )}
        </Section>

        {/* 행사 */}
        <Section title={lang === 'ko' ? '이번 기간 행사' : '本期间活动'} icon="🎉">
          {weekendData && weekendData.events.length > 0 ? (
            <View style={{ gap: 10 }}>
              {weekendData.events.map((e, i) => (
                <EventCard key={i} e={e} />
              ))}
            </View>
          ) : weekendLoading ? (
            <Loading text={lang === 'ko' ? '행사 검색 중...' : '搜索活动中...'} />
          ) : (
            <Empty text={t('noEvents', lang)} />
          )}
        </Section>

        {/* AI 추천 코스 */}
        <Section title={lang === 'ko' ? '추천 코스' : '推荐路线'} icon="🌸">
          {weekendData && weekendData.recommendations.length > 0 ? (
            <View style={{ gap: 14 }}>
              {weekendData.recommendations.map((p, i) => {
                const key = `${p.nameKo}|${p.nameZh}`;
                const alreadySaved = savedTitles.has(`${p.nameKo} (${p.nameZh})`.toLowerCase());
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
          ) : weekendLoading ? (
            <Loading text={lang === 'ko' ? 'AI 검색 중... (10~20초)' : 'AI 搜索中...'} />
          ) : (
            <Empty text={t('noData', lang)} />
          )}
        </Section>

        {weekendData?.notes && (
          <Text style={s.notes}>📝 {weekendData.notes}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function dowLabel(d: Date, lang: 'ko' | 'zh'): string {
  const ko = ['일', '월', '화', '수', '목', '금', '토'];
  const zh = ['日', '一', '二', '三', '四', '五', '六'];
  return (lang === 'ko' ? ko : zh)[d.getDay()];
}

function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <View style={s.sectionHead}>
        {icon && <Text style={s.sectionIcon}>{icon}</Text>}
        <Text style={s.sectionTitle}>{title}</Text>
        <View style={s.sectionLine} />
      </View>
      {children}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <View style={s.loading}>
      <ActivityIndicator color={theme.accentDeep} />
      <Text style={s.loadingText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 4 },

  hero: {
    borderRadius: radius.xl,
    padding: 22,
    paddingBottom: 26,
    marginBottom: 18,
    ...shadow.md,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  heroEyebrow: {
    ...typography.section,
    color: theme.accentInk,
    opacity: 0.7,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: { fontSize: 18, color: theme.accentInk, fontWeight: '700' },
  heroDates: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  dateNum: {
    fontSize: 56,
    fontWeight: '800',
    color: theme.accentInk,
    lineHeight: 60,
    letterSpacing: -2,
  },
  dateMon: { ...typography.caption, color: theme.accentInk, opacity: 0.7, marginTop: -2 },
  heroDash: {
    fontSize: 32,
    color: theme.accentInk,
    opacity: 0.4,
    marginBottom: 10,
    fontWeight: '300',
  },
  heroEmpty: { fontSize: 16, color: theme.accentInk, opacity: 0.7 },
  heroMeta: { ...typography.micro, color: theme.accentInk, opacity: 0.55, marginTop: 14 },

  ctaWrap: { marginBottom: 22, borderRadius: radius.lg, ...shadow.glow },
  cta: {
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIconText: { fontSize: 22 },
  ctaTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 2 },
  ctaSub: { fontSize: 11, color: '#fff', opacity: 0.85 },
  ctaArrow: { fontSize: 26, color: '#fff', opacity: 0.7, fontWeight: '300' },

  errBox: {
    backgroundColor: '#fff0f0',
    borderColor: theme.bad,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  errText: { fontSize: 12, color: theme.badInk, fontWeight: '600' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { ...typography.h3, color: theme.text },
  sectionLine: { flex: 1, height: 1, backgroundColor: theme.borderSoft, marginLeft: 4 },

  empty: {
    backgroundColor: theme.cardSoft,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border,
    borderRadius: radius.md,
    padding: 20,
  },
  emptyText: { color: theme.textDim, fontSize: 13, textAlign: 'center' },
  loading: {
    backgroundColor: theme.cardSoft,
    borderRadius: radius.md,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 12, color: theme.textDim },
  notes: {
    fontSize: 11,
    color: theme.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
