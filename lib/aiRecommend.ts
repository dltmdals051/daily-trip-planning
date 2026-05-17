import { GoogleGenAI } from '@google/genai';
import type { AIPlace, AIRecommendResponse, CustomFilters } from './types';

const SYSTEM = `너는 중국 우시(无锡)에 사는 한국인 + 산동 출신 여자친구 커플을 위한 주말 여행지 큐레이터다.
사용자가 준 필터에 맞는 실제 갈만한 장소를 Google Search로 검증해서 JSON으로 추천한다.

원칙:
- 실재하는 장소만. 가짜 이름·작년에만 있던 한정 행사 등 제외.
- 우시 + 강소성(苏州/南京/常州/扬州/镇江) + 상하이/항저우 범위 위주.
- 우시에서 차/고속철로 갈 수 있는 거리만 (편도 3시간 이내).
- 같은 곳 중복 X.
- 8~10개 추천. 필터에 맞는 게 적으면 6~7개도 OK.
- 한국어/중국어 이름 둘 다 정확히. 中文名은 현지 표기 그대로 (例: 拈花湾).
- 데이트 코스 적합도 우선.
- 너무 흔한 곳(태호광장 등)만 나열하지 말고 숨은 곳 1~2개 섞기.

출처 우선순위 (sourceUrl 채울 때):
1. 小红书 (xiaohongshu.com) — 실제 후기, 사진 많음
2. 携程 (ctrip.com / trip.com) — 영업시간, 입장료 정확
3. 大众点评 (dianping.com) — 평점, 메뉴
4. 马蜂窝 (mafengwo.cn) — 여행기
5. 官方 사이트, 위키피디아, 百度百科

이미지 우선순위 (imageUrl 채울 때):
1. Wikipedia/Wikimedia Commons 이미지 (upload.wikimedia.org)
2. 百度百科 이미지 (bkimg.cdn.bcebos.com)
3. 官方 사이트 메인 이미지
4. 위 사이트들에서 직접 hot-link 가능한 .jpg/.png/.webp URL
- 인스타그램, 페이스북 등 SNS 이미지 X (hot-link 차단)
- 작은 썸네일보다 풍경/대표 이미지 선호`;

function buildPrompt(f: CustomFilters, recentNames: string[]): string {
  const lines: string[] = ['# 이번 추천에 적용할 필터'];
  if (f.cities.length > 0) lines.push(`- 도시 한정: ${f.cities.join(', ')}`);
  else lines.push('- 도시: 우시 우선, 근교 (苏州·南京·常州·扬州·镇江·上海·杭州) 포함');
  if (f.categories.length > 0) lines.push(`- 카테고리: ${f.categories.join(', ')}`);
  if (f.costs.length > 0) lines.push(`- 예산: ${f.costs.join(', ')} (free=무료, cheap=100元↓, medium=100~300元, expensive=300元↑)`);
  if (f.maxTravelMinutes) lines.push(`- 우시 기준 편도 ${f.maxTravelMinutes}분 이내`);
  if (f.weather === 'indoor') lines.push('- 실내 위주 (비/추위/폭염 대비)');
  else if (f.weather === 'outdoor') lines.push('- 야외 위주 (산책, 야경, 자연)');
  if (f.minDateScore > 0) lines.push(`- 데이트 점수 ${f.minDateScore}/10 이상 (분위기, 사진, 둘이 천천히 즐길 수 있는 곳)`);
  if (f.startDate) lines.push(`- 방문 예정일: ${f.startDate} (그날 영업/날씨 고려)`);
  if (recentNames.length > 0) lines.push(`- 최근 30일 다녀와서 제외할 곳: ${recentNames.join(', ')}`);

  return `${lines.join('\n')}

# 출력 (raw JSON only, 코드펜스/설명 금지)
{
  "places": [
    {
      "nameKo": "한국어 이름",
      "nameZh": "中文名 (현지 표기)",
      "city": "无锡|苏州|南京|常州|扬州|镇江|上海|杭州 중 하나",
      "category": "nature|culture|food|shopping|date|ancient-town|museum|park|temple|theme-park|water-town 중 하나",
      "travelMinutesFromWuxi": 60,
      "why": "왜 이번 필터에 맞는지 한국어 1~2줄. 구체적 포인트.",
      "estimatedCost": "무료 | 50元 이하 | 100元 이하 | 100-300元 | 300元+",
      "suggestedHours": [최소시간, 최대시간],
      "navigationKeyword": "高德地图 검색어 (中文)",
      "sourceUrl": "https://www.xiaohongshu.com/... 또는 https://you.ctrip.com/... 우선",
      "imageUrl": "https://upload.wikimedia.org/... 또는 직접 hot-link 가능한 풍경 사진 URL",
      "tips": "현지인이 알려주는 팁 (선택, 한 줄)"
    }
  ],
  "notes": "검색 신뢰도 / 빠진 카테고리 메모 (선택)"
}

규칙:
- 최대 10개. 필터에 안 맞으면 적게.
- city 필드는 위 enum.
- travelMinutesFromWuxi 는 실제 기차/차 시간 기준 추정값.
- sourceUrl 비울 거면 빈 문자열 말고 키 자체 생략.
- **imageUrl 은 가능하면 무조건 채워라.** 검색에서 본 풍경 사진을 hot-link 가능한 형태로:
  - upload.wikimedia.org/wikipedia/commons/... (최우선, 거의 모든 유명 명소 있음)
  - bkimg.cdn.bcebos.com/pic/... (百度百科)
  - img.lvmama.com / dimg04.c-ctrip.com / 携程·携程 CDN
  - 公式 관광청 사이트의 .jpg/.png
  - 확실히 못 찾으면 imageUrl 자체를 생략 (앱이 위키피디아로 자동 보충함).`;
}

export async function aiRecommend(
  filters: CustomFilters,
  recentVisitNames: string[],
): Promise<AIRecommendResponse> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return { places: [], error: 'EXPO_PUBLIC_GEMINI_API_KEY 가 설정 안 됨. GitHub Secrets 확인.' };
  }

  const ai = new GoogleGenAI({ apiKey });
  let text = '';
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildPrompt(filters, recentVisitNames),
      config: {
        systemInstruction: SYSTEM,
        tools: [{ googleSearch: {} }],
        temperature: 0.4,
      },
    });
    text = (response.text ?? '').trim();
  } catch (e) {
    return { places: [], error: `Gemini 호출 실패: ${(e as Error).message}` };
  }

  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) {
    return { places: [], notes: 'parse failed', rawPreview: text.slice(0, 300) };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch (e) {
    return { places: [], notes: `json parse error: ${(e as Error).message}`, rawPreview: text.slice(0, 300) };
  }

  let places: AIPlace[] = Array.isArray(parsed.places) ? parsed.places : [];

  // Gemini 가 imageUrl 안 채워준 곳은 위키피디아 zh 에서 썸네일 보충
  places = await Promise.all(places.map(enrichWithWikiImage));

  return { places, notes: parsed.notes ?? null };
}

async function enrichWithWikiImage(p: AIPlace): Promise<AIPlace> {
  // 항상 Wiki/Commons 부터 시도 (Gemini 의 imageUrl 은 자주 broken/hot-link 차단).
  // 셋 다 실패해야 Gemini 가 준 거 fallback 으로.
  let img: string | undefined;
  let stage = '';

  img = await fetchWikiImage(p.nameZh);
  if (img) stage = 'wiki';

  if (!img) {
    img = await fetchPageImagesThumb(p.nameZh);
    if (img) stage = 'pageimages';
  }
  if (!img) {
    img = await fetchCommonsImage(`${p.nameZh} ${p.city}`);
    if (img) stage = 'commons-city';
  }
  if (!img) {
    img = await fetchCommonsImage(p.nameZh);
    if (img) stage = 'commons-only';
  }
  if (!img && p.imageUrl) {
    img = p.imageUrl;
    stage = 'gemini';
  }

  if (typeof window !== 'undefined') {
    console.log(`[image] ${p.nameZh} → ${stage || 'NONE'}:`, img);
  }
  return img ? { ...p, imageUrl: img } : { ...p, imageUrl: undefined };
}

async function fetchPageImagesThumb(title: string): Promise<string | undefined> {
  if (!title) return undefined;
  try {
    const url =
      `https://zh.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
      `&prop=pageimages&pithumbsize=800&titles=${encodeURIComponent(title)}`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const json = (await res.json()) as {
      query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
    };
    const pages = json.query?.pages;
    if (!pages) return undefined;
    for (const k of Object.keys(pages)) {
      const src = pages[k]?.thumbnail?.source;
      if (src) return src;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function fetchWikiImage(title: string): Promise<string | undefined> {
  if (!title) return undefined;
  // 1) opensearch 로 가장 가까운 페이지 제목 찾기
  let pageTitle: string | null = null;
  try {
    const url = `https://zh.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(title)}&limit=1&namespace=0&format=json&origin=*`;
    const res = await fetch(url);
    if (res.ok) {
      const arr = (await res.json()) as [string, string[], string[], string[]];
      if (arr?.[1]?.[0]) pageTitle = arr[1][0];
    }
  } catch {}
  if (!pageTitle) pageTitle = title;

  // 2) summary 엔드포인트로 대표 이미지
  try {
    const url = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { thumbnail?: { source?: string }; originalimage?: { source?: string } };
    return json.originalimage?.source || json.thumbnail?.source;
  } catch {
    return undefined;
  }
}

async function fetchCommonsImage(query: string): Promise<string | undefined> {
  if (!query) return undefined;
  try {
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
      `&generator=search&gsrnamespace=6&gsrlimit=1&gsrsearch=${encodeURIComponent(query)}` +
      `&prop=imageinfo&iiprop=url|size&iiurlwidth=800`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const json = (await res.json()) as {
      query?: { pages?: Record<string, { imageinfo?: { thumburl?: string; url?: string }[] }> };
    };
    const pages = json.query?.pages;
    if (!pages) return undefined;
    for (const k of Object.keys(pages)) {
      const ii = pages[k]?.imageinfo?.[0];
      if (ii) return ii.thumburl || ii.url;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function sourceDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('xiaohongshu') || host.includes('xhslink')) return '小红书';
    if (host.includes('ctrip') || host.includes('trip.com')) return '携程';
    if (host.includes('dianping')) return '大众点评';
    if (host.includes('meituan')) return '美团';
    if (host.includes('mafengwo')) return '马蜂窝';
    if (host.includes('damai')) return '大麦';
    if (host.includes('weixin') || host.includes('mp.weixin')) return '微信';
    if (host.includes('zh.wikipedia') || host.includes('wikipedia')) return 'Wiki';
    if (host.includes('baidu') || host.includes('bkimg')) return '百度';
    if (host.includes('douyin')) return '抖音';
    if (host.includes('weibo')) return '微博';
    return host.replace(/^www\./, '');
  } catch {
    return null;
  }
}
