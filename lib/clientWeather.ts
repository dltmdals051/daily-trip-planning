import type { WeatherDay } from './types';

const WUXI_LAT = 31.5;
const WUXI_LON = 120.3;

const WEATHER_CODE_KO: Record<number, string> = {
  0: '맑음',
  1: '대체로 맑음', 2: '구름 조금', 3: '흐림',
  45: '안개', 48: '안개',
  51: '이슬비 약함', 53: '이슬비', 55: '이슬비 강함',
  61: '비 약함', 63: '비', 65: '비 강함',
  71: '눈 약함', 73: '눈', 75: '눈 강함',
  80: '소나기', 81: '소나기 강함', 82: '폭우',
  95: '천둥번개', 96: '천둥+우박', 99: '천둥+우박 강함',
};

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];

export async function fetchClientWeather(start: Date, end: Date): Promise<WeatherDay[]> {
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const today = new Date();
  const diffDays = Math.floor((start.getTime() - today.getTime()) / 86_400_000);
  // open-meteo forecast 모델은 최대 16일까지만
  if (diffDays > 15) return [];

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${WUXI_LAT}&longitude=${WUXI_LON}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
    `&timezone=Asia/Shanghai&start_date=${startStr}&end_date=${endStr}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.daily.time.map((iso: string, i: number) => {
      const d = new Date(iso + 'T00:00:00');
      const code = data.daily.weathercode[i];
      const rain = data.daily.precipitation_probability_max[i] ?? 0;
      const tmax = data.daily.temperature_2m_max[i];
      const tmin = data.daily.temperature_2m_min[i];
      return {
        date: iso,
        dayOfWeek: DOW_KO[d.getDay()],
        tempMin: Math.round(tmin),
        tempMax: Math.round(tmax),
        description: WEATHER_CODE_KO[code] ?? '?',
        rainChance: rain,
        isOutdoorFriendly: rain < 50 && tmax < 35 && tmin > 5 && code < 61,
      };
    });
  } catch {
    return [];
  }
}
