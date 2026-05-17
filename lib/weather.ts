import type { WeatherDay } from './types';

const WUXI_LAT = 31.5;
const WUXI_LON = 120.3;

type OpenMeteoResponse = {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    weathercode: number[];
  };
};

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

export async function fetchWuxiWeekend(saturday: Date, sunday: Date): Promise<WeatherDay[]> {
  const start = saturday.toISOString().slice(0, 10);
  const end = sunday.toISOString().slice(0, 10);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${WUXI_LAT}&longitude=${WUXI_LON}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
    `&timezone=Asia/Shanghai&start_date=${start}&end_date=${end}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const data = (await res.json()) as OpenMeteoResponse;

  return data.daily.time.map((iso, i) => {
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
      description: WEATHER_CODE_KO[code] ?? '알 수 없음',
      rainChance: rain,
      isOutdoorFriendly: rain < 50 && tmax < 35 && tmin > 5 && code < 61,
    };
  });
}
