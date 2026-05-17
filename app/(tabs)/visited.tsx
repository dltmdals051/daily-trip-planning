import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { useLang, t, placeName } from '@/lib/i18n';
import { theme } from '@/lib/theme';

export default function VisitedScreen() {
  const lang = useLang(s => s.lang);
  const { places, visits, loading, refresh, deleteVisit } = useStore();

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
        <Text style={s.h1}>{t('tabVisited', lang)}</Text>

        {visits.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>{t('noData', lang)}</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {visits.map(v => {
              const place = placesById[v.place_id];
              if (!place) return null;
              return (
                <View key={v.id} style={s.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.name}>{placeName(place, lang)}</Text>
                      <Text style={s.meta}>
                        {v.visited_on} · {place.city}
                      </Text>
                      {v.rating !== null && v.rating !== undefined && (
                        <Text style={s.rating}>{'★'.repeat(v.rating)}{'☆'.repeat(5 - v.rating)}</Text>
                      )}
                      {v.memo && <Text style={s.memo}>{v.memo}</Text>}
                    </View>
                    <TouchableOpacity onPress={() => deleteVisit(v.id)}>
                      <Text style={s.del}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80 },
  h1: { fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 16 },
  empty: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border,
    borderRadius: 10,
    padding: 16,
  },
  emptyText: { color: theme.textDim, fontSize: 13, textAlign: 'center' },
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 14,
  },
  name: { fontSize: 15, fontWeight: '600', color: theme.text },
  meta: { fontSize: 12, color: theme.textDim, marginTop: 2 },
  rating: { fontSize: 14, color: theme.warn, marginTop: 6 },
  memo: { fontSize: 13, color: theme.text, marginTop: 6 },
  del: { fontSize: 22, color: theme.textDim, paddingHorizontal: 8 },
});
