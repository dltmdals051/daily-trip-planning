import { create } from 'zustand';
import { supabase } from './supabase';
import type { Place, WeeklySnapshot, Visit, WishlistRow, VoteRow } from './types';

type State = {
  places: Place[];
  weekly: WeeklySnapshot | null;
  visits: Visit[];
  wishlist: WishlistRow[];
  votes: VoteRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggleWish: (placeId: string) => Promise<void>;
  toggleVote: (placeId: string) => Promise<void>;
  addVisit: (placeId: string, rating: number | null, memo: string) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
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
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [placesRes, weeklyRes, visitsRes, wishRes, votesRes] = await Promise.all([
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
      ]);
      if (placesRes.error) throw placesRes.error;
      if (weeklyRes.error) throw weeklyRes.error;
      if (visitsRes.error) throw visitsRes.error;
      if (wishRes.error) throw wishRes.error;
      if (votesRes.error) throw votesRes.error;
      set({
        places: (placesRes.data ?? []).map(placeFromRow),
        weekly: (weeklyRes.data as WeeklySnapshot | null) ?? null,
        visits: (visitsRes.data ?? []) as Visit[],
        wishlist: (wishRes.data ?? []) as WishlistRow[],
        votes: (votesRes.data ?? []) as VoteRow[],
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
}));
