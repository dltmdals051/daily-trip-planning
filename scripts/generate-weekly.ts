import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { fetchWuxiWeekend } from './lib/weather';
import { fetchWeekendEvents } from './lib/events';
import { recommend, nextWeekend } from '../lib/recommend';
import type { Place, WeatherDay, EventItem } from '../lib/types';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요');

  const client = createClient(url, key, { auth: { persistSession: false } });

  // 장소 DB는 Supabase에서 (이미 seed된 상태) 또는 로컬 파일 fallback
  const { data: dbPlaces } = await client.from('places').select('*');
  const places: Place[] = dbPlaces && dbPlaces.length > 0
    ? dbPlaces.map((r: any) => ({
        id: r.id,
        nameKo: r.name_ko,
        nameZh: r.name_zh,
        city: r.city,
        province: r.province,
        categories: r.categories ?? [],
        weather: r.weather,
        travelMinutesFromWuxi: r.travel_minutes_from_wuxi,
        bestSeasons: r.best_seasons ?? [],
        dateScore: r.date_score,
        cost: r.cost,
        durationHours: [r.duration_hours[0], r.duration_hours[1]],
        notes: r.notes ?? '',
        tips: r.tips ?? undefined,
      }))
    : JSON.parse(await readFile(path.resolve(__dirname, '../data/places.json'), 'utf8'));

  // 모든 방문 기록 (양쪽 합산) → 추천 로직에서 최근 방문 페널티
  const { data: visitRows } = await client.from('visits').select('place_id, visited_on');
  const visits = (visitRows ?? []) as { place_id: string; visited_on: string }[];

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
  const recs = recommend(places, weather, events, visits, now, 8);

  const { error } = await client.from('weekly_snapshots').upsert(
    {
      weekend_saturday: satStr,
      weekend_sunday: sunStr,
      weather,
      events,
      recommendations: recs,
      model_notes: modelNotes ?? null,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'weekend_saturday' },
  );
  if (error) throw error;

  console.log(`[gen] Supabase에 upsert 완료. 추천 ${recs.length}개:`);
  const byId = Object.fromEntries(places.map(p => [p.id, p]));
  recs.forEach((r, i) => {
    const p = byId[r.place_id];
    console.log(`  ${i + 1}. [${r.score.toFixed(1)}] ${p?.nameKo} (${p?.city})`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
