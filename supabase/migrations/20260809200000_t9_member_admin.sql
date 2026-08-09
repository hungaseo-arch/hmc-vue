-- ============================================================================
-- T9 — 관리자 회원 관리 (명부 / 등급 / 정지 / 정보 수정 / 삭제)
--
-- 전부 security definer RPC 로 만든다. 화면에서 profiles 를 직접 UPDATE 하지
-- 않는 이유는 T1 9절에 적은 것과 같다. RLS 정책은 OR 로 합쳐지므로 관리자용
-- UPDATE 정책을 하나 더 붙이는 순간, 일반 교인이 '본인 프로필 수정' 정책을
-- 타고 자기 행의 등급을 올릴 수 있는 길이 열린다.
--
-- 세 가지를 일관되게 지킨다.
--   1) 등급 검사는 함수 안에서 current_access_level() 로 한다.
--   2) 자기 자신은 내리거나 막거나 지울 수 없다. 관리자가 스스로를 잠가
--      아무도 못 들어가는 상태를 만들 수 없게 하는 최소한의 안전핀이다.
--      (그래서 관리자는 언제나 최소 한 명 남는다.)
--   3) 무엇을 했는지 같은 트랜잭션에서 감사 로그에 남긴다. 상세에는 대상의
--      UUID 만 넣는다 — 이름·연락처 원문은 넣지 않는다.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. 등급 변경
--
--    role 컬럼도 함께 맞춘다. 예전 정책과 화면 곳곳이 role='admin' 을 보고
--    있어서, access_level 만 내리면 "등급은 0 인데 여전히 관리자" 인 어긋난
--    상태가 만들어진다. current_access_level() 이 둘 중 큰 값을 쓰기 때문에
--    실제로 권한도 안 내려간다.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.set_member_level(p_target uuid, p_level smallint)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
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

  update public.profiles
     set access_level = p_level,
         role         = case when p_level >= 2 then 'admin' else 'member' end
   where id = p_target;

  if not found then
    raise exception '대상을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  insert into public.access_audit_log (user_id, event_type, resource, detail)
  values ((select auth.uid()), 'member_level_changed', '/admin/members',
          jsonb_build_object('target', p_target, 'level', p_level));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. 상태 변경 (정지 / 해제 / 대기로 되돌리기)
--
--    삭제와 정지를 나눠 둔다. 실제로 필요한 일의 대부분은 '당분간 못 들어
--    오게' 이지 '흔적까지 지우기' 가 아니다. 정지는 되돌릴 수 있다.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.set_member_status(p_target uuid, p_status text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if (select public.current_access_level()) < 2 then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  if p_status not in ('pending', 'active', 'suspended', 'rejected') then
    raise exception '알 수 없는 상태입니다.' using errcode = '22023';
  end if;

  if p_target = (select auth.uid()) and p_status <> 'active' then
    raise exception '자기 자신의 접근을 막을 수 없습니다.' using errcode = '22023';
  end if;

  update public.profiles
     set member_status = p_status,
         -- 정지·반려는 등급도 함께 0 으로 내린다. 상태만 바꾸면
         -- current_access_level() 의 active 검사에 걸려 어차피 0 이 되지만,
         -- 저장된 값과 실제 권한이 어긋나 있으면 나중에 반드시 헷갈린다.
         access_level  = case when p_status = 'active' then greatest(access_level, 1) else 0 end,
         role          = case when p_status = 'active' then role else 'member' end,
         approved_by   = (select auth.uid()),
         approved_at   = now()
   where id = p_target;

  if not found then
    raise exception '대상을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  insert into public.access_audit_log (user_id, event_type, resource, detail)
  values ((select auth.uid()), 'member_status_changed', '/admin/members',
          jsonb_build_object('target', p_target, 'status', p_status));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. 명부 정보 수정
--
--    카카오로 들어온 분은 이름이 닉네임('꽃길만걷자')으로 잡힌다. 명부를
--    쓰려면 관리자가 실제 이름으로 고칠 수 있어야 한다.
--    등급·상태 컬럼은 여기서 건드리지 않는다 — 그건 위의 두 함수 몫이다.
--    감사 로그에는 무엇을 바꿨는지만 남기고 값은 남기지 않는다(개인정보).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.admin_update_member(
  p_target   uuid,
  p_name     text default null,
  p_phone    text default null,
  p_position text default null
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if (select public.current_access_level()) < 2 then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  update public.profiles
     set name     = coalesce(nullif(btrim(p_name), ''), name),
         phone    = nullif(btrim(p_phone), ''),
         position = nullif(btrim(p_position), '')
   where id = p_target;

  if not found then
    raise exception '대상을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  insert into public.access_audit_log (user_id, event_type, resource, detail)
  values ((select auth.uid()), 'member_edited', '/admin/members',
          jsonb_build_object('target', p_target));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. 계정 삭제
--
--    auth.users 에서 지우면 profiles·identities·sessions 가 전부 cascade 로
--    함께 사라진다(확인함). service_role 키는 필요 없다 — 이 함수의 소유자
--    postgres 가 auth.users 에 DELETE 권한을 갖고 있고, security definer 로
--    그 권한을 빌려 쓴다. 브라우저에는 아무 열쇠도 내려가지 않는다.
--
--    감사 로그의 user_id 에는 auth.users 로 향하는 외래키가 없다. 그래서
--    계정을 지워도 "누가 언제 들어왔었다" 는 기록은 남는다. 지운 사람이
--    자기 흔적까지 지우게 두지 않으려는 것이고, 그 줄은 뷰에서
--    '(탈퇴 사용자)' 로 보인다.
--
--    되돌릴 수 없다. 그래서 정지(set_member_status)를 먼저 권한다.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.delete_member(p_target uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if (select public.current_access_level()) < 2 then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  if p_target = (select auth.uid()) then
    raise exception '자기 자신의 계정은 지울 수 없습니다.' using errcode = '22023';
  end if;

  -- 지우기 '전에' 기록한다. 지운 뒤에는 누구였는지 알 방법이 없다.
  insert into public.access_audit_log (user_id, event_type, resource, detail)
  values ((select auth.uid()), 'member_deleted', '/admin/members',
          jsonb_build_object('target', p_target));

  delete from auth.users where id = p_target;

  if not found then
    raise exception '대상을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. 권한
-- ─────────────────────────────────────────────────────────────────────────
revoke all on function public.set_member_level(uuid, smallint)          from public, anon;
revoke all on function public.set_member_status(uuid, text)             from public, anon;
revoke all on function public.admin_update_member(uuid, text, text, text) from public, anon;
revoke all on function public.delete_member(uuid)                       from public, anon;

grant execute on function public.set_member_level(uuid, smallint)          to authenticated;
grant execute on function public.set_member_status(uuid, text)             to authenticated;
grant execute on function public.admin_update_member(uuid, text, text, text) to authenticated;
grant execute on function public.delete_member(uuid)                       to authenticated;

comment on function public.delete_member(uuid) is
  '계정 완전 삭제. 되돌릴 수 없다. 대개는 set_member_status(_, ''suspended'') 로 충분하다.';
