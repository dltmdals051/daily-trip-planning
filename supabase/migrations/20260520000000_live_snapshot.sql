-- 매일 새벽 cron 이 생성하는 "오늘 ~ 다음 일요일" 스냅샷.
-- 싱글톤 row (id = 1) 로 항상 덮어쓰기.

create table if not exists live_snapshot (
  id int primary key check (id = 1),
  start_date date not null,
  end_date date not null,
  weather jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  ai_recommendations jsonb not null default '[]'::jsonb,
  notes text,
  generated_at timestamptz not null default now()
);

alter table live_snapshot enable row level security;

drop policy if exists "members read live snapshot" on live_snapshot;
create policy "members read live snapshot" on live_snapshot for select using (is_member());

-- Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table live_snapshot;
  exception when duplicate_object then null;
  end;
end$$;
