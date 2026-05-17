import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Place } from '@/lib/types';
import { theme, shadow } from '@/lib/theme';
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
          <View style={[s.rankPill, { backgroundColor: theme.goodDeep }]}>
            <Text style={s.rankText}>♥♥ {t('wantedByBoth', lang)}</Text>
          </View>
        )}
        {bothVote && (
          <View style={[s.rankPill, { backgroundColor: theme.accentDeep }]}>
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
          <Text style={[s.metaPill, { backgroundColor: theme.good, color: theme.goodInk, borderColor: theme.good }]}>✓ ×{visitCount}</Text>
        )}
      </View>

      <Text style={s.notes}>{place.notes}</Text>
      {place.tips && (
        <View style={s.tipBox}>
          <Text style={s.tipText}>💡 {place.tips}</Text>
        </View>
      )}

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
    borderRadius: 16,
    padding: 16,
    gap: 8,
    ...shadow.sm,
  },
  headerRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rankPill: {
    backgroundColor: theme.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rankText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  nameMain: { fontSize: 16, fontWeight: '700', color: theme.text },
  nameSub: { fontSize: 13, color: theme.textDim },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metaPill: {
    backgroundColor: theme.cardSoft,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 10,
    color: theme.textDim,
    fontWeight: '500',
    overflow: 'hidden',
  },
  notes: { fontSize: 13, color: theme.text, lineHeight: 19 },
  reasons: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    borderStyle: 'dashed',
    paddingTop: 8,
  },
  reasonText: { fontSize: 12, color: theme.textDim, lineHeight: 17 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  action: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  actionOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  actionText: { fontSize: 11, color: theme.text, fontWeight: '500' },
  tipBox: {
    backgroundColor: '#fff8ea',
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  tipText: { fontSize: 12, color: theme.warnInk, lineHeight: 17 },
});
