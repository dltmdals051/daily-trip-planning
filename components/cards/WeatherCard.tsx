import { View, Text, StyleSheet } from 'react-native';
import type { WeatherDay } from '@/lib/types';
import { theme } from '@/lib/theme';
import { useLang, t } from '@/lib/i18n';

export function WeatherCard({ w }: { w: WeatherDay }) {
  const lang = useLang(s => s.lang);
  const borderColor = w.isOutdoorFriendly ? theme.good : w.rainChance >= 60 ? theme.bad : theme.border;
  const d = new Date(w.date);
  return (
    <View style={[s.card, { borderColor }]}>
      <Text style={s.date}>
        {d.getMonth() + 1}/{d.getDate()} ({w.dayOfWeek})
      </Text>
      <Text style={s.temp}>
        {w.tempMin}° / {w.tempMax}°
      </Text>
      <Text style={s.desc}>{w.description}</Text>
      <Text style={s.rain}>
        {t('rainProb', lang)} {w.rainChance}% · {w.isOutdoorFriendly ? t('outdoorOk', lang) : t('indoorRec', lang)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flex: 1,
    minWidth: 150,
  },
  date: { fontSize: 13, color: theme.textDim },
  temp: { fontSize: 22, fontWeight: '600', color: theme.text, marginVertical: 4 },
  desc: { fontSize: 14, color: theme.text },
  rain: { fontSize: 12, color: theme.textDim, marginTop: 6 },
});
