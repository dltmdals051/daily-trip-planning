// 클라이언트는 Gemini 를 직접 호출하지 않고 Supabase Edge Function 을 통함.
// 중국에서 Google API 가 막혀있어서 우회 필수.
// Edge Function 이 홍콩 리전에서 Gemini 호출 + Google Search grounding 수행.

import { supabase } from './supabase';
import type { AIPlace, AIRecommendResponse, CustomFilters } from './types';

export async function aiRecommend(
  filters: CustomFilters,
  _recentVisitNames: string[], // 호환성 위해 인자 유지 (edge 가 직접 fetch)
): Promise<AIRecommendResponse> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      places?: AIPlace[];
      notes?: string | null;
      error?: string;
    }>('ai-recommend', {
      body: { mode: 'custom', filters },
    });
    if (error) return { places: [], error: error.message };
    if (!data) return { places: [], error: '빈 응답' };
    if (data.error) return { places: [], error: data.error };
    return { places: data.places ?? [], notes: data.notes ?? null };
  } catch (e) {
    return { places: [], error: `Edge Function 호출 실패: ${(e as Error).message}` };
  }
}

export function sourceDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('xiaohongshu') || host.includes('xhslink')) return '小红书';
    if (host.includes('ctrip') || host.includes('trip.com')) return '携程';
    if (host.includes('dianping')) return '大众点评';
    if (host.includes('meituan')) return '美团';
    if (host.includes('mafengwo')) return '马蜂窝';
    if (host.includes('damai')) return '大麦';
    if (host.includes('weixin') || host.includes('mp.weixin')) return '微信';
    if (host.includes('zh.wikipedia') || host.includes('wikipedia')) return 'Wiki';
    if (host.includes('baidu') || host.includes('bkimg')) return '百度';
    if (host.includes('douyin')) return '抖音';
    if (host.includes('weibo')) return '微博';
    return host.replace(/^www\./, '');
  } catch {
    return null;
  }
}
