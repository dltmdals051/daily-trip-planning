// Supabase Edge Function — AI 추천 (Gemini + Google Search grounding)
// 사용자 필터 받아서 인터넷 검색으로 우시·강소성·상해·항저우 장소 추천 JSON 반환

import { GoogleGenAI } from 'npm:@google/genai@2.3.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Filters = {
  cities: string[];
  categories: string[];
  costs: string[];
  maxTravelMinutes: number | null;
  weather: 'any' | 'indoor' | 'outdoor';
  minDateScore: number;
  startDate: string | null;
  excludeRecent: boolean;
};

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

function buildPrompt(f: Filters, recentNames: string[], cityCsv: string): string {
  const lines: string[] = [];
  lines.push('# 이번 추천에 적용할 필터');
  if (f.cities.length > 0) lines.push(`- 도시 한정: ${f.cities.join(', ')}`);
  else lines.push(`- 도시: 우시 우선, 근교 (${cityCsv}) 포함`);
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
- travelMinutesFromWuxi 는 실제 기차/차 시간 기준 추정값 (정확히 모르면 합리적 추정).
- sourceUrl 은 검색에서 본 1차 출처. 없으면 비워도 됨.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonErr(401, 'missing authorization');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) {
      return jsonErr(401, 'unauthorized');
    }

    // is_member 체크 (allowed_members RLS 가 본인 row만 보여주므로 단순 조회로 확인)
    const { data: membership } = await supabase
      .from('allowed_members')
      .select('email')
      .eq('email', user.email)
      .maybeSingle();
    if (!membership) {
      return jsonErr(403, 'not a member');
    }

    const filters: Filters = await req.json();

    // 최근 30일 다녀온 곳 이름 수집 (excludeRecent 활성 시)
    let recentNames: string[] = [];
    if (filters.excludeRecent) {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: visits } = await supabase
        .from('visits')
        .select('place_id')
        .gte('visited_on', since.toISOString().slice(0, 10));
      const placeIds = Array.from(new Set((visits ?? []).map((v: any) => v.place_id)));
      if (placeIds.length > 0) {
        const { data: places } = await supabase
          .from('places')
          .select('name_ko, name_zh')
          .in('id', placeIds);
        recentNames = (places ?? []).flatMap((p: any) => [p.name_ko, p.name_zh]).filter(Boolean);
      }
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return jsonErr(500, 'GEMINI_API_KEY not configured');
    }

    const cityCsv = '苏州·南京·常州·扬州·镇江·上海·杭州';
    const ai = new GoogleGenAI({ apiKey });

    let text = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: buildPrompt(filters, recentNames, cityCsv),
        config: {
          systemInstruction: SYSTEM,
          tools: [{ googleSearch: {} }],
          temperature: 0.4,
        },
      });
      text = (response.text ?? '').trim();
    } catch (e) {
      return jsonErr(502, `gemini failed: ${(e as Error).message}`);
    }

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd < 0) {
      return Response.json(
        { places: [], notes: 'parse failed', rawPreview: text.slice(0, 300) },
        { headers: corsHeaders },
      );
    }

    try {
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      return Response.json(
        { places: parsed.places ?? [], notes: parsed.notes ?? null },
        { headers: corsHeaders },
      );
    } catch (e) {
      return Response.json(
        { places: [], notes: `json parse error: ${(e as Error).message}`, rawPreview: text.slice(0, 300) },
        { headers: corsHeaders },
      );
    }
  } catch (e) {
    return jsonErr(500, (e as Error).message);
  }
});

function jsonErr(status: number, msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
