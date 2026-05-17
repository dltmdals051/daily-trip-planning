import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { useLang, t } from '@/lib/i18n';
import { theme } from '@/lib/theme';
import { WeatherCard } from '@/components/cards/WeatherCard';
import { EventCard } from '@/components/cards/EventCard';
import { PlaceCard } from '@/components/cards/PlaceCard';
import { supabase } from '@/lib/supabase';

export default function WeekendScreen() {
  const lang = useLang(s => s.lang);
  const { places, weekly, votes, wishlist, loading, refresh, toggleVote, toggleWish } = useStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const placesById = Object.fromEntries(places.map(p => [p.id, p]));

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
                const me = supabaseUserIdSync();
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

let _cachedUid: string | null = null;
supabase.auth.getUser().then(({ data }) => {
  _cachedUid = data.user?.id ?? null;
});
supabase.auth.onAuthStateChange((_e, session) => {
  _cachedUid = session?.user.id ?? null;
});
function supabaseUserIdSync(): string | null {
  return _cachedUid;
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80 },
  hero: { marginBottom: 24 },
  h1: { fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 4 },
  sub: { fontSize: 12, color: theme.textDim },
  h2: { fontSize: 16, fontWeight: '600', color: theme.accentSoft, marginBottom: 10 },
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
});
