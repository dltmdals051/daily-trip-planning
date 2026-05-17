export type Category =
  | 'nature'
  | 'culture'
  | 'food'
  | 'shopping'
  | 'date'
  | 'ancient-town'
  | 'museum'
  | 'park'
  | 'temple'
  | 'theme-park'
  | 'water-town';

export type WeatherPreference = 'any' | 'indoor' | 'outdoor';

export type Place = {
  id: string;
  nameZh: string;
  nameKo: string;
  city: string;
  province: string;
  categories: Category[];
  weather: WeatherPreference;
  travelMinutesFromWuxi: number;
  bestSeasons: ('spring' | 'summer' | 'autumn' | 'winter')[];
  dateScore: number;
  cost: 'free' | 'cheap' | 'medium' | 'expensive';
  durationHours: [number, number];
  notes: string;
  tips?: string;
};

export type WeatherDay = {
  date: string;
  dayOfWeek: string;
  tempMin: number;
  tempMax: number;
  description: string;
  rainChance: number;
  isOutdoorFriendly: boolean;
};

export type EventItem = {
  title: string;
  city: string;
  dateRange: string;
  url?: string;
  summary: string;
};

export type Recommendation = {
  place: Place;
  score: number;
  reasons: string[];
};

export type WeeklyData = {
  generatedAt: string;
  weekendDates: { saturday: string; sunday: string };
  weather: WeatherDay[];
  events: EventItem[];
  recommendations: Recommendation[];
  modelNotes?: string;
};
