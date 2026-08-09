-- ============================================================================
-- T10 — anon 역할의 함수 실행 권한 회수
--
-- Supabase 는 public 스키마에 함수를 만들면 기본 권한으로 anon·authenticated
-- 에게 EXECUTE 를 붙인다. T1 은 `revoke all ... from public` 만 했는데,
-- 그건 PUBLIC 에 붙은 권한을 떼는 것이라 anon 에 '직접' 부여된 권한은
-- 그대로 남는다. 그래서 로그인하지 않은 사람도 /rest/v1/rpc/approve_member
-- 를 부를 수 있는 상태였다(데이터베이스 린터가 잡아냈다).
--
-- 실제로 뚫리지는 않는다. approve_member·reject_member 는 함수 안에서
-- current_access_level() 을 보는데 anon 은 auth.uid() 가 null 이라 0 이고,
-- log_event 는 uid 가 없으면 아무것도 하지 않는다. 그래도 "막혀 있어야 할
-- 문이 열려 있는데 안쪽 자물쇠 덕에 무사한" 상태를 남겨 둘 이유가 없다.
--
-- handle_new_user 는 트리거 전용이므로 authenticated 에게서도 뗀다.
-- ============================================================================

revoke all on function public.approve_member(uuid)                    from anon;
revoke all on function public.reject_member(uuid)                     from anon;
revoke all on function public.current_access_level()                  from anon;
revoke all on function public.log_event(text, text, jsonb)            from anon;
-- handle_new_user 는 anon·authenticated 에 직접 부여된 게 아니라 PUBLIC 을
-- 통해 새어 나가고 있었다(ACL 의 `=X/postgres`). 역할 이름으로 회수해도
-- 안 떨어지므로 PUBLIC 에서 뗀다.
revoke all on function public.handle_new_user()                       from public, anon, authenticated;

-- 회원가입 시 auth.users 에 넣는 주체는 supabase_auth_admin 이다. 트리거
-- 함수의 실행 권한은 CREATE TRIGGER 시점에만 검사되므로 없어도 도는 것이
-- 맞지만, 가입이 통째로 막히는 쪽의 대가가 너무 커서 명시해 둔다.
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- 예전부터 있던 함수. 같은 이유로 함께 정리한다.
revoke all on function public.is_admin() from anon;
