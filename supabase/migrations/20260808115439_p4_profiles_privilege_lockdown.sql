-- 1. UPDATE 정책이 public(=anon 포함) 대상이고 WITH CHECK 이 없었다.
--    WITH CHECK 이 없으면 id 를 남의 uid 로 바꿔 행을 넘길 수 있다.
drop policy if exists "본인 프로필 수정" on public.profiles;
create policy "본인 프로필 수정"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 2. RLS 는 "어느 행"만 통제하고 "어느 컬럼"은 통제하지 못한다.
--    role 을 스스로 admin 으로 바꾸는 것을 막으려면 컬럼 권한이 필요하다.
--    (주의: 테이블 단위 GRANT 가 살아있으면 이 REVOKE 는 무시된다.
--     실제 적용은 다음 마이그레이션에서 이루어진다.)
revoke update (role, id) on public.profiles from authenticated;
revoke insert (role)     on public.profiles from authenticated;

-- 3. anon 은 profiles 를 만질 이유가 전혀 없다 (RLS 로도 이미 막히지만 이중으로).
revoke select, insert, update, references on public.profiles from anon;
