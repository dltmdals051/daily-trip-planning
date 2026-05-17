# 우시 주말 플래너 (Wuxi Weekend Planner)

우시 거주 한중 커플(특히 한국인 + 산동 출신 여친)을 위한 매주 자동 갱신 주말 코스 추천 사이트.

## 동작 방식

1. **장소 DB** (`data/places.json`) — 우시 + 강소성 + 인접 상하이/항저우 큐레이션
2. **매주 금요일 18:00 UTC** GitHub Actions가 자동 실행:
   - OpenMeteo로 토/일 우시 날씨 가져옴
   - Claude API (`claude-sonnet-4-6`) + 웹검색으로 이번 주말 행사 검색
   - `lib/recommend.ts`의 점수 로직으로 8개 추천 선정 (날씨/계절/방문기록/거리/행사 가중치)
   - `data/weekly.json`에 커밋
3. **GitHub Pages**가 정적 사이트로 배포 → 휴대폰에서 북마크해서 보면 됨

## 셋업

### 1. 로컬 개발

```bash
npm install
npm run dev          # http://localhost:3000
npm run generate     # 주말 데이터 한 번 생성 (.env에 ANTHROPIC_API_KEY 필요)
```

### 2. GitHub 시크릿 설정

레포 Settings → Secrets and variables → Actions:

- `ANTHROPIC_API_KEY` — https://console.anthropic.com 에서 발급

### 3. GitHub Pages 활성화

Settings → Pages → Source: **GitHub Actions** 선택.
첫 푸시 후 워크플로우가 돌면 `https://<유저>.github.io/<레포명>/` 에서 확인.

### 4. (선택) 수동 트리거

Actions 탭 → "Weekly Update" → Run workflow. 데이터 갱신 즉시 테스트 가능.

## 다녀온 곳 기록

`data/visited.json`에 추가:

```json
{
  "visits": [
    { "id": "wuxi-yuantouzhu", "date": "2026-04-12" },
    { "id": "suzhou-pingjiang", "date": "2026-03-29" }
  ]
}
```

추천 로직이 자동으로:
- 30일 이내 방문 → 추천 제외
- 90일 이내 → 후순위
- 180일 이상 → 다시 추천

`id`는 `data/places.json`의 ID 참고. 직접 PR/커밋으로 관리.

## 장소 추가하기

`data/places.json`에 새 항목 추가. 필드는 `lib/types.ts`의 `Place` 타입 참고.

## 추천 점수 튜닝

`lib/recommend.ts`에서 가중치 조정:
- `weatherFit` — 비/폭염일 때 야외 페널티
- `seasonFit` — 계절 베스트일 때 보너스
- `recencyPenalty` — 최근 방문 페널티
- `eventBoost` — 같은 도시 행사 있으면 부스트
- `distancePenalty` — 거리별 페널티

## 파일 구조

```
app/                    Next.js App Router (정적 export)
  page.tsx              메인 대시보드
  layout.tsx
  globals.css
lib/
  types.ts              타입 정의
  recommend.ts          추천 로직 (가중치)
  weather.ts            OpenMeteo 클라이언트
  events.ts             Claude API + 웹검색
scripts/
  generate-weekly.ts    매주 실행되는 데이터 생성 스크립트
data/
  places.json           큐레이션된 장소 DB
  visited.json          방문 기록 (수동 관리)
  weekly.json           자동 생성됨 (날씨+행사+추천)
.github/workflows/
  weekly-update.yml     매주 금요일 데이터 갱신
  deploy-pages.yml      Pages 배포
```
