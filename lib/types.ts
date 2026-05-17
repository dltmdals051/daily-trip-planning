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
  place_id: string;
  score: number;
  reasons: string[];
};

export type WeeklySnapshot = {
  id: string;
  weekend_saturday: string;
  weekend_sunday: string;
  weather: WeatherDay[];
  events: EventItem[];
  recommendations: Recommendation[];
  model_notes?: string | null;
  generated_at: string;
};

export type Visit = {
  id: string;
  user_id: string;
  place_id: string;
  visited_on: string;
  rating: number | null;
  memo: string | null;
  created_at: string;
};

export type WishlistRow = {
  user_id: string;
  place_id: string;
  created_at: string;
};

export type Profile = {
  user_id: string;
  display_name: string;
  emoji: string;
  color: string;
  created_at: string;
  updated_at: string;
};

export type Discovery = {
  id: string;
  user_id: string;
  url: string | null;
  title: string;
  city: string | null;
  category: string | null;
  memo: string | null;
  source: string | null;
  promoted_to_place_id: string | null;
  created_at: string;
};

export type VoteRow = {
  user_id: string;
  weekend_saturday: string;
  place_id: string;
  voted_at: string;
};

export type CustomFilters = {
  cities: string[];
  categories: Category[];
  costs: ('free' | 'cheap' | 'medium' | 'expensive')[];
  maxTravelMinutes: number | null;
  weather: WeatherPreference;
  minDateScore: number;
  excludeRecent: boolean;
  startDate: string | null;
  topN: number;
};

export const defaultFilters = (): CustomFilters => ({
  cities: [],
  categories: [],
  costs: [],
  maxTravelMinutes: null,
  weather: 'any',
  minDateScore: 0,
  excludeRecent: true,
  startDate: null,
  topN: 8,
});

// AI 가 즉석에서 검색해서 돌려주는 장소 (DB 에 없음)
export type AIPlace = {
  nameKo: string;
  nameZh: string;
  city: string;
  category: string;
  travelMinutesFromWuxi?: number;
  why: string;
  estimatedCost?: string;
  suggestedHours?: [number, number];
  navigationKeyword?: string;
  sourceUrl?: string;
  imageUrl?: string;
  tips?: string;
};

export type AIRecommendResponse = {
  places: AIPlace[];
  notes?: string | null;
  rawPreview?: string;
  error?: string;
};
