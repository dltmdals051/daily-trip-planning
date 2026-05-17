-- 발견 (둘이 외부에서 본 좋은 곳/행사를 빠르게 저장)
create table if not exists discoveries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text,
  title text not null,
  city text,
  category text,
  memo text,
  source text,
  promoted_to_place_id text references places(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists discoveries_created_idx on discoveries(created_at desc);

alter table discoveries enable row level security;

drop policy if exists "members read discoveries" on discoveries;
create policy "members read discoveries" on discoveries for select using (is_member());

drop policy if exists "own discoveries insert" on discoveries;
create policy "own discoveries insert" on discoveries for insert with check (auth.uid() = user_id and is_member());

drop policy if exists "own discoveries update" on discoveries;
create policy "own discoveries update" on discoveries for update using (auth.uid() = user_id);

drop policy if exists "own discoveries delete" on discoveries;
create policy "own discoveries delete" on discoveries for delete using (auth.uid() = user_id);
