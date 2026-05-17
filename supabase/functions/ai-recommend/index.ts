// Supabase Edge Function — Gemini + Google Search grounding (Deno 런타임).
// 중국에서 Gemini API 가 막혀있어서 클라이언트 직접 호출이 안 되므로,
// Supabase (홍콩 리전) 의 edge 가 대신 호출해서 결과만 반환.
//
// Body: { mode: 'custom', filters }  또는  { mode: 'weekend', startDate, endDate, weather }

import { GoogleGenAI } from 'npm:@google/genai@2.3.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_COMMON = `너는 중국 우시(无锡)에 사는 한국인 + 산동 출신 여자친구 커플을 위한 주말 큐레이터다.
사용자가 준 조건에 맞는 실제 갈만한 장소를 Google Search 로 검증해서 JSON 으로 추천한다.

원칙:
- 실재하는 장소만. 가짜 이름·작년 한정 행사 X.
- 우시 + 강소성 (苏州/南京/常州/扬州/镇江) + 상하이/항저우 범위.
- 우시에서 편도 3시간 이내.
- 같은 곳 중복 X.
- 한국어/중국어 이름 둘 다 정확히.
- 데이트 코스 적합도 우선.

출처 우선순위 (sourceUrl):
1. 小红书 (xiaohongshu.com), 携程 (ctrip.com), 大众点评 (dianping.com)
2. 大麦网 (행사 티켓)
3. 공식 사이트, 위키피디아, 百度百科

이미지 우선순위 (imageUrl):
- bkimg.cdn.bcebos.com (Baidu Baike CDN) — **중국에서 접속 가능, 최우선**
- img.lvmama.com / dimg04.c-ctrip.com (Ctrip)
- upload.wikimedia.org (Wikipedia Commons) — 폴백 (중국에서 막힐 수 있음)
- 직접 hot-link 가능한 .jpg/.png/.webp URL`;

type CustomFilters = {
  cities: string[];
  categories: string[];
  costs: string[];
  maxTravelMinutes: number | null;
  weather: 'any' | 'indoor' | 'outdoor';
  minDateScore: number;
  startDate: string | null;
  excludeRecent: boolean;
};

type WeatherDay = {
  date: string;
  dayOfWeek: string;
  tempMin: number;
  tempMax: number;
  description: string;
  rainChance: number;
  isOutdoorFriendly: boolean;
};

function buildCustomPrompt(f: CustomFilters, recent: string[]): string {
  const lines: string[] = ['# 필터'];
  if (f.cities.length > 0) lines.push(`- 도시 한정: ${f.cities.join(', ')}`);
  else lines.push('- 도시: 우시 우선, 근교 (苏州·南京·常州·扬州·镇江·上海·杭州) 포함');
  if (f.categories.length > 0) lines.push(`- 카테고리: ${f.categories.join(', ')}`);
  if (f.costs.length > 0) lines.push(`- 예산: ${f.costs.join(', ')} (free=무료, cheap=100元↓, medium=100~300元, expensive=300元↑)`);
  if (f.maxTravelMinutes) lines.push(`- 우시 기준 편도 ${f.maxTravelMinutes}분 이내`);
  if (f.weather === 'indoor') lines.push('- 실내 위주 (비/추위/폭염 대비)');
  else if (f.weather === 'outdoor') lines.push('- 야외 위주');
  if (f.minDateScore > 0) lines.push(`- 데이트 점수 ${f.minDateScore}/10 이상`);
  if (f.startDate) lines.push(`- 방문 예정일: ${f.startDate}`);
  if (recent.length > 0) lines.push(`- 최근 30일 다녀와서 제외할 곳: ${recent.join(', ')}`);

  return `${lines.join('\n')}

# 출력 (raw JSON only, 코드펜스/설명 금지)
{
  "places": [
    {
      "nameKo": "한국어 이름",
      "nameZh": "中文名",
      "city": "无锡|苏州|南京|常州|扬州|镇江|上海|杭州",
      "category": "nature|culture|food|shopping|date|ancient-town|museum|park|temple|theme-park|water-town",
      "travelMinutesFromWuxi": 60,
      "why": "왜 이번 필터에 맞는지 한국어 1~2줄",
      "estimatedCost": "무료 | 50元 이하 | 100元 이하 | 100-300元 | 300元+",
      "suggestedHours": [3, 5],
      "navigationKeyword": "高德地图 검색어 (中文)",
      "sourceUrl": "https://www.xiaohongshu.com/... 또는 https://you.ctrip.com/...",
      "imageUrl": "https://bkimg.cdn.bcebos.com/...",
      "tips": "현지인 팁 (선택)"
    }
  ],
  "notes": "메모 (선택)"
}

규칙:
- 8~10개. 필터 까다로우면 더 적게.
- city 필드는 위 enum.
- imageUrl 확신 없으면 키 생략.`;
}

function buildWeekendPrompt(weather: WeatherDay[], startStr: string, endStr: string): string {
  const weatherSummary = weather.length > 0
    ? weather.map(w => `- ${w.date} (${w.dayOfWeek}): ${w.tempMin}~${w.tempMax}°, ${w.description}, 비${w.rainChance}%`).join('\n')
    : '(날씨 정보 없음)';

  return `${startStr} ~ ${endStr} (오늘부터 다음 주말까지) 동안의 우시 + 근교 추천.

## 날씨
${weatherSummary}

## 출력 (raw JSON only)
{
  "events": [
    {
      "title": "행사 이름",
      "city": "无锡|...",
      "dateRange": "YYYY-MM-DD ~ YYYY-MM-DD",
      "url": "https://...",
      "summary": "한국어 1~2줄"
    }
  ],
  "recommendations": [
    {
      "nameKo": "...",
      "nameZh": "...",
      "city": "无锡|...",
      "category": "nature|culture|food|shopping|date|ancient-town|museum|park|temple|theme-park|water-town",
      "travelMinutesFromWuxi": 60,
      "why": "왜 이번 주말에 좋은지 (날씨 고려)",
      "estimatedCost": "...",
      "suggestedHours": [3, 5],
      "navigationKeyword": "...",
      "sourceUrl": "...",
      "imageUrl": "...",
      "tips": "..."
    }
  ],
  "notes": "메모"
}

규칙:
- events 최대 8개. 검증된 것만.
- recommendations 8~10개. 날씨 적합도 고려.`;
}

function parseJson(text: string): { events?: any[]; places?: any[]; recommendations?: any[]; notes?: string | null } {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) {
    return { notes: 'parse failed' };
  }
  try {
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch (e) {
    return { notes: `json parse error: ${(e as Error).message}` };
  }
}

function jsonErr(status: number, msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonErr(401, 'missing authorization');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) return jsonErr(401, 'unauthorized');

    const { data: membership } = await supabase
      .from('allowed_members')
      .select('email')
      .eq('email', user.email)
      .maybeSingle();
    if (!membership) return jsonErr(403, 'not a member');

    const body = await req.json() as
      | { mode: 'custom'; filters: CustomFilters }
      | { mode: 'weekend'; startDate: string; endDate: string; weather: WeatherDay[] };

    let recentNames: string[] = [];
    if (body.mode === 'custom' && body.filters?.excludeRecent) {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: visits } = await supabase
        .from('visits')
        .select('place_id')
        .gte('visited_on', since.toISOString().slice(0, 10));
      const placeIds = Array.from(new Set((visits ?? []).map((v: { place_id: string }) => v.place_id)));
      if (placeIds.length > 0) {
        const { data: places } = await supabase
          .from('places')
          .select('name_ko, name_zh')
          .in('id', placeIds);
        recentNames = (places ?? []).flatMap((p: { name_ko: string; name_zh: string }) => [p.name_ko, p.name_zh]).filter(Boolean);
      }
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return jsonErr(500, 'GEMINI_API_KEY not configured');

    const ai = new GoogleGenAI({ apiKey });
    const prompt = body.mode === 'custom'
      ? buildCustomPrompt(body.filters, recentNames)
      : buildWeekendPrompt(body.weather ?? [], body.startDate, body.endDate);

    let text = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_COMMON,
          tools: [{ googleSearch: {} }],
          temperature: 0.4,
        },
      });
      text = (response.text ?? '').trim();
    } catch (e) {
      return jsonErr(502, `gemini call failed: ${(e as Error).message}`);
    }

    const parsed = parseJson(text);
    return Response.json(parsed, { headers: corsHeaders });
  } catch (e) {
    return jsonErr(500, (e as Error).message);
  }
});
