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
- 너무 흔한 곳(태호광장 등)만 나열하지 말고 숨은 곳 1~2개 섞기.`;

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
      "sourceUrl": "https://...",
      "tips": "현지인이 알려주는 팁 (선택, 한 줄)"
    }
  ],
  "notes": "검색 신뢰도 / 빠진 카테고리 메모 (선택)"
}

규칙:
- 최대 10개. 필터에 안 맞으면 적게.
- city 필드는 위 enum.
- travelMinutesFromWuxi 는 실제 기차/차 시간 기준 추정값.
- sourceUrl 은 검색에서 본 1차 출처. 없으면 비워도 됨.`;
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

  try {
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const places: AIPlace[] = Array.isArray(parsed.places) ? parsed.places : [];
    return { places, notes: parsed.notes ?? null };
  } catch (e) {
    return { places: [], notes: `json parse error: ${(e as Error).message}`, rawPreview: text.slice(0, 300) };
  }
}
