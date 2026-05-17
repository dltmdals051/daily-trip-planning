import { GoogleGenAI } from '@google/genai';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { EventItem } from '../../lib/types';

type SourceStrategy = {
  city: string;
  queries: string[];
};

type EventSources = {
  strategies: SourceStrategy[];
  preferDomains: string[];
  notes: string;
};

const SYSTEM = `너는 중국 우시(无锡)에 사는 한국인 + 산동 출신 여자친구 커플을 위한
주말 행사 큐레이터다. Google Search로 조사하고 검증된 실제 행사만 JSON으로 보고한다.
작년 정보, 추측, 광고성 후기는 제외. 구체적 날짜 + 장소 + 출처 URL 모두 확인된 것만.

우선순위:
1. 大麦网/票务 사이트의 콘서트·뮤지컬·전시
2. 시정부/관광국 공식 사이트의 페스티벌·시즌 이벤트
3. 박물관·미술관 특별전 공식 페이지
4. 대형 몰·테마파크의 한정 이벤트

제외:
- 정치 집회, 종교 행사
- B2B 박람회 (의류전·산업박람회 등)
- 단순 상가 세일`;

function buildUserPrompt(saturday: string, sunday: string, sources: EventSources): string {
  const strategiesText = sources.strategies
    .map(s => `### ${s.city}\n` + s.queries.map(q => `  - "${q}"`).join('\n'))
    .join('\n\n');

  return `이번 주말(${saturday} 토 ~ ${sunday} 일) 우시 + 강소성·상하이·항저우 행사를 찾아줘.

## 검색 전략 (이 쿼리들을 도시별로 1~2개씩 시도)

${strategiesText}

## 선호 도메인 (검색 결과 중 우선)
${sources.preferDomains.map(d => '- ' + d).join('\n')}

## 출력 (raw JSON only, 코드펜스/설명 금지)

{
  "events": [
    {
      "title": "...",
      "city": "无锡|苏州|南京|常州|扬州|镇江|上海|杭州",
      "dateRange": "YYYY-MM-DD ~ YYYY-MM-DD",
      "url": "https://...",
      "summary": "한국어 1~2줄"
    }
  ],
  "notes": "검색 신뢰도 / 빠뜨린 카테고리 메모"
}

규칙:
- 최대 10개. 적게라도 검증된 것만.
- 같은 행사는 한 번만.
- city 필드는 위 enum 값에서만.
- url은 1차 출처. 클릭하면 직접 보이는 페이지.`;
}

export async function fetchWeekendEvents(saturday: string, sunday: string): Promise<{ events: EventItem[]; notes?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[events] GEMINI_API_KEY 없음 → 행사 검색 스킵');
    return { events: [], notes: 'GEMINI_API_KEY missing' };
  }

  let sources: EventSources;
  try {
    const sourcesPath = path.resolve(__dirname, '../../data/event_sources.json');
    sources = JSON.parse(await readFile(sourcesPath, 'utf8'));
  } catch (e) {
    console.warn('[events] event_sources.json 못 읽음', e);
    sources = { strategies: [], preferDomains: [], notes: '' };
  }

  const client = new GoogleGenAI({ apiKey });

  let text = '';
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildUserPrompt(saturday, sunday, sources),
      config: {
        systemInstruction: SYSTEM,
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
      },
    });
    text = (response.text ?? '').trim();
  } catch (e) {
    console.error('[events] Gemini 호출 실패', e);
    return { events: [], notes: 'gemini call failed' };
  }

  // Google Search grounding 사용 시 마크다운 ```json ... ``` 으로 감싸오는 경우가 잦음
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) {
    console.warn('[events] JSON 파싱 실패. 원문:', text.slice(0, 500));
    return { events: [], notes: 'parse failed' };
  }

  try {
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    console.log(`[events] ${parsed.events?.length ?? 0}개 행사 발견`);
    return { events: parsed.events ?? [], notes: parsed.notes };
  } catch (e) {
    console.warn('[events] JSON.parse 에러', e);
    return { events: [], notes: 'parse error' };
  }
}
