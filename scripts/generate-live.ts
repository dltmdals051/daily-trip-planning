// 매일 새벽 cron 으로 실행.
// 오늘 ~ 다음 일요일 범위로 weather + events + AI 추천을 받아서 live_snapshot 에 upsert.

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { fetchWuxiWeekend } from './lib/weather';
import type { WeatherDay } from '../lib/types';

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
- bkimg.cdn.bcebos.com (Baidu Baike CDN) — **중국에서 접속 가능, 최우선**
- img.lvmama.com / dimg04.c-ctrip.com (Ctrip)
- upload.wikimedia.org (Wikipedia Commons) — 폴백 (중국에서 막힐 수 있음)
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

function getRange(now: Date = new Date()): { start: Date; end: Date } {
  // CST (UTC+8) 기준으로 "오늘" 계산
  const cstNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const start = new Date(Date.UTC(cstNow.getUTCFullYear(), cstNow.getUTCMonth(), cstNow.getUTCDate()));
  const dow = start.getUTCDay();
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + (dow === 0 ? 7 : 7 - dow));
  return { start, end };
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요');
  if (!apiKey) throw new Error('GEMINI_API_KEY 필요');

  const client = createClient(url, key, { auth: { persistSession: false } });

  const { start, end } = getRange();
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  console.log(`[live] range: ${startStr} ~ ${endStr}`);

  let weather: WeatherDay[] = [];
  try {
    weather = await fetchWuxiWeekend(start, end);
    console.log(`[live] weather: ${weather.length} days`);
  } catch (e) {
    console.error('[live] weather failed', e);
  }

  console.log('[live] Gemini 검색 중...');
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
    console.error('[live] Gemini 실패', e);
    throw e;
  }

  let parsed: any = { events: [], recommendations: [], notes: null };
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart >= 0 && jsonEnd >= 0) {
    try {
      parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    } catch (e) {
      console.error('[live] JSON 파싱 실패', e);
    }
  } else {
    console.warn('[live] Gemini 응답에 JSON 없음. 원문:', text.slice(0, 300));
  }

  const events = Array.isArray(parsed.events) ? parsed.events : [];
  const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

  console.log(`[live] events: ${events.length}, recommendations: ${recommendations.length}`);

  const { error } = await client.from('live_snapshot').upsert({
    id: 1,
    start_date: startStr,
    end_date: endStr,
    weather,
    events,
    ai_recommendations: recommendations,
    notes: parsed.notes ?? null,
    generated_at: new Date().toISOString(),
  });
  if (error) throw error;
  console.log('[live] upsert 완료');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
