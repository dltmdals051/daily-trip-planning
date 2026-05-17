import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Place } from '@/lib/types';
import { theme } from '@/lib/theme';
import { useLang, t, placeName } from '@/lib/i18n';
import { openDirections, sharePlace } from '@/lib/share';

type Props = {
  place: Place;
  rank?: number;
  score?: number;
  reasons?: string[];
  wishCount?: number;
  bothWish?: boolean;
  voteCount?: number;
  bothVote?: boolean;
  iVote?: boolean;
  iWish?: boolean;
  onWish?: () => void;
  onVote?: () => void;
  onMarkVisited?: () => void;
  visitCount?: number;
};

export function PlaceCard({
  place,
  rank,
  score,
  reasons,
  wishCount,
  bothWish,
  voteCount,
  bothVote,
  iVote,
  iWish,
  onWish,
  onVote,
  onMarkVisited,
  visitCount,
}: Props) {
  const lang = useLang(s => s.lang);
  return (
    <View style={[s.card, bothVote && { borderColor: theme.accent }]}>
      <View style={s.headerRow}>
        {rank !== undefined && (
          <View style={s.rankPill}>
            <Text style={s.rankText}>
              #{rank} · {score?.toFixed(1)}
            </Text>
          </View>
        )}
        {bothWish && (
          <View style={[s.rankPill, { backgroundColor: theme.good }]}>
            <Text style={s.rankText}>♥♥ {t('wantedByBoth', lang)}</Text>
          </View>
        )}
        {bothVote && (
          <View style={[s.rankPill, { backgroundColor: theme.accent }]}>
            <Text style={s.rankText}>🗳 합의</Text>
          </View>
        )}
      </View>

      <Text style={s.nameMain}>{placeName(place, lang)}</Text>
      <Text style={s.nameSub}>
        {lang === 'ko' ? place.nameZh : place.nameKo} · {place.city}
      </Text>

      <View style={s.metaRow}>
        <Text style={s.metaPill}>
          {t('travelTime', lang)} {place.travelMinutesFromWuxi}
          {t('minutes', lang)}
        </Text>
        <Text style={s.metaPill}>
          {place.durationHours[0]}~{place.durationHours[1]}
          {t('hours', lang)}
        </Text>
        <Text style={s.metaPill}>{place.cost}</Text>
        <Text style={s.metaPill}>
          {t('date', lang)} {place.dateScore}/10
        </Text>
        {visitCount !== undefined && visitCount > 0 && (
          <Text style={[s.metaPill, { backgroundColor: theme.good, color: '#000' }]}>✓ ×{visitCount}</Text>
        )}
      </View>

      <Text style={s.notes}>{place.notes}</Text>
      {place.tips && <Text style={[s.notes, { color: theme.accentSoft }]}>💡 {place.tips}</Text>}

      {reasons && reasons.length > 0 && (
        <View style={s.reasons}>
          {reasons.map((r, i) => (
            <Text key={i} style={s.reasonText}>
              · {r}
            </Text>
          ))}
        </View>
      )}

      <View style={s.actionRow}>
        {onWish && (
          <TouchableOpacity style={[s.action, iWish && s.actionOn]} onPress={onWish}>
            <Text style={[s.actionText, iWish && { color: '#fff' }]}>
              {iWish ? '♥' : '♡'} {t('wantToGo', lang)} {wishCount ? `(${wishCount})` : ''}
            </Text>
          </TouchableOpacity>
        )}
        {onVote && (
          <TouchableOpacity style={[s.action, iVote && s.actionOn]} onPress={onVote}>
            <Text style={[s.actionText, iVote && { color: '#fff' }]}>
              {iVote ? '✓ ' : ''}
              {t('vote', lang)} {voteCount ? `(${voteCount})` : ''}
            </Text>
          </TouchableOpacity>
        )}
        {onMarkVisited && (
          <TouchableOpacity style={s.action} onPress={onMarkVisited}>
            <Text style={s.actionText}>+ {t('markVisited', lang)}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.action} onPress={() => openDirections(place)}>
          <Text style={s.actionText}>🧭 {lang === 'ko' ? '길찾기' : '导航'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.action} onPress={() => sharePlace(place, lang === 'zh')}>
          <Text style={s.actionText}>↗ {lang === 'ko' ? '공유' : '分享'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  headerRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rankPill: {
    backgroundColor: theme.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  rankText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  nameMain: { fontSize: 16, fontWeight: '700', color: theme.text },
  nameSub: { fontSize: 13, color: theme.textDim },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaPill: {
    backgroundColor: theme.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 11,
    color: theme.textDim,
  },
  notes: { fontSize: 13, color: theme.text },
  reasons: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    borderStyle: 'dashed',
    paddingTop: 8,
  },
  reasonText: { fontSize: 12, color: theme.textDim },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  action: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  actionOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  actionText: { fontSize: 12, color: theme.text },
});
