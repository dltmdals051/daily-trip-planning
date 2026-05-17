import { Linking, Share, Platform } from 'react-native';
import type { Place } from './types';

const WUXI_LATLON = { lat: 31.4912, lng: 120.3119 };

/**
 * 高德 / 百度 지도 앱을 열어 검색. 좌표가 없는 장소도 검색어로 처리.
 * 1차: 高德 deep link → 2차: amap web URL (브라우저)
 */
export async function openDirections(place: Place): Promise<void> {
  const keyword = encodeURIComponent(place.nameZh);
  const fromName = encodeURIComponent('我的位置');
  const { lat, lng } = WUXI_LATLON;

  const amapApp =
    Platform.OS === 'ios'
      ? `iosamap://path?sourceApplication=wuxiweekend&sname=${fromName}&dname=${keyword}&dev=0&t=0`
      : `androidamap://route?sourceApplication=wuxiweekend&sname=${fromName}&dname=${keyword}&dev=0&t=0`;

  const amapWeb = `https://uri.amap.com/marker?position=${lng},${lat}&name=${keyword}&src=wuxiweekend&callnative=1`;
  const baiduWeb = `https://api.map.baidu.com/marker?location=${lat},${lng}&title=${keyword}&content=${keyword}&output=html`;

  try {
    const canOpen = await Linking.canOpenURL(amapApp);
    if (canOpen) {
      await Linking.openURL(amapApp);
      return;
    }
  } catch {
    // ignore
  }
  try {
    await Linking.openURL(amapWeb);
  } catch {
    await Linking.openURL(baiduWeb);
  }
}

/**
 * 위챗·카카오 등 시스템 공유 시트 호출.
 * 위챗은 텍스트 공유로 잡힘 (URL 포함하면 미리보기 카드 생성).
 */
export async function sharePlace(place: Place, langZh = false): Promise<void> {
  const name = langZh ? place.nameZh : `${place.nameKo} (${place.nameZh})`;
  const url = `https://uri.amap.com/marker?position=${WUXI_LATLON.lng},${WUXI_LATLON.lat}&name=${encodeURIComponent(place.nameZh)}`;
  const message = [
    `📍 ${name}`,
    `🏙 ${place.city} · 우시에서 ${place.travelMinutesFromWuxi}분`,
    place.notes,
    place.tips ? `💡 ${place.tips}` : '',
    url,
  ]
    .filter(Boolean)
    .join('\n\n');

  await Share.share({
    title: name,
    message,
    url, // iOS
  });
}
