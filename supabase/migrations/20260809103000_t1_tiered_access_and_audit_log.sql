-- HMC-AUTH-2026-01 / T1 — 인증 등급 분리(Tiered Access)와 감사 로그
--
-- 지시서는 새 members 테이블을 제시했으나, 이 저장소에는 같은 역할을 하는
-- public.profiles 가 이미 있고 기존 RLS 정책 대부분이 profiles.role 에 물려
-- 있다. 테이블을 새로 만들면 권한 판정이 두 곳으로 갈라지므로 T1 주의 조항에
-- 따라 profiles 를 확장한다.
--
-- ⚠ 적용 순서
--   이 마이그레이션은 auth.users 에 트리거를 걸어 프로필을 자동 생성한다.
--   현재 배포된(옛) 번들의 회원가입은 프로필을 .insert() 로 직접 만들기
--   때문에, 이 마이그레이션만 먼저 적용하면 기본키 충돌(23505)로 이메일
--   회원가입이 실패한다. 반드시 useAuth 의 signUp 이 upsert 로 바뀐 빌드를
--   배포한 뒤에 적용한다. (T2 에서 처리)
--
-- 등급 정의
--   0 = 공개   : 로그인 없이 볼 수 있는 것 (설교, 목회칼럼, 교회소개)
--   1 = 교인   : 승인된 교인 (주보, 교회소식, 사진앨범)
--   2 = 민감   : 관리자 (교인명부, 승인 처리, 접근 기록)

-- ─────────────────────────────────────────────────────────────────────────
-- 1. profiles 확장
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists member_status text not null default 'pending',
  add column if not exists access_level  smallint not null default 0,
  add column if not exists provider      text,
  add column if not exists approved_by   uuid references auth.users(id) on delete set null,
  add column if not exists approved_at   timestamptz,
  add column if not exists created_at    timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_member_status_check') then
    alter table public.profiles
      add constraint profiles_member_status_check
      check (member_status in ('pending', 'active', 'suspended', 'rejected'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_access_level_check') then
    alter table public.profiles
      add constraint profiles_access_level_check
      check (access_level between 0 and 2);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. 기존 회원 백필
--
--    이 단계를 빼면 배포 즉시 기존 교인 전원이 default 'pending' 이 되어
--    주보·소식·사진에서 잠긴다. 지금 profiles 에 있는 사람은 이미 이메일로
--    가입해 쓰고 있던 실제 교인이므로 승인된 것으로 본다.
-- ─────────────────────────────────────────────────────────────────────────
update public.profiles p
   set member_status = 'active',
       access_level  = case when p.role = 'admin' then 2 else 1 end,
       approved_at   = coalesce(p.approved_at, now())
 where p.member_status = 'pending'
   and p.access_level = 0;

-- created_at·provider 은 auth.users 가 이미 정확한 값을 갖고 있다.
-- 컬럼 추가 시점의 now() 를 그대로 두면 전원이 오늘 가입한 것처럼 보인다.
update public.profiles p
   set created_at = u.created_at,
       provider   = coalesce(p.provider, u.raw_app_meta_data->>'provider', 'email')
  from auth.users u
 where u.id = p.id;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. 신규 가입 시 프로필 자동 생성 (승인 대기 상태)
--
--    카카오 로그인은 회원가입 화면을 거치지 않으므로 프로필을 만들 지점이
--    없다. auth.users 에 행이 생길 때 DB 가 직접 만든다.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, name, provider)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
      nullif(trim(new.raw_user_meta_data->>'preferred_username'), ''),
      '이름 미설정'
    ),
    coalesce(new.raw_app_meta_data->>'provider', 'unknown')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- 4. 현재 사용자 접근 등급
--
--    role='admin' 을 함께 본다. 기존 정책들이 여전히 is_admin() 을 쓰고 있어
--    두 값이 어긋나면 같은 사람이 화면에서는 관리자인데 데이터는 못 읽는
--    상태가 된다. 둘 중 높은 쪽을 쓴다.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.current_access_level()
returns smallint
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce((
    select greatest(p.access_level, case when p.role = 'admin' then 2 else 0 end)::smallint
      from public.profiles p
     where p.id = (select auth.uid())
       and p.member_status = 'active'
  ), 0::smallint);
$$;

revoke all on function public.current_access_level() from public;
grant execute on function public.current_access_level() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. profiles RLS — 관리자 조회 추가
--
--    승인 처리(UPDATE)는 정책이 아니라 RPC 로 한다. 이유는 아래 7번 참고.
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "관리자 전체 프로필 조회" on public.profiles;
create policy "관리자 전체 프로필 조회"
  on public.profiles for select
  to authenticated
  using ((select public.current_access_level()) >= 2);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. 교인 전용(L1) 자료를 '승인된 교인'으로 좁힌다
--
--    지금까지는 로그인만 하면 누구나 볼 수 있었다(authenticated → true).
--    카카오 로그인이 열리면 아무나 30초 만에 계정을 만들 수 있으므로
--    그대로 두면 주보·소식·사진이 사실상 공개가 된다.
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "성도 조회" on public.church_news_content;
create policy "승인 교인 조회" on public.church_news_content
  for select to authenticated
  using ((select public.current_access_level()) >= 1);

drop policy if exists "성도 조회" on public.photo_album_meta;
create policy "승인 교인 조회" on public.photo_album_meta
  for select to authenticated
  using ((select public.current_access_level()) >= 1);

-- Storage. SELECT 권한이 없으면 서명 URL 발급도 막힌다.
drop policy if exists "authenticated list churchNews" on storage.objects;
create policy "approved list churchNews" on storage.objects
  for select to authenticated
  using (bucket_id = 'churchNews' and (select public.current_access_level()) >= 1);

drop policy if exists "authenticated list photoAlbum" on storage.objects;
create policy "approved list photoAlbum" on storage.objects
  for select to authenticated
  using (bucket_id = 'photoAlbum' and (select public.current_access_level()) >= 1);

drop policy if exists "authenticated list weeklyBulletin" on storage.objects;
create policy "approved list weeklyBulletin" on storage.objects
  for select to authenticated
  using (bucket_id = 'weeklyBulletin' and (select public.current_access_level()) >= 1);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. 감사 로그
--
--    INSERT/UPDATE/DELETE 정책을 두지 않는 것은 실수가 아니다. 클라이언트가
--    직접 쓸 수 있으면 기록을 생략하거나 남의 이름으로 위조할 수 있다.
--    기록은 log_event() 와 위 승인/반려 함수로만 생긴다.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.access_audit_log (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete set null,
  event_type  text not null
              check (event_type in (
                'login', 'logout', 'view_sensitive',
                'member_approved', 'member_rejected', 'member_suspended',
                'access_denied')),
  resource    text,
  detail      jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_audit_occurred on public.access_audit_log (occurred_at desc);
create index if not exists idx_audit_user     on public.access_audit_log (user_id, occurred_at desc);
create index if not exists idx_audit_event    on public.access_audit_log (event_type, occurred_at desc);

alter table public.access_audit_log enable row level security;

drop policy if exists "관리자만 감사로그 조회" on public.access_audit_log;
create policy "관리자만 감사로그 조회"
  on public.access_audit_log for select
  to authenticated
  using ((select public.current_access_level()) >= 2);

-- Supabase 는 새 테이블에 authenticated 로 모든 권한을 기본 부여한다.
-- RLS 로도 막히지만, 쓰기 권한 자체를 없애 두 겹으로 막는다.
revoke insert, update, delete, truncate on public.access_audit_log from anon, authenticated;
revoke all on sequence public.access_audit_log_id_seq from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. 기록 전용 함수 — user_id 를 서버가 정하므로 위조할 수 없다
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
    return;                                   -- 미인증 요청은 기록하지 않는다
  end if;

  -- 클라이언트가 부를 수 있는 것은 본인 행동 기록뿐이다. 승인·반려는
  -- 서버 함수(approve_member/reject_member)만 남길 수 있다.
  if p_event_type not in ('login', 'logout', 'view_sensitive', 'access_denied') then
    raise exception '기록할 수 없는 유형입니다.' using errcode = '22023';
  end if;

  insert into public.access_audit_log (user_id, event_type, resource, detail)
  values ((select auth.uid()), p_event_type, left(p_resource, 200), p_detail);
end;
$$;

revoke all on function public.log_event(text, text, jsonb) from public;
grant execute on function public.log_event(text, text, jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 9. 승인·반려 — 정책이 아니라 RPC 로 한다
--
--    지시서는 "관리자 승인 처리" UPDATE 정책을 제시했다. 그러려면 관리자가
--    member_status·access_level 컬럼에 UPDATE 권한을 가져야 하는데, 컬럼
--    권한은 사람이 아니라 authenticated 역할 전체에 붙는다. 그리고 RLS
--    정책은 OR 로 합쳐지므로, 일반 교인도 '본인 프로필 수정' 정책을 타고
--    자기 행의 access_level 을 2 로 올릴 수 있게 된다.
--
--    그래서 두 컬럼에는 아무 권한도 주지 않고, 등급을 서버가 확인하는
--    security definer 함수로만 바꾼다. 감사 기록도 같은 트랜잭션에서 남겨
--    "승인은 했는데 기록은 빠지는" 경우를 없앤다.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.approve_member(p_target uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if (select public.current_access_level()) < 2 then
    raise exception '권한이 없습니다.' using errcode = '42501';
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

  update public.profiles
     set member_status = 'rejected',
         access_level  = 0,
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

revoke all on function public.approve_member(uuid) from public;
revoke all on function public.reject_member(uuid)  from public;
grant execute on function public.approve_member(uuid) to authenticated;
grant execute on function public.reject_member(uuid)  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 10. 관리자 조회용 뷰
--
--     security_invoker = true 가 핵심이다. 기본값(false)이면 뷰가 소유자
--     권한으로 돌아 RLS 를 통째로 건너뛴다. 그러면 일반 교인도 뷰를 통해
--     전체 접근 기록을 읽을 수 있다.
-- ─────────────────────────────────────────────────────────────────────────
drop view if exists public.v_access_audit_log;
create view public.v_access_audit_log
with (security_invoker = true) as
select
  l.id,
  l.occurred_at,
  l.user_id,
  coalesce(p.name, '(탈퇴 사용자)') as display_name,
  l.event_type,
  l.resource,
  l.detail
from public.access_audit_log l
left join public.profiles p on p.id = l.user_id;

revoke all on public.v_access_audit_log from anon;
grant select on public.v_access_audit_log to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 11. 보존기간 12개월
--
--     이번 차수에서는 함수만 만든다. 스케줄(pg_cron) 등록은 운영자 판단.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.purge_old_audit_log()
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  delete from public.access_audit_log
   where occurred_at < now() - interval '12 months';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purge_old_audit_log() from public, anon, authenticated;
