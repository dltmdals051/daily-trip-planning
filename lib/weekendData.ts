// 이번 주말 탭 데이터:
// 1차: live_snapshot (cron 이 매일 새벽 채움 — 즉시).
// 2차: Supabase Edge Function 호출 (cron 이 아직 안 돌았거나 force refresh).
// Wiki/Wikimedia 는 중국에서 막혀있어서 클라이언트 enrichment 안 함.

import { supabase } from './supabase';
import { fetchClientWeather } from './clientWeather';
import type { WeatherDay, EventItem, AIPlace } from './types';

export type WeekendData = {
  startDate: string;
  endDate: string;
  weather: WeatherDay[];
  events: EventItem[];
  recommendations: AIPlace[];
  generatedAt: string;
  notes?: string | null;
  error?: string;
};

export function getWeekendRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const dow = start.getDay(); // 0=Sun, 6=Sat
  const end = new Date(start);
  end.setDate(start.getDate() + (dow === 0 ? 7 : 7 - dow));
  return { start, end };
}

export async function fetchWeekendData(): Promise<WeekendData> {
  const { start, end } = getWeekendRange();
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  // 날씨는 Open-Meteo (EU) — 중국에서 느릴 수 있지만 차단은 안 됨
  const weather = await fetchClientWeather(start, end);

  const empty: WeekendData = {
    startDate: startStr,
    endDate: endStr,
    weather,
    events: [],
    recommendations: [],
    generatedAt: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.functions.invoke<{
      events?: EventItem[];
      recommendations?: AIPlace[];
      notes?: string | null;
      error?: string;
    }>('ai-recommend', {
      body: { mode: 'weekend', startDate: startStr, endDate: endStr, weather },
    });
    if (error) return { ...empty, error: error.message };
    if (!data) return { ...empty, error: '빈 응답' };
    if (data.error) return { ...empty, error: data.error };
    return {
      ...empty,
      events: data.events ?? [],
      recommendations: data.recommendations ?? [],
      notes: data.notes ?? null,
    };
  } catch (e) {
    return { ...empty, error: `Edge Function 호출 실패: ${(e as Error).message}` };
  }
}

// 6시간 이내 + 같은 날짜 범위면 캐시 유효
const STALE_MS = 6 * 60 * 60 * 1000;

export function isFresh(data: WeekendData | null): boolean {
  if (!data) return false;
  const { start, end } = getWeekendRange();
  if (data.startDate !== start.toISOString().slice(0, 10)) return false;
  if (data.endDate !== end.toISOString().slice(0, 10)) return false;
  return Date.now() - new Date(data.generatedAt).getTime() < STALE_MS;
}

export function isCurrentRange(data: WeekendData | null): boolean {
  if (!data) return false;
  const { start, end } = getWeekendRange();
  return (
    data.startDate === start.toISOString().slice(0, 10) &&
    data.endDate === end.toISOString().slice(0, 10)
  );
}

// 1차: DB 의 cron 생성 스냅샷 로드 (즉시).
export async function loadLiveSnapshot(): Promise<WeekendData | null> {
  const { data, error } = await supabase
    .from('live_snapshot')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    startDate: data.start_date,
    endDate: data.end_date,
    weather: data.weather ?? [],
    events: data.events ?? [],
    recommendations: data.ai_recommendations ?? [],
    generatedAt: data.generated_at,
    notes: data.notes,
  };
}

// localStorage 캐시
const CACHE_KEY = 'weekendData_v1';

export function loadCache(): WeekendData | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeekendData;
  } catch {
    return null;
  }
}

export function saveCache(data: WeekendData): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function clearCache(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
