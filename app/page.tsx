import weekly from '@/data/weekly.json';
import type { WeeklyData } from '@/lib/types';

const data = weekly as unknown as WeeklyData;

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatGenerated(iso: string): string {
  const d = new Date(iso);
  if (d.getFullYear() < 2000) return '아직 생성 안 됨 (placeholder)';
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Shanghai' });
}

export default function HomePage() {
  const { weather, events, recommendations, weekendDates, generatedAt, modelNotes } = data;

  return (
    <main className="container">
      <header className="hero">
        <h1>우시 주말 플래너</h1>
        <p>
          {formatDate(weekendDates.saturday)} (토) ~ {formatDate(weekendDates.sunday)} (일) ·
          마지막 갱신 {formatGenerated(generatedAt)}
        </p>
      </header>

      <section>
        <h2>날씨</h2>
        {weather.length === 0 ? (
          <div className="empty">날씨 데이터가 아직 없음 (워크플로우 실행 필요)</div>
        ) : (
          <div className="weather-row">
            {weather.map(w => (
              <div key={w.date} className={`weather-card ${w.isOutdoorFriendly ? 'good' : w.rainChance >= 60 ? 'bad' : ''}`}>
                <div className="date">
                  {formatDate(w.date)} ({w.dayOfWeek})
                </div>
                <div className="temp">{w.tempMin}° / {w.tempMax}°</div>
                <div className="desc">{w.description}</div>
                <div className="rain">강수 확률 {w.rainChance}% · {w.isOutdoorFriendly ? '야외 OK' : '실내 추천'}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>이번 주말 행사</h2>
        {events.length === 0 ? (
          <div className="empty">이번 주 검색된 행사 없음</div>
        ) : (
          <div className="event-list">
            {events.map((e, i) => (
              <div key={i} className="event-card">
                <div className="meta">{e.city} · {e.dateRange}</div>
                <div className="title">{e.title}</div>
                <div className="summary">{e.summary}</div>
                {e.url && (
                  <a href={e.url} target="_blank" rel="noreferrer">자세히 보기 →</a>
                )}
              </div>
            ))}
          </div>
        )}
        {modelNotes && (
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
            검색 메모: {modelNotes}
          </p>
        )}
      </section>

      <section>
        <h2>추천 코스</h2>
        {recommendations.length === 0 ? (
          <div className="empty">추천 데이터 없음</div>
        ) : (
          <div className="rec-list">
            {recommendations.map((r, i) => (
              <div key={r.place.id} className="rec-card">
                <span className="rank">#{i + 1} · {r.score.toFixed(1)}점</span>
                <div>
                  <div className="name-ko">{r.place.nameKo}</div>
                  <div className="name-zh">{r.place.nameZh} · {r.place.city}</div>
                </div>
                <div className="meta-row">
                  <span>편도 {r.place.travelMinutesFromWuxi}분</span>
                  <span>{r.place.durationHours[0]}~{r.place.durationHours[1]}h</span>
                  <span>{r.place.cost}</span>
                  <span>데이트 {r.place.dateScore}/10</span>
                </div>
                <div className="notes">{r.place.notes}</div>
                {r.place.tips && (
                  <div className="notes" style={{ color: 'var(--accent-soft)' }}>💡 {r.place.tips}</div>
                )}
                {r.reasons.length > 0 && (
                  <ul className="reasons">
                    {r.reasons.map((reason, j) => (
                      <li key={j}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <footer>
        OpenMeteo + Claude · 매주 금요일 03:00 (KST) 자동 갱신
      </footer>
    </main>
  );
}
