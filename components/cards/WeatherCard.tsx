import { View, Text, StyleSheet } from 'react-native';
import type { WeatherDay } from '@/lib/types';
import { theme, shadow, radius } from '@/lib/theme';
import { useLang, t } from '@/lib/i18n';

function weatherEmoji(desc: string, rain: number, isOutdoorFriendly: boolean): string {
  const d = (desc || '').toLowerCase();
  if (rain >= 70 || d.includes('rain') || d.includes('비')) return '🌧';
  if (d.includes('snow') || d.includes('눈')) return '❄️';
  if (d.includes('cloud') || d.includes('흐림') || d.includes('overcast')) return '☁️';
  if (d.includes('clear') || d.includes('맑')) return isOutdoorFriendly ? '☀️' : '🌤';
  if (d.includes('storm')) return '⛈';
  return '🌤';
}

export function WeatherCard({ w }: { w: WeatherDay }) {
  const lang = useLang(s => s.lang);
  const outdoor = w.isOutdoorFriendly;
  const accent = outdoor ? theme.good : w.rainChance >= 60 ? theme.bad : theme.warn;
  const accentSoft = outdoor ? theme.goodSoft : w.rainChance >= 60 ? '#fde0e2' : theme.warnSoft;
  const ink = outdoor ? theme.goodInk : w.rainChance >= 60 ? theme.badInk : theme.warnInk;
  const d = new Date(w.date);
  const emoji = weatherEmoji(w.description, w.rainChance, outdoor);

  return (
    <View style={[s.card, { backgroundColor: accentSoft }]}>
      <View style={s.headerRow}>
        <Text style={s.date}>
          {d.getMonth() + 1}/{d.getDate()} <Text style={{ color: ink, opacity: 0.7 }}>{w.dayOfWeek}</Text>
        </Text>
        <Text style={s.emoji}>{emoji}</Text>
      </View>
      <Text style={[s.temp, { color: ink }]}>
        {w.tempMin}° <Text style={{ opacity: 0.5 }}>—</Text> {w.tempMax}°
      </Text>
      <View style={s.footer}>
        <View style={[s.tag, { backgroundColor: accent }]}>
          <Text style={s.tagText}>{outdoor ? t('outdoorOk', lang) : t('indoorRec', lang)}</Text>
        </View>
        <Text style={[s.rain, { color: ink, opacity: 0.7 }]}>💧 {w.rainChance}%</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 16,
    flex: 1,
    minWidth: 150,
    gap: 8,
    ...shadow.sm,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, fontWeight: '700', color: theme.text },
  emoji: { fontSize: 28 },
  temp: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  rain: { fontSize: 11, fontWeight: '600' },
});
