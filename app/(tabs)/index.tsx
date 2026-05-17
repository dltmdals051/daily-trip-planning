import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { useLang, t } from '@/lib/i18n';
import { theme, shadow } from '@/lib/theme';
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

  // 합의 계산
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.text} />}
      >
        <View style={s.hero}>
          <Text style={s.h1}>{t('tabWeekend', lang)}</Text>
          <Text style={s.sub}>
            {weekly
              ? `${weekly.weekend_saturday} ~ ${weekly.weekend_sunday} · ${t('generatedAt', lang)} ${new Date(weekly.generated_at).toLocaleString()}`
              : t('noData', lang)}
          </Text>
        </View>

        <TouchableOpacity style={s.customCta} onPress={() => router.push('/custom')}>
          <Text style={s.customCtaText}>{t('customCta', lang)}</Text>
          <Text style={s.customCtaSub}>{t('customCtaSub', lang)}</Text>
        </TouchableOpacity>

        {(voteConsensus.length > 0 || wishConsensus.length > 0) && (
          <View style={s.consensusBox}>
            {voteConsensus.length > 0 && (
              <>
                <Text style={s.consensusTitle}>🗳 {t('bothVotedTitle', lang)}</Text>
                <View style={s.consensusRow}>
                  {voteConsensus.map(p => (
                    <View key={p.id} style={[s.consensusPill, { backgroundColor: theme.accent }]}>
                      <Text style={s.consensusPillText}>{lang === 'ko' ? p.nameKo : p.nameZh}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            {wishConsensus.length > 0 && (
              <>
                <Text style={[s.consensusTitle, { marginTop: voteConsensus.length > 0 ? 14 : 0 }]}>
                  ♥♥ {t('consensusTitle', lang)}
                </Text>
                <View style={s.consensusRow}>
                  {wishConsensus.map(p => (
                    <View key={p.id} style={[s.consensusPill, { backgroundColor: theme.goodDeep }]}>
                      <Text style={s.consensusPillText}>
                        {lang === 'ko' ? p.nameKo : p.nameZh}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <Section title={t('weatherTitle', lang)}>
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

        <Section title={t('eventsTitle', lang)}>
          {weekly && weekly.events.length > 0 ? (
            <View style={{ gap: 8 }}>
              {weekly.events.map((e, i) => (
                <EventCard key={i} e={e} />
              ))}
            </View>
          ) : (
            <Empty text={t('noEvents', lang)} />
          )}
        </Section>

        <Section title={t('recsTitle', lang)}>
          {weekly && weekly.recommendations.length > 0 ? (
            <View style={{ gap: 12 }}>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <Text style={s.h2}>{title}</Text>
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
  content: { padding: 16, paddingBottom: 80 },
  hero: { marginBottom: 24 },
  h1: { fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 4 },
  sub: { fontSize: 12, color: theme.textDim },
  h2: { fontSize: 13, fontWeight: '700', color: theme.accentDeep, marginBottom: 10, letterSpacing: 0.4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  empty: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border,
    borderRadius: 10,
    padding: 16,
  },
  emptyText: { color: theme.textDim, fontSize: 13, textAlign: 'center' },
  consensusBox: {
    backgroundColor: theme.cardSoft,
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    ...shadow.sm,
  },
  consensusTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.accentDeep,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  consensusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  consensusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  consensusPillText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  customCta: {
    backgroundColor: theme.cardSoft,
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 16,
    ...shadow.sm,
  },
  customCtaText: { fontSize: 15, fontWeight: '700', color: theme.accentDeep, marginBottom: 4 },
  customCtaSub: { fontSize: 11, color: theme.textDim },
});
