import type { Place, WeatherDay, EventItem, Recommendation, CustomFilters } from './types';

type VisitRecord = { place_id: string; visited_on: string };

const SEASON_BY_MONTH: Record<number, 'spring' | 'summer' | 'autumn' | 'winter'> = {
  1: 'winter', 2: 'winter', 3: 'spring', 4: 'spring', 5: 'spring',
  6: 'summer', 7: 'summer', 8: 'summer', 9: 'autumn', 10: 'autumn',
  11: 'autumn', 12: 'winter',
};

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

function weatherFit(place: Place, weekend: WeatherDay[]): { score: number; reason: string } {
  if (weekend.length === 0) return { score: 0, reason: '' };
  const outdoorOk = weekend.some(d => d.isOutdoorFriendly);
  const allRain = weekend.every(d => d.rainChance >= 60);
  const veryHot = weekend.some(d => d.tempMax >= 33);

  if (place.weather === 'indoor') {
    if (allRain) return { score: 3, reason: '주말 내내 비 예보 → 실내 강추' };
    if (veryHot) return { score: 2, reason: '폭염 → 실내 피난' };
    return { score: 0, reason: '' };
  }
  if (place.weather === 'outdoor') {
    if (allRain) return { score: -5, reason: '주말 내내 비 → 야외 비추' };
    if (!outdoorOk) return { score: -2, reason: '날씨 애매 → 야외 보류' };
    return { score: 2, reason: '야외 좋은 날씨' };
  }
  if (allRain) return { score: -1, reason: '비가 잦음 → 일부 일정만' };
  return { score: 1, reason: '날씨 무난' };
}

function seasonFit(place: Place, date: Date): { score: number; reason: string } {
  const season = SEASON_BY_MONTH[date.getMonth() + 1];
  if (place.bestSeasons.includes(season)) {
    return { score: 2, reason: `${season} 시즌 베스트` };
  }
  return { score: 0, reason: '' };
}

function recencyPenalty(place: Place, visits: VisitRecord[], now: Date): { score: number; reason: string } {
  const last = visits
    .filter(v => v.place_id === place.id)
    .map(v => new Date(v.visited_on))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  if (!last) return { score: 2, reason: '아직 안 가본 곳' };
  const d = daysBetween(now, last);
  if (d < 30) return { score: -10, reason: `최근 ${d}일 전 방문 → 제외` };
  if (d < 90) return { score: -3, reason: `${d}일 전 방문 → 후순위` };
  if (d < 180) return { score: -1, reason: `${d}일 전 방문` };
  return { score: 1, reason: `${d}일 전 → 다시 가볼 만함` };
}

function eventBoost(place: Place, events: EventItem[]): { score: number; reason: string } {
  const hit = events.find(e =>
    e.city === place.city ||
    e.title.includes(place.nameZh) ||
    (place.nameKo && e.title.includes(place.nameKo.split(' ')[0]))
  );
  if (hit) return { score: 4, reason: `이번 주말 행사: ${hit.title}` };
  return { score: 0, reason: '' };
}

function distancePenalty(place: Place): { score: number; reason: string } {
  const m = place.travelMinutesFromWuxi;
  if (m <= 30) return { score: 1, reason: '시내·근교' };
  if (m <= 60) return { score: 0, reason: '' };
  if (m <= 90) return { score: -1, reason: '편도 1시간 이상' };
  return { score: -2, reason: '먼 거리 (1박 권장)' };
}

export function recommend(
  places: Place[],
  weekend: WeatherDay[],
  events: EventItem[],
  visits: VisitRecord[],
  now: Date,
  topN = 8,
): Recommendation[] {
  const scored = places.map(place => {
    const parts = [
      weatherFit(place, weekend),
      seasonFit(place, now),
      recencyPenalty(place, visits, now),
      eventBoost(place, events),
      distancePenalty(place),
    ];
    const dateBonus = place.dateScore >= 8 ? 1 : 0;
    const base = place.dateScore / 2;
    const score = base + dateBonus + parts.reduce((sum, p) => sum + p.score, 0);
    const reasons = parts.map(p => p.reason).filter(Boolean);
    return { place_id: place.id, score, reasons };
  });

  return scored
    .filter(r => r.score > -5)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

export function customRecommend(
  places: Place[],
  filters: CustomFilters,
  visits: { place_id: string; visited_on: string }[],
  weather: WeatherDay[],
  events: EventItem[],
  now: Date,
): Recommendation[] {
  const filtered = places.filter(p => {
    if (filters.cities.length > 0 && !filters.cities.includes(p.city)) return false;
    if (filters.categories.length > 0 && !p.categories.some(c => filters.categories.includes(c))) return false;
    if (filters.costs.length > 0 && !filters.costs.includes(p.cost)) return false;
    if (filters.maxTravelMinutes !== null && p.travelMinutesFromWuxi > filters.maxTravelMinutes) return false;
    if (filters.weather !== 'any' && p.weather !== 'any' && p.weather !== filters.weather) return false;
    if (p.dateScore < filters.minDateScore) return false;
    return true;
  });

  const effectiveVisits = filters.excludeRecent ? visits : [];

  const scored = filtered.map(place => {
    const parts = [
      weatherFit(place, weather),
      seasonFit(place, now),
      recencyPenalty(place, effectiveVisits, now),
      eventBoost(place, events),
      distancePenalty(place),
    ];
    const dateBonus = place.dateScore >= 8 ? 1 : 0;
    const base = place.dateScore / 2;
    const score = base + dateBonus + parts.reduce((sum, p) => sum + p.score, 0);
    const reasons = parts.map(p => p.reason).filter(Boolean);
    return { place_id: place.id, score, reasons };
  });

  return scored
    .filter(r => !filters.excludeRecent || r.score > -5)
    .sort((a, b) => b.score - a.score)
    .slice(0, filters.topN);
}

export function nextWeekend(now: Date): { saturday: Date; sunday: Date } {
  const d = new Date(now);
  const dow = d.getDay();
  const daysToSat = dow === 6 ? 0 : (6 - dow + 7) % 7;
  const sat = new Date(d);
  sat.setDate(d.getDate() + daysToSat);
  sat.setHours(0, 0, 0, 0);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return { saturday: sat, sunday: sun };
}
