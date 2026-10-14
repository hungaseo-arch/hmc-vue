-- ============================================================================
-- T26 — 가입 즉시 교인(1등급) 열람 (2026-10 요청)
--
-- 지금까지는 가입하면 'pending' 으로 들어와 관리자가 승인해야 교인 자료가
-- 열렸다. 이제 가입과 동시에 'active' · 1등급이 된다. 교회소식·주보·사진앨범·
-- 선교소식·연락처가 모두 가입만으로 열린다는 뜻이다(요청자 확인 완료).
-- 막아야 할 계정은 회원 관리 화면에서 '정지'(suspended)로 돌린다.
--
-- 관리자(2등급) 이상은 여전히 사람이 준다(set_member_level).
-- 선행: T14(handle_new_user 최신판). 본문은 T14 와 같고 마지막 세 칸만 더했다.
-- ============================================================================

-- 1. 가입 트리거: 승인 상태·1등급·승인 시각을 함께 채운다. approved_by 는
--    사람이 누른 것이 아니므로 비워 둔다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_gender text := nullif(trim(new.raw_user_meta_data->>'gender'), '');
begin
  if v_gender not in ('남', '여') then
    v_gender := null;
  end if;

  insert into public.profiles (id, name, phone, gender, provider, member_status, access_level, approved_at)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
      nullif(trim(new.raw_user_meta_data->>'preferred_username'), ''),
      '이름 미설정'
    ), 100),
    left(nullif(trim(new.raw_user_meta_data->>'phone'), ''), 50),
    v_gender,
    coalesce(new.raw_app_meta_data->>'provider', 'unknown'),
    'active',
    1,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- T10 의 권한 정리를 다시 확인한다(create or replace 는 권한을 그대로 두지만 명시).
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- 2. 지금 승인 대기 중인 분들을 일괄 승인한다. 반려·정지된 분은 건드리지 않는다.
update public.profiles
   set member_status = 'active',
       access_level  = greatest(access_level, 1),
       approved_at   = coalesce(approved_at, now())
 where member_status = 'pending';
