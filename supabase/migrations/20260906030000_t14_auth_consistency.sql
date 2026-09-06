-- ═════════════════════════════════════════════════════════════════════════
-- T14. 권한 판정 일원화, 감사 로그 보존, 가입 메타데이터, 보존기간 스케줄
--
--  전체 코드 검토에서 나온 인증·DB 쪽 지적을 한 번에 정리한다.
--
--  1. is_admin() 이 member_status 를 보지 않았다. 정지·반려된 관리자도
--     저장소(주보·사진) 정책에서는 여전히 관리자였다. current_access_level()
--     하나로 판정을 모은다.
--  2. reject_member 가 role 을 되돌리지 않아 "반려됐는데 role=admin" 인
--     어긋난 상태가 남을 수 있었다. 승인·반려 모두 자기 자신은 막는다.
--  3. access_audit_log.user_id 의 외래키가 on delete set null 이라, 계정을
--     지우면 그 사람의 접속 기록이 익명이 됐다. T9 주석과 화면 문구
--     ("접속 기록은 삭제 후에도 남습니다")와 어긋난다. 외래키를 없앤다.
--  4. log_event 의 p_detail 에 크기 제한이 없었다.
--  5. admin_update_member 는 세 값 모두 필수로 받는다. 화면이 항상 셋을
--     보내므로 default null 은 "비우기"와 "건드리지 않기"를 헷갈리게만 했다.
--  6. handle_new_user 가 이메일 가입의 연락처·성별을 받지 못해 클라이언트가
--     upsert 로 덧붙여야 했다. raw_user_meta_data 에서 함께 읽는다.
--  7. 새로 만드는 객체에 anon 이 자동으로 권한을 받는 기본 ACL 을 끊는다.
--  8. purge_old_audit_log 를 pg_cron 으로 매일 새벽에 돌린다. 화면은 이미
--     "12개월 뒤 자동 삭제" 라고 안내하고 있었다.
-- ═════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. is_admin() = 현재 등급 2 이상
--    저장소 정책(P0)이 이 함수를 쓴다. 그대로 두고 판정만 바꾼다.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select public.current_access_level() >= 2
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. 승인·반려 — 자기 자신 금지, 반려 시 role 도 되돌린다
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.approve_member(p_target uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if (select public.current_access_level()) < 2 then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  if p_target = (select auth.uid()) then
    raise exception '자기 자신은 처리할 수 없습니다.' using errcode = '22023';
  end if;

  update public.profiles
     set member_status = 'active',
         access_level  = greatest(access_level, 1),
         approved_by   = (select auth.uid()),
         approved_at   = now()
   where id = p_target;

  if not found then
    raise exception '대상을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  insert into public.access_audit_log (user_id, event_type, resource, detail)
  values ((select auth.uid()), 'member_approved', '/admin/members',
          jsonb_build_object('target', p_target));
end;
$$;

create or replace function public.reject_member(p_target uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if (select public.current_access_level()) < 2 then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  if p_target = (select auth.uid()) then
    raise exception '자기 자신은 처리할 수 없습니다.' using errcode = '22023';
  end if;

  update public.profiles
     set member_status = 'rejected',
         access_level  = 0,
         role          = 'member',
         approved_by   = (select auth.uid()),
         approved_at   = now()
   where id = p_target;

  if not found then
    raise exception '대상을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  insert into public.access_audit_log (user_id, event_type, resource, detail)
  values ((select auth.uid()), 'member_rejected', '/admin/members',
          jsonb_build_object('target', p_target));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. 감사 로그는 계정이 사라져도 남는다
--    조회는 user_id 색인(idx_audit_user)으로 하므로 외래키가 없어도 된다.
--    display_name 은 audit_summary 뷰가 profiles 와 left join 해서 만들기
--    때문에, 삭제된 사람은 '(삭제된 계정)' 으로 보이되 id 는 남는다.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.access_audit_log
  drop constraint if exists access_audit_log_user_id_fkey;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. log_event — detail 크기 제한 (2 KiB)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.log_event(
  p_event_type text,
  p_resource   text default null,
  p_detail     jsonb default null
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is null then
    return;
  end if;

  if p_event_type not in ('login', 'logout', 'view_sensitive', 'access_denied') then
    raise exception '기록할 수 없는 유형입니다.' using errcode = '22023';
  end if;

  if p_detail is not null and pg_column_size(p_detail) > 2048 then
    raise exception '상세 정보가 너무 큽니다.' using errcode = '22023';
  end if;

  insert into public.access_audit_log (user_id, event_type, resource, detail)
  values ((select auth.uid()), p_event_type, left(p_resource, 200), p_detail);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. admin_update_member — 세 값 모두 필수
--    기본값을 빼려면 함수를 지우고 다시 만들어야 한다. 권한도 다시 준다.
-- ─────────────────────────────────────────────────────────────────────────
drop function if exists public.admin_update_member(uuid, text, text, text);

create function public.admin_update_member(
  p_target   uuid,
  p_name     text,
  p_phone    text,
  p_position text
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if (select public.current_access_level()) < 2 then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  if nullif(btrim(p_name), '') is null then
    raise exception '이름은 비울 수 없습니다.' using errcode = '22023';
  end if;

  update public.profiles
     set name     = left(btrim(p_name), 100),
         phone    = left(nullif(btrim(p_phone), ''), 50),
         position = left(nullif(btrim(p_position), ''), 50)
   where id = p_target;

  if not found then
    raise exception '대상을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  insert into public.access_audit_log (user_id, event_type, resource, detail)
  values ((select auth.uid()), 'member_edited', '/admin/members',
          jsonb_build_object('target', p_target));
end;
$$;

revoke all on function public.admin_update_member(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_member(uuid, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. handle_new_user — 이메일 가입의 연락처·성별도 트리거가 넣는다
--    클라이언트는 signUp(options.data) 로 보내기만 하면 된다. 이메일 확인이
--    켜져 있어 세션이 바로 안 생기는 경우에도 프로필이 온전히 만들어진다.
-- ─────────────────────────────────────────────────────────────────────────
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

  insert into public.profiles (id, name, phone, gender, provider)
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
    coalesce(new.raw_app_meta_data->>'provider', 'unknown')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. 앞으로 만드는 객체에 anon 자동 권한 없음
--    T13 은 이미 있는 테이블만 정리했다. 기본 ACL 이 그대로면 다음
--    마이그레이션에서 만든 테이블에 anon 이 또 전체 권한을 받는다.
-- ─────────────────────────────────────────────────────────────────────────
alter default privileges for role postgres in schema public revoke all on tables    from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. 보존기간 자동 적용 — 매일 03:00 (UTC, 자카르타 10:00)
-- ─────────────────────────────────────────────────────────────────────────
create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'purge-audit-log';
select cron.schedule('purge-audit-log', '0 3 * * *', $$select public.purge_old_audit_log()$$);
