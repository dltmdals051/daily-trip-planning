-- 프로필 (닉네임/이모지)
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  emoji text not null default '😺',
  color text not null default '#ff9a8b',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- 멤버는 서로의 프로필 읽기 가능 (이름 표시용)
drop policy if exists "members read profiles" on profiles;
create policy "members read profiles" on profiles for select using (is_member());

-- 본인 프로필 upsert/update
drop policy if exists "own profile upsert" on profiles;
create policy "own profile upsert" on profiles for insert with check (auth.uid() = user_id and is_member());

drop policy if exists "own profile update" on profiles;
create policy "own profile update" on profiles for update using (auth.uid() = user_id);

-- 첫 로그인 시 자동으로 프로필 생성 (이메일 prefix를 닉네임으로)
create or replace function ensure_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into profiles (user_id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function ensure_profile();

-- Realtime 활성화: 공유 테이블들 실시간 구독 가능하도록 publication에 추가
-- (이미 추가돼 있으면 에러나니까 안전하게 처리)
do $$
begin
  begin
    alter publication supabase_realtime add table wishlist;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table weekend_votes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table visits;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table discoveries;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table weekly_snapshots;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table profiles;
  exception when duplicate_object then null;
  end;
end$$;
