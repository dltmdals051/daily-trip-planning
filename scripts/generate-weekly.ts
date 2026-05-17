import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchWuxiWeekend } from '../lib/weather';
import { fetchWeekendEvents } from '../lib/events';
import { recommend, nextWeekend } from '../lib/recommend';
import type { Place, WeeklyData, WeatherDay, EventItem } from '../lib/types';

async function main() {
  const root = path.resolve(__dirname, '..');
  const placesPath = path.join(root, 'data', 'places.json');
  const visitedPath = path.join(root, 'data', 'visited.json');
  const outPath = path.join(root, 'data', 'weekly.json');

  const places: Place[] = JSON.parse(await readFile(placesPath, 'utf8'));
  const visited = JSON.parse(await readFile(visitedPath, 'utf8'));

  const now = new Date();
  const { saturday, sunday } = nextWeekend(now);
  const satStr = saturday.toISOString().slice(0, 10);
  const sunStr = sunday.toISOString().slice(0, 10);

  console.log(`[gen] 대상 주말: ${satStr} ~ ${sunStr}`);

  console.log('[gen] 날씨 가져오는 중...');
  let weather: WeatherDay[] = [];
  try {
    weather = await fetchWuxiWeekend(saturday, sunday);
  } catch (e) {
    console.error('[gen] 날씨 실패', e);
  }

  console.log('[gen] 행사 검색 중...');
  let events: EventItem[] = [];
  let modelNotes: string | undefined;
  try {
    const result = await fetchWeekendEvents(satStr, sunStr);
    events = result.events;
    modelNotes = result.notes;
  } catch (e) {
    console.error('[gen] 행사 실패', e);
  }

  console.log(`[gen] ${places.length}개 장소 점수 계산 중...`);
  const recs = recommend(places, weather, events, visited.visits ?? [], now, 8);

  const weekly: WeeklyData = {
    generatedAt: new Date().toISOString(),
    weekendDates: { saturday: satStr, sunday: sunStr },
    weather,
    events,
    recommendations: recs,
    modelNotes,
  };

  await writeFile(outPath, JSON.stringify(weekly, null, 2), 'utf8');
  console.log(`[gen] 완료 → ${outPath}`);
  console.log(`[gen] 추천 ${recs.length}개:`);
  recs.forEach((r, i) => console.log(`  ${i + 1}. [${r.score.toFixed(1)}] ${r.place.nameKo} (${r.place.city})`));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
