import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import type { EventItem } from '@/lib/types';
import { theme, shadow, radius } from '@/lib/theme';

export function EventCard({ e }: { e: EventItem }) {
  const hasUrl = !!e.url;
  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={hasUrl ? 0.7 : 1}
      onPress={() => hasUrl && Linking.openURL(e.url!)}
    >
      <View style={s.left}>
        <Text style={s.cityBadge}>{e.city}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.title} numberOfLines={2}>
          {e.title}
        </Text>
        <Text style={s.date}>📅 {e.dateRange}</Text>
        {e.summary && (
          <Text style={s.summary} numberOfLines={2}>
            {e.summary}
          </Text>
        )}
      </View>
      {hasUrl && <Text style={s.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadow.xs,
  },
  left: { width: 56 },
  cityBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.accentDeep,
    backgroundColor: theme.cardSoft,
    borderWidth: 1,
    borderColor: theme.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    textAlign: 'center',
    overflow: 'hidden',
  },
  title: { fontSize: 14, fontWeight: '700', color: theme.text, lineHeight: 19 },
  date: { fontSize: 11, color: theme.textDim, fontWeight: '600' },
  summary: { fontSize: 12, color: theme.textDim, lineHeight: 17, marginTop: 2 },
  chevron: { fontSize: 24, color: theme.textDim, fontWeight: '300' },
});
