import { create } from 'zustand';
import { supabase } from './supabase';
import type { Place, Visit, WishlistRow, Discovery, Profile } from './types';
import { fetchWeekendData, isFresh, isCurrentRange, loadLiveSnapshot, loadCache, saveCache, clearCache, type WeekendData } from './weekendData';

type State = {
  places: Place[];
  visits: Visit[];
  wishlist: WishlistRow[];
  discoveries: Discovery[];
  profiles: Profile[];
  me: string | null;
  loading: boolean;
  error: string | null;
  weekendData: WeekendData | null;
  weekendLoading: boolean;
  refresh: () => Promise<void>;
  refreshWeekend: (force?: boolean) => Promise<void>;
  toggleWish: (placeId: string) => Promise<void>;
  addVisit: (placeId: string, rating: number | null, memo: string) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
  addDiscovery: (input: { title: string; url?: string; city?: string; category?: string; memo?: string; source?: string }) => Promise<void>;
  deleteDiscovery: (id: string) => Promise<void>;
  updateProfile: (patch: { display_name?: string; emoji?: string; color?: string }) => Promise<void>;
  subscribe: () => () => void;
  reset: () => void;
  clearError: () => void;
};

function placeFromRow(r: any): Place {
  return {
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
  };
}

export const useStore = create<State>((set, get) => ({
  places: [],
  visits: [],
  wishlist: [],
  discoveries: [],
  profiles: [],
  me: null,
  loading: false,
  error: null,
  // 부팅 시 localStorage 에서 동기적으로 옛 데이터 hydrate → 즉시 표시
  weekendData: loadCache(),
  weekendLoading: false,

  refreshWeekend: async (force = false) => {
    if (!force && isFresh(get().weekendData)) return;
    // 캐시가 있으면 로딩 스피너 안 띄움 (옛 데이터 유지하며 백그라운드 새로고침)
    const hasCache = !!get().weekendData;
    if (!hasCache) set({ weekendLoading: true });
    try {
      // 1순위: DB 의 cron 스냅샷 (즉시 — 매일 새벽 갱신).
      if (!force) {
        const fromDb = await loadLiveSnapshot();
        if (isCurrentRange(fromDb)) {
          saveCache(fromDb!);
          set({ weekendData: fromDb, weekendLoading: false });
          return;
        }
      }
      // 2순위: 클라이언트에서 Gemini 직접 호출 (cron 이 아직 안 돌았거나 force).
      const data = await fetchWeekendData();
      saveCache(data);
      set({ weekendData: data, weekendLoading: false });
      if (data.error) set({ error: data.error });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      set({ weekendLoading: false, error: msg });
      console.error('[weekendData]', e);
    }
  },

  clearError: () => set({ error: null }),

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const { data: user } = await supabase.auth.getUser();
      const meId = user.user?.id ?? null;
      const [placesRes, visitsRes, wishRes, discRes, profRes] = await Promise.all([
        supabase.from('places').select('*'),
        supabase.from('visits').select('*').order('visited_on', { ascending: false }),
        supabase.from('wishlist').select('*'),
        supabase.from('discoveries').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
      ]);
      if (placesRes.error) throw placesRes.error;
      if (visitsRes.error) throw visitsRes.error;
      if (wishRes.error) throw wishRes.error;
      if (discRes.error) throw discRes.error;
      if (profRes.error) throw profRes.error;
      set({
        places: (placesRes.data ?? []).map(placeFromRow),
        visits: (visitsRes.data ?? []) as Visit[],
        wishlist: (wishRes.data ?? []) as WishlistRow[],
        discoveries: (discRes.data ?? []) as Discovery[],
        profiles: (profRes.data ?? []) as Profile[],
        me: meId,
        loading: false,
      });
    } catch (e: any) {
      set({ loading: false, error: e.message ?? String(e) });
    }
  },

  toggleWish: async placeId => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const exists = get().wishlist.find(w => w.user_id === user.user!.id && w.place_id === placeId);
    if (exists) {
      await supabase.from('wishlist').delete().eq('user_id', user.user.id).eq('place_id', placeId);
    } else {
      await supabase.from('wishlist').insert({ user_id: user.user.id, place_id: placeId });
    }
    await get().refresh();
  },

  addVisit: async (placeId, rating, memo) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    await supabase.from('visits').insert({
      user_id: user.user.id,
      place_id: placeId,
      rating,
      memo: memo || null,
    });
    await get().refresh();
  },

  deleteVisit: async id => {
    await supabase.from('visits').delete().eq('id', id);
    await get().refresh();
  },

  addDiscovery: async input => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    await supabase.from('discoveries').insert({
      user_id: user.user.id,
      title: input.title,
      url: input.url ?? null,
      city: input.city ?? null,
      category: input.category ?? null,
      memo: input.memo ?? null,
      source: input.source ?? detectSource(input.url ?? ''),
    });
    await get().refresh();
  },

  deleteDiscovery: async id => {
    await supabase.from('discoveries').delete().eq('id', id);
    await get().refresh();
  },

  updateProfile: async patch => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const existing = get().profiles.find(p => p.user_id === user.user!.id);
    if (existing) {
      await supabase
        .from('profiles')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('user_id', user.user.id);
    } else {
      await supabase.from('profiles').insert({
        user_id: user.user.id,
        display_name: patch.display_name ?? user.user.email?.split('@')[0] ?? 'me',
        emoji: patch.emoji ?? '😺',
        color: patch.color ?? '#ff9a8b',
      });
    }
    await get().refresh();
  },

  subscribe: () => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => get().refresh(), 300);
    };

    const debouncedRefreshWeekend = () => {
      setTimeout(() => get().refreshWeekend(true), 300);
    };

    const channel = supabase
      .channel('shared-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discoveries' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_snapshot' }, debouncedRefreshWeekend)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  },

  reset: () => {
    clearCache();
    set({
      places: [],
      visits: [],
      wishlist: [],
      discoveries: [],
      profiles: [],
      me: null,
      loading: false,
      error: null,
      weekendData: null,
      weekendLoading: false,
    });
  },
}));

function detectSource(url: string): string | null {
  if (!url) return null;
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return '小红书';
  if (url.includes('dianping.com')) return '大众点评';
  if (url.includes('meituan.com')) return '美团';
  if (url.includes('mafengwo')) return '马蜂窝';
  if (url.includes('ctrip') || url.includes('trip.com')) return '携程';
  if (url.includes('damai')) return '大麦网';
  if (url.includes('weixin') || url.includes('mp.weixin.qq.com')) return '微信';
  if (url.includes('douyin') || url.includes('iesdouyin')) return '抖音';
  if (url.includes('weibo')) return '微博';
  return null;
}
