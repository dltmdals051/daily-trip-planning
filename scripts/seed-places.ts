import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Place } from '../lib/types';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요');

  const client = createClient(url, key, { auth: { persistSession: false } });

  const root = path.resolve(__dirname, '..');
  const placesPath = path.join(root, 'data', 'places.json');
  const places: Place[] = JSON.parse(await readFile(placesPath, 'utf8'));

  const rows = places.map(p => ({
    id: p.id,
    name_ko: p.nameKo,
    name_zh: p.nameZh,
    city: p.city,
    province: p.province,
    categories: p.categories,
    weather: p.weather,
    travel_minutes_from_wuxi: p.travelMinutesFromWuxi,
    best_seasons: p.bestSeasons,
    date_score: p.dateScore,
    cost: p.cost,
    duration_hours: p.durationHours,
    notes: p.notes,
    tips: p.tips ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await client.from('places').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
  console.log(`[seed] ${rows.length}개 장소 upsert 완료`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
