import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Place } from '@/lib/types';
import { theme, shadow, radius, gradient } from '@/lib/theme';
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
  wishActors?: string;
  voteActors?: string;
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
  wishActors,
  voteActors,
}: Props) {
  const lang = useLang(s => s.lang);
  return (
    <View style={[s.card, bothVote && s.cardConsensus]}>
      {/* Top stripe with rank + status badges */}
      <View style={s.topRow}>
        {rank !== undefined && (
          <LinearGradient
            colors={gradient.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.rankBadge}
          >
            <Text style={s.rankNum}>#{rank}</Text>
            {score !== undefined && <Text style={s.rankScore}>{score.toFixed(1)}</Text>}
          </LinearGradient>
        )}
        <View style={{ flex: 1 }} />
        {bothVote && (
          <View style={[s.statusPill, { backgroundColor: theme.accentDeep }]}>
            <Text style={s.statusText}>🗳 합의</Text>
          </View>
        )}
        {bothWish && (
          <View style={[s.statusPill, { backgroundColor: theme.goodDeep }]}>
            <Text style={s.statusText}>♥♥</Text>
          </View>
        )}
        {visitCount !== undefined && visitCount > 0 && (
          <View style={[s.statusPill, { backgroundColor: theme.good }]}>
            <Text style={[s.statusText, { color: theme.goodInk }]}>✓ ×{visitCount}</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={s.nameMain}>{placeName(place, lang)}</Text>
      <Text style={s.nameSub}>
        {lang === 'ko' ? place.nameZh : place.nameKo}
        <Text style={{ color: theme.textDim }}>  ·  {place.city}</Text>
      </Text>

      {/* Meta row — emoji-led for scanability */}
      <View style={s.metaRow}>
        <Meta icon="🚗" label={`${place.travelMinutesFromWuxi}${t('minutes', lang)}`} />
        <Meta icon="⏱" label={`${place.durationHours[0]}~${place.durationHours[1]}${t('hours', lang)}`} />
        <Meta icon="💰" label={place.cost} />
        <Meta icon="💕" label={`${place.dateScore}/10`} />
      </View>

      {/* Notes */}
      <Text style={s.notes}>{place.notes}</Text>
      {place.tips && (
        <View style={s.tipBox}>
          <Text style={s.tipText}>💡 {place.tips}</Text>
        </View>
      )}

      {/* Reasons */}
      {reasons && reasons.length > 0 && (
        <View style={s.reasons}>
          {reasons.map((r, i) => (
            <Text key={i} style={s.reasonText}>
              · {r}
            </Text>
          ))}
        </View>
      )}

      {/* Actors */}
      {(wishActors || voteActors) && (
        <Text style={s.actors}>
          {wishActors ? `♥ ${wishActors}` : ''}
          {wishActors && voteActors ? '   ·   ' : ''}
          {voteActors ? `🗳 ${voteActors}` : ''}
        </Text>
      )}

      {/* Action row */}
      <View style={s.actionRow}>
        {onWish && (
          <ActionBtn
            label={`${iWish ? '♥' : '♡'} ${t('wantToGo', lang)}${wishCount ? `(${wishCount})` : ''}`}
            on={!!iWish}
            onPress={onWish}
            primary
          />
        )}
        {onVote && (
          <ActionBtn
            label={`${iVote ? '✓ ' : ''}${t('vote', lang)}${voteCount ? `(${voteCount})` : ''}`}
            on={!!iVote}
            onPress={onVote}
            primary
          />
        )}
        {onMarkVisited && <ActionBtn label={`+ ${t('markVisited', lang)}`} onPress={onMarkVisited} />}
        <ActionBtn label={`🧭 ${lang === 'ko' ? '길찾기' : '导航'}`} onPress={() => openDirections(place)} />
        <ActionBtn label={`↗ ${lang === 'ko' ? '공유' : '分享'}`} onPress={() => sharePlace(place, lang === 'zh')} />
      </View>
    </View>
  );
}

function Meta({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.metaPill}>
      <Text style={s.metaIcon}>{icon}</Text>
      <Text style={s.metaText}>{label}</Text>
    </View>
  );
}

function ActionBtn({
  label,
  onPress,
  on,
  primary,
}: {
  label: string;
  onPress: () => void;
  on?: boolean;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.action, on && (primary ? s.actionOnPrimary : s.actionOn)]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[s.actionText, on && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    borderRadius: radius.lg,
    padding: 18,
    gap: 10,
    ...shadow.sm,
  },
  cardConsensus: {
    borderColor: theme.accent,
    borderWidth: 1.5,
    ...shadow.glow,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankNum: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  rankScore: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  nameMain: { fontSize: 18, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
  nameSub: { fontSize: 13, color: theme.text, fontWeight: '500' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  metaIcon: { fontSize: 11 },
  metaText: { fontSize: 11, color: theme.text, fontWeight: '600' },
  notes: { fontSize: 13, color: theme.text, lineHeight: 19, marginTop: 4 },
  tipBox: {
    backgroundColor: '#fff8ea',
    borderRadius: radius.md,
    padding: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.warn,
  },
  tipText: { fontSize: 12, color: theme.warnInk, lineHeight: 17, fontWeight: '500' },
  reasons: {
    borderTopWidth: 1,
    borderTopColor: theme.borderSoft,
    borderStyle: 'dashed',
    paddingTop: 8,
    gap: 2,
  },
  reasonText: { fontSize: 11, color: theme.textDim, lineHeight: 16 },
  actors: { fontSize: 11, color: theme.textDim, fontWeight: '500' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  action: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.card,
  },
  actionOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  actionOnPrimary: { backgroundColor: theme.accentDeep, borderColor: theme.accentDeep },
  actionText: { fontSize: 11, color: theme.text, fontWeight: '600' },
});
