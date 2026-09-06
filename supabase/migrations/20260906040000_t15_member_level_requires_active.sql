-- ═════════════════════════════════════════════════════════════════════════
-- T15. 등급은 승인된 교인에게만
--
--  T14 로 is_admin() 이 current_access_level() 을 따르게 되어, 승인 전인
--  사람에게 등급 2 를 줘도 실제 권한은 따라가지 않는다. 그래도 "등급 2 인데
--  대기 중" 인 행이 남으면 명부가 읽기 어려워지고, 나중에 승인만 하면
--  아무도 의도하지 않은 관리자가 생긴다. 화면(MemberApprovalPage)에서도
--  막지만, 규칙은 서버가 갖고 있어야 한다.
-- ═════════════════════════════════════════════════════════════════════════
create or replace function public.set_member_level(p_target uuid, p_level smallint)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_status text;
begin
  if (select public.current_access_level()) < 2 then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  if p_level not in (0, 1, 2) then
    raise exception '등급은 0, 1, 2 중 하나여야 합니다.' using errcode = '22023';
  end if;

  if p_target = (select auth.uid()) and p_level < 2 then
    raise exception '자기 자신의 관리자 권한은 내릴 수 없습니다.' using errcode = '22023';
  end if;

  select member_status into v_status from public.profiles where id = p_target;

  if v_status is null then
    raise exception '대상을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  if v_status <> 'active' then
    raise exception '승인된 교인에게만 등급을 줄 수 있습니다.' using errcode = '22023';
  end if;

  update public.profiles
     set access_level = p_level,
         role         = case when p_level >= 2 then 'admin' else 'member' end
   where id = p_target;

  insert into public.access_audit_log (user_id, event_type, resource, detail)
  values ((select auth.uid()), 'member_level_changed', '/admin/members',
          jsonb_build_object('target', p_target, 'level', p_level));
end;
$$;
