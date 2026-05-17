// 이번 주말 탭: today → 다음 일요일 데이터를 Gemini 로 즉석 fetch
// 행사+추천 한 번에 부르고 6시간 캐싱.

import { GoogleGenAI } from '@google/genai';
import { fetchClientWeather } from './clientWeather';
import { supabase } from './supabase';
import type { WeatherDay, EventItem, AIPlace } from './types';

const SYSTEM = `너는 중국 우시(无锡)에 사는 한국인 + 산동 출신 여자친구 커플을 위한 주말 큐레이터다.
사용자가 준 날짜 범위(오늘~다음 일요일)에 대해 Google Search로 검증된 행사와 장소를 추천한다.

원칙:
- 실재하는 행사/장소만. 가짜 이름·작년 정보 X.
- 우시 + 강소성 (苏州/南京/常州/扬州/镇江) + 상하이/항저우 범위.
- 우시에서 편도 3시간 이내.
- 행사는 그 날짜 범위에 실제로 열리는 것만 (大麦网, 票务, 공식 사이트 확인).
- 추천 장소는 8~10개, 날씨 적합도 고려 (비 오면 실내 위주).
- 데이트 코스 적합도 우선.
- 같은 곳 중복 X.
- 한국어/중국어 이름 둘 다 정확히.

출처 우선순위 (sourceUrl):
1. 小红书 (xiaohongshu.com), 携程 (ctrip.com), 大众点评 (dianping.com)
2. 大麦网 (행사 티켓)
3. 공식 관광청, 위키피디아

이미지 우선순위 (imageUrl):
- upload.wikimedia.org (Wikipedia Commons) — 최우선
- bkimg.cdn.bcebos.com (Baidu Baike CDN)
- 직접 hot-link 가능한 .jpg/.png/.webp URL`;

function buildPrompt(weather: WeatherDay[], startStr: string, endStr: string): string {
  const weatherSummary = weather.length > 0
    ? weather
        .map(w => `- ${w.date} (${w.dayOfWeek}): ${w.tempMin}~${w.tempMax}°, ${w.description}, 비${w.rainChance}%`)
        .join('\n')
    : '(날씨 정보 없음 — 일반 추천)';

  return `${startStr} ~ ${endStr} (오늘부터 다음 주말까지) 동안의 우시·강소성·상해/항저우 추천을 부탁한다.

## 날씨
${weatherSummary}

## 출력 (raw JSON only, 코드펜스/설명 금지)
{
  "events": [
    {
      "title": "행사 이름",
      "city": "无锡|苏州|南京|常州|扬州|镇江|上海|杭州 중 하나",
      "dateRange": "YYYY-MM-DD ~ YYYY-MM-DD",
      "url": "https://...",
      "summary": "한국어 1~2줄"
    }
  ],
  "recommendations": [
    {
      "nameKo": "한국어 이름",
      "nameZh": "中文名",
      "city": "无锡|...",
      "category": "nature|culture|food|shopping|date|ancient-town|museum|park|temple|theme-park|water-town",
      "travelMinutesFromWuxi": 60,
      "why": "왜 이번 주말에 좋은지 한국어 1~2줄 (날씨 고려)",
      "estimatedCost": "무료 | 50元 이하 | 100元 이하 | 100-300元 | 300元+",
      "suggestedHours": [최소시간, 최대시간],
      "navigationKeyword": "高德地图 검색어 (中文)",
      "sourceUrl": "https://www.xiaohongshu.com/... 또는 https://you.ctrip.com/...",
      "imageUrl": "https://upload.wikimedia.org/...",
      "tips": "현지인 팁 (선택)"
    }
  ],
  "notes": "검색 신뢰도/메모 (선택)"
}

규칙:
- events 최대 8개. 검증된 것만. 없으면 빈 배열.
- recommendations 8~10개. 날씨/계절 고려.
- city 필드는 위 enum.
- imageUrl 확실하지 않으면 키 생략.`;
}

export type WeekendData = {
  startDate: string;
  endDate: string;
  weather: WeatherDay[];
  events: EventItem[];
  recommendations: AIPlace[];
  generatedAt: string;
  notes?: string | null;
  error?: string;
};

export function getWeekendRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const dow = start.getDay(); // 0=Sun, 6=Sat
  const end = new Date(start);
  // 일요일이면 그 다음 주 일요일까지 (8일), 아니면 이번 주 일요일까지
  end.setDate(start.getDate() + (dow === 0 ? 7 : 7 - dow));
  return { start, end };
}

export async function fetchWeekendData(): Promise<WeekendData> {
  const { start, end } = getWeekendRange();
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const weather = await fetchClientWeather(start, end);

  const empty: WeekendData = {
    startDate: startStr,
    endDate: endStr,
    weather,
    events: [],
    recommendations: [],
    generatedAt: new Date().toISOString(),
  };

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return { ...empty, error: 'EXPO_PUBLIC_GEMINI_API_KEY 미설정' };
  }

  const ai = new GoogleGenAI({ apiKey });
  let text = '';
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildPrompt(weather, startStr, endStr),
      config: {
        systemInstruction: SYSTEM,
        tools: [{ googleSearch: {} }],
        temperature: 0.4,
      },
    });
    text = (response.text ?? '').trim();
  } catch (e) {
    return { ...empty, error: `Gemini 호출 실패: ${(e as Error).message}` };
  }

  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) {
    return { ...empty, notes: 'parse failed' };
  }

  try {
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    return {
      ...empty,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      notes: parsed.notes ?? null,
    };
  } catch (e) {
    return { ...empty, notes: `json parse: ${(e as Error).message}` };
  }
}

// 6시간 이내 + 같은 날짜 범위면 캐시 유효
const STALE_MS = 6 * 60 * 60 * 1000;

export function isFresh(data: WeekendData | null): boolean {
  if (!data) return false;
  const { start, end } = getWeekendRange();
  if (data.startDate !== start.toISOString().slice(0, 10)) return false;
  if (data.endDate !== end.toISOString().slice(0, 10)) return false;
  return Date.now() - new Date(data.generatedAt).getTime() < STALE_MS;
}

// 같은 날짜 범위인지만 체크 (cron 이 만든 데이터는 신선도 무관하게 일단 신뢰)
export function isCurrentRange(data: WeekendData | null): boolean {
  if (!data) return false;
  const { start, end } = getWeekendRange();
  return (
    data.startDate === start.toISOString().slice(0, 10) &&
    data.endDate === end.toISOString().slice(0, 10)
  );
}

// 1차: DB 의 cron 생성 스냅샷 로드 (즉시).
// null 이거나 날짜 범위 다르면 호출자가 client fetch fallback.
export async function loadLiveSnapshot(): Promise<WeekendData | null> {
  const { data, error } = await supabase
    .from('live_snapshot')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    startDate: data.start_date,
    endDate: data.end_date,
    weather: data.weather ?? [],
    events: data.events ?? [],
    recommendations: data.ai_recommendations ?? [],
    generatedAt: data.generated_at,
    notes: data.notes,
  };
}

// localStorage 캐시 — 새로고침해도 옛 데이터 즉시 보여주기.
const CACHE_KEY = 'weekendData_v1';

export function loadCache(): WeekendData | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeekendData;
  } catch {
    return null;
  }
}

export function saveCache(data: WeekendData): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage 가득 차거나 차단된 경우 무시
  }
}

export function clearCache(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
