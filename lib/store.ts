import { create } from 'zustand';
import { supabase } from './supabase';
import type { Place, WeeklySnapshot, Visit, WishlistRow, VoteRow, Discovery, Profile } from './types';
import { fetchWeekendData, isFresh, type WeekendData } from './weekendData';

type State = {
  places: Place[];
  weekly: WeeklySnapshot | null;
  visits: Visit[];
  wishlist: WishlistRow[];
  votes: VoteRow[];
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
  toggleVote: (placeId: string) => Promise<void>;
  addVisit: (placeId: string, rating: number | null, memo: string) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
  addDiscovery: (input: { title: string; url?: string; city?: string; category?: string; memo?: string; source?: string }) => Promise<void>;
  deleteDiscovery: (id: string) => Promise<void>;
  updateProfile: (patch: { display_name?: string; emoji?: string; color?: string }) => Promise<void>;
  subscribe: () => () => void;
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
  weekly: null,
  visits: [],
  wishlist: [],
  votes: [],
  discoveries: [],
  profiles: [],
  me: null,
  loading: false,
  error: null,
  weekendData: null,
  weekendLoading: false,

  refreshWeekend: async (force = false) => {
    if (!force && isFresh(get().weekendData)) return;
    set({ weekendLoading: true });
    try {
      const data = await fetchWeekendData();
      set({ weekendData: data, weekendLoading: false });
    } catch (e: any) {
      set({ weekendLoading: false });
      console.error('[weekendData]', e);
    }
  },

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const { data: user } = await supabase.auth.getUser();
      const meId = user.user?.id ?? null;
      const [placesRes, weeklyRes, visitsRes, wishRes, votesRes, discRes, profRes] = await Promise.all([
        supabase.from('places').select('*'),
        supabase
          .from('weekly_snapshots')
          .select('*')
          .order('weekend_saturday', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('visits').select('*').order('visited_on', { ascending: false }),
        supabase.from('wishlist').select('*'),
        supabase.from('weekend_votes').select('*'),
        supabase.from('discoveries').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
      ]);
      if (placesRes.error) throw placesRes.error;
      if (weeklyRes.error) throw weeklyRes.error;
      if (visitsRes.error) throw visitsRes.error;
      if (wishRes.error) throw wishRes.error;
      if (votesRes.error) throw votesRes.error;
      if (discRes.error) throw discRes.error;
      if (profRes.error) throw profRes.error;
      set({
        places: (placesRes.data ?? []).map(placeFromRow),
        weekly: (weeklyRes.data as WeeklySnapshot | null) ?? null,
        visits: (visitsRes.data ?? []) as Visit[],
        wishlist: (wishRes.data ?? []) as WishlistRow[],
        votes: (votesRes.data ?? []) as VoteRow[],
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

  toggleVote: async placeId => {
    const w = get().weekly;
    if (!w) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const exists = get().votes.find(
      v => v.user_id === user.user!.id && v.weekend_saturday === w.weekend_saturday && v.place_id === placeId,
    );
    if (exists) {
      await supabase
        .from('weekend_votes')
        .delete()
        .eq('user_id', user.user.id)
        .eq('weekend_saturday', w.weekend_saturday)
        .eq('place_id', placeId);
    } else {
      await supabase.from('weekend_votes').insert({
        user_id: user.user.id,
        weekend_saturday: w.weekend_saturday,
        place_id: placeId,
      });
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

    const channel = supabase
      .channel('shared-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekend_votes' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discoveries' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_snapshots' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, debouncedRefresh)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
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
