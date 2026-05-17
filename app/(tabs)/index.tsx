import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { useLang, t } from '@/lib/i18n';
import { theme, shadow, gradient, radius, typography } from '@/lib/theme';
import { actorLabels } from '@/lib/people';
import { WeatherCard } from '@/components/cards/WeatherCard';
import { EventCard } from '@/components/cards/EventCard';
import { PlaceCard } from '@/components/cards/PlaceCard';

export default function WeekendScreen() {
  const lang = useLang(s => s.lang);
  const router = useRouter();
  const { places, weekly, votes, wishlist, profiles, me, loading, refresh, toggleVote, toggleWish } = useStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const placesById = Object.fromEntries(places.map(p => [p.id, p]));

  const wishConsensus = (() => {
    const byPlace = new Map<string, Set<string>>();
    for (const w of wishlist) {
      if (!byPlace.has(w.place_id)) byPlace.set(w.place_id, new Set());
      byPlace.get(w.place_id)!.add(w.user_id);
    }
    return Array.from(byPlace.entries())
      .filter(([, users]) => users.size >= 2)
      .map(([id]) => placesById[id])
      .filter(Boolean);
  })();

  const voteConsensus = weekly
    ? (() => {
        const byPlace = new Map<string, Set<string>>();
        for (const v of votes.filter(v => v.weekend_saturday === weekly.weekend_saturday)) {
          if (!byPlace.has(v.place_id)) byPlace.set(v.place_id, new Set());
          byPlace.get(v.place_id)!.add(v.user_id);
        }
        return Array.from(byPlace.entries())
          .filter(([, users]) => users.size >= 2)
          .map(([id]) => placesById[id])
          .filter(Boolean);
      })()
    : [];

  const sat = weekly ? new Date(weekly.weekend_saturday) : null;
  const sun = weekly ? new Date(weekly.weekend_sunday) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['left', 'right', 'top']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.text} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={gradient.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <Text style={s.heroEyebrow}>{lang === 'ko' ? '이번 주말' : '本周末'}</Text>
          {sat && sun ? (
            <View style={s.heroDates}>
              <View style={s.dateBlock}>
                <Text style={s.dateNum}>{sat.getDate()}</Text>
                <Text style={s.dateMon}>
                  {sat.getMonth() + 1}{lang === 'ko' ? '월 토' : '月 周六'}
                </Text>
              </View>
              <Text style={s.heroDash}>—</Text>
              <View style={s.dateBlock}>
                <Text style={s.dateNum}>{sun.getDate()}</Text>
                <Text style={s.dateMon}>
                  {sun.getMonth() + 1}{lang === 'ko' ? '월 일' : '月 周日'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={s.heroEmpty}>{t('noData', lang)}</Text>
          )}
          {weekly && (
            <Text style={s.heroMeta}>
              {t('generatedAt', lang)} · {new Date(weekly.generated_at).toLocaleDateString()}
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

        {/* 합의 박스 */}
        {(voteConsensus.length > 0 || wishConsensus.length > 0) && (
          <View style={s.consensusCard}>
            <View style={s.consensusHeader}>
              <Text style={s.consensusBadge}>둘 다 ❤️</Text>
            </View>
            {voteConsensus.length > 0 && (
              <View style={{ marginBottom: wishConsensus.length > 0 ? 14 : 0 }}>
                <Text style={s.consensusLabel}>🗳 {t('bothVotedTitle', lang)}</Text>
                <View style={s.pillRow}>
                  {voteConsensus.map(p => (
                    <View key={p.id} style={[s.pill, { backgroundColor: theme.accentDeep }]}>
                      <Text style={s.pillText}>{lang === 'ko' ? p.nameKo : p.nameZh}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {wishConsensus.length > 0 && (
              <View>
                <Text style={s.consensusLabel}>♥♥ {t('consensusTitle', lang)}</Text>
                <View style={s.pillRow}>
                  {wishConsensus.map(p => (
                    <View key={p.id} style={[s.pill, { backgroundColor: theme.goodDeep }]}>
                      <Text style={s.pillText}>{lang === 'ko' ? p.nameKo : p.nameZh}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <Section title={t('weatherTitle', lang)} icon="🌤">
          {weekly && weekly.weather.length > 0 ? (
            <View style={s.row}>
              {weekly.weather.map(w => (
                <WeatherCard key={w.date} w={w} />
              ))}
            </View>
          ) : (
            <Empty text={t('noData', lang)} />
          )}
        </Section>

        <Section title={t('eventsTitle', lang)} icon="🎉">
          {weekly && weekly.events.length > 0 ? (
            <View style={{ gap: 10 }}>
              {weekly.events.map((e, i) => (
                <EventCard key={i} e={e} />
              ))}
            </View>
          ) : (
            <Empty text={t('noEvents', lang)} />
          )}
        </Section>

        <Section title={t('recsTitle', lang)} icon="🌸">
          {weekly && weekly.recommendations.length > 0 ? (
            <View style={{ gap: 14 }}>
              {weekly.recommendations.map((r, i) => {
                const place = placesById[r.place_id];
                if (!place) return null;
                const placeVotes = votes.filter(
                  v => v.weekend_saturday === weekly.weekend_saturday && v.place_id === place.id,
                );
                const placeWish = wishlist.filter(w => w.place_id === place.id);
                return (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    rank={i + 1}
                    score={r.score}
                    reasons={r.reasons}
                    voteCount={placeVotes.length}
                    bothVote={placeVotes.length >= 2}
                    iVote={!!me && placeVotes.some(v => v.user_id === me)}
                    wishCount={placeWish.length}
                    bothWish={placeWish.length >= 2}
                    iWish={!!me && placeWish.some(w => w.user_id === me)}
                    onVote={() => toggleVote(place.id)}
                    onWish={() => toggleWish(place.id)}
                    wishActors={placeWish.length > 0 ? actorLabels(placeWish.map(w => w.user_id), profiles, me) : undefined}
                    voteActors={placeVotes.length > 0 ? actorLabels(placeVotes.map(v => v.user_id), profiles, me) : undefined}
                  />
                );
              })}
            </View>
          ) : (
            <Empty text={t('noData', lang)} />
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
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

const s = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 4 },

  hero: {
    borderRadius: radius.xl,
    padding: 22,
    paddingBottom: 26,
    marginBottom: 18,
    ...shadow.md,
  },
  heroEyebrow: {
    ...typography.section,
    color: theme.accentInk,
    opacity: 0.7,
    marginBottom: 10,
  },
  heroDates: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  dateBlock: {},
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

  consensusCard: {
    backgroundColor: theme.card,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    ...shadow.sm,
  },
  consensusHeader: { marginBottom: 14 },
  consensusBadge: {
    ...typography.section,
    color: theme.accentDeep,
    fontSize: 11,
  },
  consensusLabel: { ...typography.caption, color: theme.textDim, marginBottom: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pillText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { ...typography.h3, color: theme.text },
  sectionLine: { flex: 1, height: 1, backgroundColor: theme.borderSoft, marginLeft: 4 },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  empty: {
    backgroundColor: theme.cardSoft,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border,
    borderRadius: radius.md,
    padding: 20,
  },
  emptyText: { color: theme.textDim, fontSize: 13, textAlign: 'center' },
});
