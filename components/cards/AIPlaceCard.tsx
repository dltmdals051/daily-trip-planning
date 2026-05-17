import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Share, Image } from 'react-native';
import type { AIPlace } from '@/lib/types';
import { theme, shadow } from '@/lib/theme';
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
      {showImage && (
        <Image
          source={{ uri: place.imageUrl! }}
          style={s.hero}
          onError={() => setImgFailed(true)}
          resizeMode="cover"
        />
      )}
      <View style={s.body}>
        <View style={s.headerRow}>
          {rank !== undefined && (
            <View style={s.rankPill}>
              <Text style={s.rankText}>#{rank}</Text>
            </View>
          )}
          <View style={s.aiPill}>
            <Text style={s.aiPillText}>🤖 AI 검색</Text>
          </View>
          {source && (
            <View style={s.sourcePill}>
              <Text style={s.sourcePillText}>{source}</Text>
            </View>
          )}
        </View>

        <Text style={s.name}>{displayName}</Text>
        <Text style={s.sub}>
          {subName} · {place.city}
        </Text>

        <View style={s.metaRow}>
          {place.travelMinutesFromWuxi !== undefined && (
            <Text style={s.metaPill}>
              🚗 {place.travelMinutesFromWuxi}{lang === 'ko' ? '분' : '分钟'}
            </Text>
          )}
          {place.estimatedCost && <Text style={s.metaPill}>💰 {place.estimatedCost}</Text>}
          {place.suggestedHours && (
            <Text style={s.metaPill}>
              ⏱ {place.suggestedHours[0]}~{place.suggestedHours[1]}
              {lang === 'ko' ? '시간' : '小时'}
            </Text>
          )}
          <Text style={s.metaPill}>{place.category}</Text>
        </View>

        <Text style={s.why}>{place.why}</Text>

        {place.tips && (
          <View style={s.tipBox}>
            <Text style={s.tipText}>💡 {place.tips}</Text>
          </View>
        )}

        <View style={s.actionRow}>
          <TouchableOpacity style={s.action} onPress={() => openAmap(place)}>
            <Text style={s.actionText}>🧭 {lang === 'ko' ? '길찾기' : '导航'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.action} onPress={() => shareAI(place, lang === 'zh')}>
            <Text style={s.actionText}>↗ {lang === 'ko' ? '공유' : '分享'}</Text>
          </TouchableOpacity>
          {place.sourceUrl && (
            <TouchableOpacity style={s.action} onPress={() => Linking.openURL(place.sourceUrl!).catch(() => {})}>
              <Text style={s.actionText}>🔗 {source ?? (lang === 'ko' ? '출처' : '来源')}</Text>
            </TouchableOpacity>
          )}
          {onSave && (
            <TouchableOpacity style={[s.action, saved && s.actionOn]} onPress={onSave} disabled={saved}>
              <Text style={[s.actionText, saved && { color: '#fff' }]}>
                {saved ? '✓ ' : '🔖 '}
                {lang === 'ko' ? (saved ? '저장됨' : '발견에 저장') : (saved ? '已保存' : '保存到发现')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
    overflow: 'hidden',
    ...shadow.sm,
  },
  hero: {
    width: '100%',
    height: 180,
    backgroundColor: theme.cardSoft,
  },
  body: { padding: 16, gap: 8 },
  headerRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  rankPill: {
    backgroundColor: theme.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rankText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  aiPill: {
    backgroundColor: theme.lavender,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  aiPillText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  sourcePill: {
    backgroundColor: theme.good,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sourcePillText: { color: theme.goodInk, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  name: { fontSize: 16, fontWeight: '700', color: theme.text },
  sub: { fontSize: 13, color: theme.textDim },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
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
  why: { fontSize: 13, color: theme.text, lineHeight: 19, marginTop: 4 },
  tipBox: {
    backgroundColor: '#fff8ea',
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 10,
  },
  tipText: { fontSize: 12, color: theme.warnInk, lineHeight: 17 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  action: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  actionOn: { backgroundColor: theme.good, borderColor: theme.good },
  actionText: { fontSize: 11, color: theme.text, fontWeight: '500' },
});
