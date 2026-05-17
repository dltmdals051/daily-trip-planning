-- Wuxi Weekend Planner schema

create extension if not exists "uuid-ossp";

-- 장소 (places.json에서 시드. seed-places.ts가 upsert)
create table if not exists places (
  id text primary key,
  name_ko text not null,
  name_zh text not null,
  city text not null,
  province text not null,
  categories text[] not null default '{}',
  weather text not null,
  travel_minutes_from_wuxi int not null,
  best_seasons text[] not null default '{}',
  date_score int not null,
  cost text not null,
  duration_hours int[] not null,
  notes text,
  tips text,
  updated_at timestamptz not null default now()
);

-- 매주 갱신되는 데이터 (GitHub Actions가 upsert)
create table if not exists weekly_snapshots (
  id uuid primary key default uuid_generate_v4(),
  weekend_saturday date not null unique,
  weekend_sunday date not null,
  weather jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  model_notes text,
  generated_at timestamptz not null default now()
);

create index if not exists weekly_snapshots_sat_idx on weekly_snapshots(weekend_saturday desc);

-- 가고싶어 (둘이 각자 표시)
create table if not exists wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null references places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

-- 방문 기록 (평점/메모)
create table if not exists visits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null references places(id) on delete cascade,
  visited_on date not null default current_date,
  rating int check (rating between 1 and 5),
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists visits_user_place_idx on visits(user_id, place_id);
create index if not exists visits_visited_on_idx on visits(visited_on desc);

-- 주말 코스 투표 (이번 주말 어디 갈지)
create table if not exists weekend_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  weekend_saturday date not null,
  place_id text not null references places(id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key (user_id, weekend_saturday, place_id)
);

-- 멤버 화이트리스트 (둘만 가입 허용)
create table if not exists allowed_members (
  email text primary key,
  display_name text,
  invited_at timestamptz not null default now()
);

-- RLS
alter table places enable row level security;
alter table weekly_snapshots enable row level security;
alter table wishlist enable row level security;
alter table visits enable row level security;
alter table weekend_votes enable row level security;
alter table allowed_members enable row level security;

-- 둘이 가입 가능한 이메일인지 확인하는 헬퍼
create or replace function is_member()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from allowed_members am
    where am.email = (select email from auth.users where id = auth.uid())
  );
$$;

-- places: 멤버는 읽기만
drop policy if exists "members read places" on places;
create policy "members read places" on places for select using (is_member());

-- weekly_snapshots: 멤버는 읽기만
drop policy if exists "members read weekly" on weekly_snapshots;
create policy "members read weekly" on weekly_snapshots for select using (is_member());

-- wishlist: 본인 것만 CRUD, 멤버는 서로 것 읽기 가능
drop policy if exists "members read wishlist" on wishlist;
create policy "members read wishlist" on wishlist for select using (is_member());
drop policy if exists "own wishlist insert" on wishlist;
create policy "own wishlist insert" on wishlist for insert with check (auth.uid() = user_id and is_member());
drop policy if exists "own wishlist delete" on wishlist;
create policy "own wishlist delete" on wishlist for delete using (auth.uid() = user_id);

-- visits: 본인 것만 CUD, 멤버는 서로 읽기 가능
drop policy if exists "members read visits" on visits;
create policy "members read visits" on visits for select using (is_member());
drop policy if exists "own visits insert" on visits;
create policy "own visits insert" on visits for insert with check (auth.uid() = user_id and is_member());
drop policy if exists "own visits update" on visits;
create policy "own visits update" on visits for update using (auth.uid() = user_id);
drop policy if exists "own visits delete" on visits;
create policy "own visits delete" on visits for delete using (auth.uid() = user_id);

-- weekend_votes: 본인 것만 CUD, 멤버는 서로 읽기 가능
drop policy if exists "members read votes" on weekend_votes;
create policy "members read votes" on weekend_votes for select using (is_member());
drop policy if exists "own votes insert" on weekend_votes;
create policy "own votes insert" on weekend_votes for insert with check (auth.uid() = user_id and is_member());
drop policy if exists "own votes delete" on weekend_votes;
create policy "own votes delete" on weekend_votes for delete using (auth.uid() = user_id);

-- allowed_members: 멤버 본인만 자기 row 읽기 가능 (관리자는 service_role로 추가)
drop policy if exists "self read allowed" on allowed_members;
create policy "self read allowed" on allowed_members for select using (
  email = (select email from auth.users where id = auth.uid())
);
