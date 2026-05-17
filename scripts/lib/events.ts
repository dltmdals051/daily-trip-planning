import Anthropic from '@anthropic-ai/sdk';
import type { EventItem } from '../../lib/types';

const SYSTEM = `너는 중국 우시(无锡)에 사는 한국인 사용자(여자친구는 산동 출신)를 위해
이번 주말(토~일) 무시 + 강소성(쑤저우/난징/창저우/양저우/전장) + 가까운 상하이/항저우의
이벤트·행사·전시·축제·페어를 찾아 JSON으로 정리한다. 추측이나 작년 정보는 제외한다.
구체적인 날짜와 장소가 확인되는 것만 포함.`;

const USER_TEMPLATE = (sat: string, sun: string) => `
이번 주말(${sat} 토요일 ~ ${sun} 일요일)에 우시(无锡) 및 인근 강소성/상하이/항저우에서 열리는
실제 행사/전시/페어/콘서트/시즌 이벤트를 웹검색으로 찾아줘.

조건:
- 두 명(20대 후반 한중 커플)이 갈 만한 것 위주.
- 정치/종교 집회, 상업 사은품 행사, B2B 박람회는 제외.
- 한국어로 정리. 중국어 원제목은 title에 포함해도 됨.
- 최대 8개.

다음 JSON 스키마로만 답해 (코드펜스 없이 raw JSON):
{
  "events": [
    {
      "title": "...",
      "city": "无锡|苏州|南京|常州|扬州|镇江|上海|杭州",
      "dateRange": "YYYY-MM-DD ~ YYYY-MM-DD",
      "url": "https://...",
      "summary": "한국어 1~2줄 요약"
    }
  ],
  "notes": "검색 시 특이사항/신뢰도 메모 (선택)"
}
`;

export async function fetchWeekendEvents(saturday: string, sunday: string): Promise<{ events: EventItem[]; notes?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[events] ANTHROPIC_API_KEY 없음 → 행사 검색 스킵');
    return { events: [], notes: 'ANTHROPIC_API_KEY missing' };
  }

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 6,
      } as any,
    ],
    messages: [{ role: 'user', content: USER_TEMPLATE(saturday, sunday) }],
  });

  const text = msg.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('\n')
    .trim();

  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) {
    console.warn('[events] JSON 파싱 실패');
    return { events: [], notes: 'parse failed' };
  }

  try {
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    return { events: parsed.events ?? [], notes: parsed.notes };
  } catch (e) {
    console.warn('[events] JSON.parse 에러', e);
    return { events: [], notes: 'parse error' };
  }
}
