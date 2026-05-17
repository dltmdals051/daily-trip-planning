-- Supabase 가 최근 auth.users 테이블 SELECT 권한을 제한해서
-- RLS 안에서 "select email from auth.users" 호출하면 "permission denied for table users" 발생.
-- JWT claim 에서 직접 email 을 뽑는 방식으로 변경 (Supabase 공식 권장).

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_members am
    where am.email = (auth.jwt() ->> 'email')
  );
$$;

drop policy if exists "self read allowed" on public.allowed_members;
create policy "self read allowed" on public.allowed_members for select using (
  email = (auth.jwt() ->> 'email')
);
