import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'ko' | 'zh';

type LangState = {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  hydrate: () => Promise<void>;
};

const STORAGE_KEY = 'lang';

export const useLang = create<LangState>(set => ({
  lang: 'ko',
  setLang: async l => {
    await AsyncStorage.setItem(STORAGE_KEY, l);
    set({ lang: l });
  },
  hydrate: async () => {
    const v = (await AsyncStorage.getItem(STORAGE_KEY)) as Lang | null;
    if (v === 'ko' || v === 'zh') set({ lang: v });
  },
}));

const dict = {
  appName: { ko: '우시 주말', zh: '无锡周末' },
  tabWeekend: { ko: '이번 주말', zh: '本周末' },
  tabPlaces: { ko: '장소', zh: '景点' },
  tabVisited: { ko: '방문 기록', zh: '已去过' },
  tabSettings: { ko: '설정', zh: '设置' },
  loginTitle: { ko: '둘만 들어올 수 있어요', zh: '仅供我们两人' },
  loginSub: { ko: '이메일로 매직링크 전송', zh: '通过邮箱发送魔法链接' },
  emailPlaceholder: { ko: '이메일 주소', zh: '邮箱地址' },
  sendMagic: { ko: '로그인 링크 보내기', zh: '发送登录链接' },
  magicSent: { ko: '메일함 확인하세요', zh: '请查看邮箱' },
  weatherTitle: { ko: '날씨', zh: '天气' },
  eventsTitle: { ko: '이번 주말 행사', zh: '本周末活动' },
  recsTitle: { ko: '추천 코스', zh: '推荐路线' },
  noEvents: { ko: '검색된 행사 없음', zh: '暂无活动' },
  noData: { ko: '데이터 없음', zh: '暂无数据' },
  outdoorOk: { ko: '야외 OK', zh: '适合户外' },
  indoorRec: { ko: '실내 추천', zh: '推荐室内' },
  rainProb: { ko: '강수 확률', zh: '降水概率' },
  wantToGo: { ko: '가고싶어', zh: '想去' },
  wantedByBoth: { ko: '둘 다 가고싶어함', zh: '两人都想去' },
  vote: { ko: '이번 주말 투표', zh: '为本周末投票' },
  voted: { ko: '투표함', zh: '已投票' },
  markVisited: { ko: '다녀옴 표시', zh: '标记为已去过' },
  rating: { ko: '평점', zh: '评分' },
  memo: { ko: '메모', zh: '备注' },
  save: { ko: '저장', zh: '保存' },
  delete: { ko: '삭제', zh: '删除' },
  filterAll: { ko: '전체', zh: '全部' },
  filterByCity: { ko: '도시별', zh: '按城市' },
  signOut: { ko: '로그아웃', zh: '退出登录' },
  langKo: { ko: '한국어', zh: '韩语' },
  langZh: { ko: '中文', zh: '中文' },
  generatedAt: { ko: '갱신', zh: '更新于' },
  travelTime: { ko: '편도', zh: '单程' },
  minutes: { ko: '분', zh: '分钟' },
  hours: { ko: '시간', zh: '小时' },
  cost: { ko: '비용', zh: '费用' },
  date: { ko: '데이트', zh: '约会' },
  notMember: { ko: '아직 멤버로 등록되지 않은 이메일입니다.', zh: '此邮箱尚未被授权。' },
  consensusTitle: { ko: '둘 다 좋아한 곳', zh: '两人都喜欢' },
  bothVotedTitle: { ko: '이번 주말 합의', zh: '本周末共识' },
  noConsensus: { ko: '아직 둘 다 표시한 곳이 없어요', zh: '还没有共同标记的地方' },
  noConsensusVote: { ko: '둘 다 투표해야 합의됨', zh: '需要两人都投票' },
  navigate: { ko: '길찾기', zh: '导航' },
  share: { ko: '공유', zh: '分享' },
  customCta: { ko: '✨ 직접 조건 걸어서 추천받기', zh: '✨ 自定义条件推荐' },
  customCtaSub: { ko: '도시·예산·거리·날씨로 즉석 추천', zh: '按城市·预算·距离·天气即时推荐' },
  customTitle: { ko: '맞춤 추천', zh: '自定义推荐' },
  filterCities: { ko: '도시', zh: '城市' },
  filterCategories: { ko: '카테고리', zh: '类别' },
  filterCost: { ko: '예산', zh: '预算' },
  filterTravel: { ko: '최대 편도 시간', zh: '最长单程时间' },
  filterWeather: { ko: '날씨 선호', zh: '天气偏好' },
  filterDateScore: { ko: '최소 데이트 점수', zh: '最低约会评分' },
  filterStartDate: { ko: '시작 날짜 (선택)', zh: '开始日期(可选)' },
  filterExcludeRecent: { ko: '최근 30일 내 다녀온 곳 제외', zh: '排除近30天去过的' },
  noLimit: { ko: '제한 없음', zh: '不限' },
  weatherAny: { ko: '상관없음', zh: '不限' },
  weatherIndoor: { ko: '실내', zh: '室内' },
  weatherOutdoor: { ko: '야외', zh: '户外' },
  catNature: { ko: '자연', zh: '自然' },
  catCulture: { ko: '문화', zh: '文化' },
  catFood: { ko: '먹거리', zh: '美食' },
  catShopping: { ko: '쇼핑', zh: '购物' },
  catDate: { ko: '데이트', zh: '约会' },
  catAncient: { ko: '고진', zh: '古镇' },
  catMuseum: { ko: '박물관', zh: '博物馆' },
  catPark: { ko: '공원', zh: '公园' },
  catTemple: { ko: '사찰', zh: '寺庙' },
  catTheme: { ko: '테마파크', zh: '主题公园' },
  catWaterTown: { ko: '수향', zh: '水乡' },
  costFree: { ko: '무료', zh: '免费' },
  costCheap: { ko: '저렴', zh: '便宜' },
  costMedium: { ko: '보통', zh: '中等' },
  costExpensive: { ko: '비쌈', zh: '昂贵' },
  generateBtn: { ko: '추천 받기', zh: '生成推荐' },
  resetBtn: { ko: '초기화', zh: '重置' },
  resultsTitle: { ko: '추천 결과', zh: '推荐结果' },
  noMatches: { ko: '조건에 맞는 곳이 없어요. 필터를 줄여보세요.', zh: '没有符合条件的地方,请放宽筛选' },
  discoveriesTitle: { ko: '🔖 내가 발견한 곳', zh: '🔖 我发现的地方' },
  discoveriesSub: { ko: '샤오홍슈·위챗 등에서 본 곳 빠르게 저장', zh: '把小红书·微信看到的快速保存' },
  addDiscovery: { ko: '발견 추가', zh: '添加发现' },
  noDiscoveries: { ko: '아직 발견한 곳이 없어요', zh: '还没有发现' },
  discoveryTitle: { ko: '제목 (필수)', zh: '标题(必填)' },
  discoveryUrl: { ko: 'URL (선택)', zh: '链接(可选)' },
  discoveryCity: { ko: '도시 (선택)', zh: '城市(可选)' },
  discoveryMemo: { ko: '메모', zh: '备注' },
  openLink: { ko: '링크 열기', zh: '打开链接' },
  profileLabel: { ko: '내 프로필', zh: '我的资料' },
  nicknameLabel: { ko: '닉네임', zh: '昵称' },
  emojiLabel: { ko: '이모지', zh: '表情' },
  editProfile: { ko: '수정', zh: '编辑' },
  bothLabel: { ko: '둘 다', zh: '两人' },
  by: { ko: '· ', zh: '· ' },
} as const;

export type DictKey = keyof typeof dict;

export function t(key: DictKey, lang: Lang): string {
  return dict[key][lang];
}

export function placeName(place: { nameKo: string; nameZh: string }, lang: Lang): string {
  return lang === 'ko' ? place.nameKo : place.nameZh;
}
