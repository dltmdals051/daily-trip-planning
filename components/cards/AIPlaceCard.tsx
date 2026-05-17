import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Share, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { AIPlace } from '@/lib/types';
import { theme, shadow, radius, gradient } from '@/lib/theme';
import { useLang } from '@/lib/i18n';
import { sourceDomain } from '@/lib/aiRecommend';

const WUXI = { lat: 31.4912, lng: 120.3119 };

async function openAmap(p: AIPlace) {
  const keyword = encodeURIComponent(p.navigationKeyword || p.nameZh);
  const fromName = encodeURIComponent('我的位置');
  const appUrl =
    Platform.OS === 'ios'
      ? `iosamap://path?sourceApplication=wuxiweekend&sname=${fromName}&dname=${keyword}&dev=0&t=0`
      : `androidamap://route?sourceApplication=wuxiweekend&sname=${fromName}&dname=${keyword}&dev=0&t=0`;
  const webUrl = `https://uri.amap.com/marker?position=${WUXI.lng},${WUXI.lat}&name=${keyword}&src=wuxiweekend&callnative=1`;
  try {
    if (await Linking.canOpenURL(appUrl)) {
      await Linking.openURL(appUrl);
      return;
    }
  } catch {}
  Linking.openURL(webUrl).catch(() => {});
}

async function shareAI(p: AIPlace, langZh: boolean) {
  const name = langZh ? p.nameZh : `${p.nameKo} (${p.nameZh})`;
  const url = `https://uri.amap.com/marker?position=${WUXI.lng},${WUXI.lat}&name=${encodeURIComponent(p.nameZh)}`;
  const msg = [
    `📍 ${name}`,
    `🏙 ${p.city}` + (p.travelMinutesFromWuxi ? ` · 우시에서 ${p.travelMinutesFromWuxi}분` : ''),
    p.why,
    p.tips ? `💡 ${p.tips}` : '',
    p.sourceUrl ? `🔗 ${p.sourceUrl}` : '',
    url,
  ]
    .filter(Boolean)
    .join('\n\n');
  await Share.share({ title: name, message: msg, url });
}

type Props = {
  place: AIPlace;
  rank?: number;
  onSave?: () => void;
  saved?: boolean;
};

export function AIPlaceCard({ place, rank, onSave, saved }: Props) {
  const lang = useLang(s => s.lang);
  const [imgFailed, setImgFailed] = useState(false);
  const displayName = lang === 'ko' ? place.nameKo : place.nameZh;
  const subName = lang === 'ko' ? place.nameZh : place.nameKo;
  const source = sourceDomain(place.sourceUrl);
  const showImage = place.imageUrl && !imgFailed;

  return (
    <View style={s.card}>
      {showImage ? (
        <View style={s.heroWrap}>
          <Image
            source={{ uri: place.imageUrl! }}
            style={s.hero}
            onError={() => setImgFailed(true)}
            resizeMode="cover"
          />
          {rank !== undefined && (
            <LinearGradient
              colors={gradient.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.heroRank}
            >
              <Text style={s.heroRankText}>#{rank}</Text>
            </LinearGradient>
          )}
        </View>
      ) : (
        <LinearGradient
          colors={gradient.accentSoft}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroPlaceholder}
        >
          {rank !== undefined && (
            <LinearGradient
              colors={gradient.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.heroRank}
            >
              <Text style={s.heroRankText}>#{rank}</Text>
            </LinearGradient>
          )}
          <Text style={s.placeholderEmoji}>{categoryEmoji(place.category)}</Text>
        </LinearGradient>
      )}

      <View style={s.body}>
        <View style={s.tagRow}>
          <View style={s.aiBadge}>
            <Text style={s.aiBadgeText}>🤖 AI</Text>
          </View>
          {source && (
            <View style={s.sourceBadge}>
              <Text style={s.sourceBadgeText}>{source}</Text>
            </View>
          )}
          <View style={s.categoryBadge}>
            <Text style={s.categoryBadgeText}>{place.category}</Text>
          </View>
        </View>

        <Text style={s.name}>{displayName}</Text>
        <Text style={s.sub}>
          {subName}
          <Text style={{ color: theme.textDim }}>  ·  {place.city}</Text>
        </Text>

        <View style={s.metaRow}>
          {place.travelMinutesFromWuxi !== undefined && (
            <Meta icon="🚗" label={`${place.travelMinutesFromWuxi}${lang === 'ko' ? '분' : '分'}`} />
          )}
          {place.estimatedCost && <Meta icon="💰" label={place.estimatedCost} />}
          {place.suggestedHours && (
            <Meta icon="⏱" label={`${place.suggestedHours[0]}~${place.suggestedHours[1]}${lang === 'ko' ? 'h' : '小时'}`} />
          )}
        </View>

        <Text style={s.why}>{place.why}</Text>

        {place.tips && (
          <View style={s.tipBox}>
            <Text style={s.tipText}>💡 {place.tips}</Text>
          </View>
        )}

        <View style={s.actionRow}>
          <ActionBtn label={`🧭 ${lang === 'ko' ? '길찾기' : '导航'}`} onPress={() => openAmap(place)} />
          <ActionBtn label={`↗ ${lang === 'ko' ? '공유' : '分享'}`} onPress={() => shareAI(place, lang === 'zh')} />
          {place.sourceUrl && (
            <ActionBtn
              label={`🔗 ${source ?? (lang === 'ko' ? '출처' : '来源')}`}
              onPress={() => Linking.openURL(place.sourceUrl!).catch(() => {})}
            />
          )}
          {onSave && (
            <ActionBtn
              label={saved
                ? (lang === 'ko' ? '✓ 저장됨' : '✓ 已保存')
                : (lang === 'ko' ? '🔖 발견에 저장' : '🔖 保存')}
              onPress={onSave}
              on={saved}
              disabled={saved}
              good
            />
          )}
        </View>
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
  good,
  disabled,
}: {
  label: string;
  onPress: () => void;
  on?: boolean;
  good?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.action, on && (good ? s.actionOnGood : s.actionOn)]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <Text style={[s.actionText, on && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function categoryEmoji(category?: string): string {
  switch (category) {
    case 'nature':
    case 'park':
      return '🌳';
    case 'culture':
    case 'museum':
    case 'temple':
      return '🏯';
    case 'food':
      return '🍜';
    case 'shopping':
      return '🛍';
    case 'date':
      return '💕';
    case 'ancient-town':
      return '🏘';
    case 'theme-park':
      return '🎢';
    case 'water-town':
      return '🛶';
    default:
      return '✨';
  }
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.sm,
  },
  heroWrap: { position: 'relative' },
  hero: {
    width: '100%',
    height: 180,
    backgroundColor: theme.cardSoft,
  },
  heroPlaceholder: {
    width: '100%',
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  placeholderEmoji: { fontSize: 56, opacity: 0.55 },
  heroRank: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    ...shadow.sm,
  },
  heroRankText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

  body: { padding: 16, gap: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  aiBadge: {
    backgroundColor: theme.lavender,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  aiBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  sourceBadge: {
    backgroundColor: theme.goodSoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sourceBadgeText: { color: theme.goodInk, fontSize: 10, fontWeight: '800' },
  categoryBadge: {
    backgroundColor: theme.cardSoft,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryBadgeText: { color: theme.textDim, fontSize: 10, fontWeight: '700' },

  name: { fontSize: 18, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
  sub: { fontSize: 13, color: theme.text, fontWeight: '500' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
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

  why: { fontSize: 13, color: theme.text, lineHeight: 19, marginTop: 4 },
  tipBox: {
    backgroundColor: '#fff8ea',
    borderRadius: radius.md,
    padding: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.warn,
  },
  tipText: { fontSize: 12, color: theme.warnInk, lineHeight: 17, fontWeight: '500' },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  action: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.card,
  },
  actionOn: { backgroundColor: theme.accentDeep, borderColor: theme.accentDeep },
  actionOnGood: { backgroundColor: theme.goodDeep, borderColor: theme.goodDeep },
  actionText: { fontSize: 11, color: theme.text, fontWeight: '600' },
});
