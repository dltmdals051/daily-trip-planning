# 우시 주말 (Wuxi Weekend) 모바일 앱

Expo React Native 앱. 우시 거주 한중 커플 둘이 매 주말 갈 곳을 공유하고 투표·기록하기 위한 사적인 앱.

## 핵심 기능

- **이번 주말 탭** — 토/일 날씨 + Claude로 검색한 이번 주 행사 + 추천 코스 (8개) + 둘이 투표
  - 상단에 **합의 박스**: 둘 다 ♥한 곳 / 둘 다 투표한 곳 즉시 표시
- **장소 탭** — 큐레이션된 우시·강소성 명소 30개+. 도시별 필터, '가고싶어' 하트, '다녀옴' 등록
- **방문 기록 탭** — 둘이 같이 본 공유 방문 기록 (평점·메모)
- **설정 탭** — 한국어 / 中文 토글, 로그아웃
- 모든 장소 카드에 **🧭 길찾기 (高德 앱)** + **↗ 위챗 공유** 버튼
- 로그인은 **이메일 → 6자리 OTP 코드** 입력 (deep-link 불필요)
- 🔖 **발견** — 샤오홍슈/위챗에서 본 곳 URL+메모 저장, 출처 자동 태깅
- 👥 **누가 했는지** — `profiles` 테이블로 닉네임+이모지 관리, 카드마다 누가 ♥/투표/방문/발견했는지 표시
- ⚡ **실시간** — Supabase Realtime 구독, 여친이 ♥하면 새로고침 없이 즉시 내 화면에 반영

## 기술 스택

| Layer | Tool |
| --- | --- |
| 모바일 | Expo SDK 51 + React Native, Expo Router |
| 백엔드 | Supabase (Postgres + Auth) |
| 상태 | Zustand |
| 데이터 갱신 | GitHub Actions (매주 금요일 18:00 UTC) |
| 날씨 | Open-Meteo (무료, 키 불필요) |
| 행사 검색 | Claude Sonnet 4.6 + `web_search` tool |

## 셋업

### 1. Supabase 프로젝트 생성

1. https://supabase.com 에서 새 프로젝트 (Hong Kong / Singapore 리전이 중국에서 빠름)
2. SQL Editor에서 `supabase/migrations/20260517000000_init.sql` 실행
3. Authentication → Providers → Email 켜기 (Magic Link + Email OTP 둘 다 자동 활성화)
4. Authentication → Email Templates → "Magic Link" 본문에 `{{ .Token }}` (6자리 코드) 가 들어있는지 확인. 보통 기본 템플릿에 포함됨
5. **둘만 가입 허용:**
   SQL Editor에서 본인+여친 이메일 추가:
   ```sql
   insert into allowed_members(email, display_name) values
     ('me@example.com', '나'),
     ('gf@example.com', '여친');
   ```

### 2. GitHub Secrets

레포 Settings → Secrets and variables → Actions:

| Name | 출처 |
| --- | --- |
| `SUPABASE_URL` | Supabase Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API → service_role (절대 공개 금지) |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |

### 3. 장소 시드 (최초 1회)

GitHub Actions 탭 → "Seed Places (manual)" → Run workflow.
`data/places.json` 의 30개 장소가 Supabase `places` 테이블에 들어감.
이후 장소를 추가/수정하면 다시 실행.

### 4. 매주 자동 갱신 확인

"Weekly Update (Supabase)" 워크플로우를 한 번 수동 실행 → 다음 주말 날씨/행사/추천이 Supabase에 들어감.

### 5. 모바일 앱 실행

```bash
npm install
cp .env.example .env.local
# .env.local 에 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 채움
npm start
```

Expo Go 앱으로 QR 스캔 → 폰에서 바로 실행.

### 6. APK / TestFlight 빌드

EAS 사용:

```bash
npx eas-cli build --platform android --profile preview   # APK
npx eas-cli build --platform ios --profile preview       # TestFlight
```

빌드된 APK를 위챗으로 여친한테 공유 → 설치. iOS는 TestFlight 초대.

## 파일 구조

```
app/                              Expo Router (file-based)
  _layout.tsx                     세션 가드
  login.tsx                       매직링크 로그인
  (tabs)/
    _layout.tsx                   탭 네비
    index.tsx                     이번 주말
    places.tsx                    장소 (필터/하트/방문등록)
    visited.tsx                   방문 기록
    settings.tsx                  언어/로그아웃
components/cards/
  WeatherCard.tsx
  EventCard.tsx
  PlaceCard.tsx
lib/
  types.ts                        공용 타입
  supabase.ts                     Supabase 클라이언트
  store.ts                        Zustand (서버 상태)
  i18n.ts                         한/중 사전
  theme.ts                        다크 테마
  recommend.ts                    추천 점수 로직 (스크립트 공용)
  share.ts                        高德 길찾기 + 시스템 공유 시트
scripts/
  seed-places.ts                  places.json → Supabase
  generate-weekly.ts              매주 날씨/행사/추천 → Supabase
  lib/
    weather.ts                    Open-Meteo
    events.ts                     Claude + web_search
supabase/migrations/
  20260517000000_init.sql         초기 스키마 + RLS
data/
  places.json                     큐레이션된 장소 (소스 오브 트루스)
.github/workflows/
  weekly-update.yml               매주 금요일 cron
  seed.yml                        수동 시드
```

## 추천 점수 튜닝

`lib/recommend.ts`:
- 날씨 (비/폭염): 야외 -5 / 실내 +3
- 계절 베스트: +2
- 최근 30일 방문: -10 (제외), 90일: -3, 180일: -1
- 같은 도시에 이번 주말 행사: +4
- 거리: 30분 이내 +1, 90분 초과 -2
- 데이트 점수 8↑: +1

## 장소 추가하기

1. `data/places.json` 에 새 항목 추가 (`lib/types.ts` 의 `Place` 타입 참고)
2. GitHub Actions → "Seed Places" 실행
3. 다음 generate에서 추천 풀에 자동 포함
