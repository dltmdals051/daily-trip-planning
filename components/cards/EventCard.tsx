import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import type { EventItem } from '@/lib/types';
import { theme, shadow } from '@/lib/theme';

export function EventCard({ e }: { e: EventItem }) {
  return (
    <View style={s.card}>
      <Text style={s.meta}>
        {e.city} · {e.dateRange}
      </Text>
      <Text style={s.title}>{e.title}</Text>
      <Text style={s.summary}>{e.summary}</Text>
      {e.url && (
        <TouchableOpacity onPress={() => Linking.openURL(e.url!)}>
          <Text style={s.link}>→</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    ...shadow.sm,
  },
  meta: { fontSize: 12, color: theme.textDim },
  title: { fontSize: 15, fontWeight: '600', color: theme.text },
  summary: { fontSize: 13, color: theme.textDim },
  link: { fontSize: 12, color: theme.accentSoft, marginTop: 4 },
});
