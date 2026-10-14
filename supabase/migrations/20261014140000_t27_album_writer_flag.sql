-- ============================================================================
-- T27 — 포토앨범 작성은 관리자가 확인한 교인만 (2026-10 요청)
--
-- T26 으로 가입만 하면 열람이 모두 열린다. 그 대신 사진을 올리는 일은
-- 관리자가 실명·연락처를 확인하고 '앨범 작성 허용' 을 켜 준 교인만 한다.
--
--   · 작성 가능: 슈퍼관리자, 관리자(2등급), 작성 허용된 교인(1등급).
--   · 수정·삭제: 위 조건 + 본인 앨범 + 1달 안(T24 그대로). 슈퍼관리자는 언제나.
--     허용을 끄면 그 교인은 자기 앨범도 더는 고치거나 지우지 못한다.
--
-- 선행: T24(may_manage_album·album_id_unclaimed), T26.
-- ============================================================================

-- 1. 허용 표시. 교인은 이 칸을 직접 바꾸지 못한다 - profiles 의 UPDATE 권한은
--    P4 에서 컬럼 단위로만 주었고 이 칸은 그 목록에 없다.
alter table public.profiles
  add column if not exists album_writer boolean not null default false;
-- 교인이 앨범 작성을 신청한 시각. 관리자가 허용·해제하면 비운다.
alter table public.profiles
  add column if not exists album_writer_requested_at timestamptz;

-- 2. 지금 사용자가 앨범을 쓸 수 있는가. 정책과 화면이 모두 이 규칙을 따른다.
create or replace function public.can_write_album()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_access_level() >= 2
      or (public.current_access_level() >= 1
          and exists (select 1 from public.profiles p
                       where p.id = auth.uid() and p.album_writer))
$$;
revoke all on function public.can_write_album() from public;
grant execute on function public.can_write_album() to authenticated;

-- 3. 수정·삭제 판정에도 허용 여부를 더한다.
create or replace function public.may_manage_album(p_album_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_super_admin()
      or (public.can_write_album()
          and exists (
            select 1 from public.photo_album_meta m
             where m.id = p_album_id
               and m.author_id = auth.uid()
               and m.created_at > now() - interval '1 month'))
$$;

-- 4. 등록 정책. T24 처럼 이름을 찾아서 고친다.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'photo_album_meta' and cmd = 'INSERT'
  loop
    execute format(
      'alter policy %I on public.photo_album_meta with check (public.is_super_admin() or (public.can_write_album() and public.album_id_unclaimed(id)))',
      pol.policyname);
  end loop;
end $$;

-- 5. 관리자가 허용을 켜고 끈다. 감사 기록은 기존 'member_edited' 로 남긴다.
create or replace function public.set_album_writer(p_target uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_status text;
begin
  if (select public.current_access_level()) < 2 then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  select member_status into v_status from public.profiles where id = p_target;
  if v_status is null then
    raise exception '대상을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;
  if p_on and v_status <> 'active' then
    raise exception '이용 중인 교인에게만 앨범 작성을 허용할 수 있습니다.' using errcode = '22023';
  end if;

  update public.profiles
     set album_writer = p_on,
         album_writer_requested_at = null
   where id = p_target;

  insert into public.access_audit_log (user_id, event_type, resource, detail)
  values ((select auth.uid()), 'member_edited', '/admin/members',
          jsonb_build_object('target', p_target, 'album_writer', p_on));
end;
$$;
revoke all on function public.set_album_writer(uuid, boolean) from public, anon;
grant execute on function public.set_album_writer(uuid, boolean) to authenticated;

-- 6. 교인이 앨범 작성을 신청한다. 실명·전화번호·직분을 함께 받아 명부에
--    적는다. 관리자는 회원 관리의 [확인 요청] 탭에서 보고 허용한다.
create or replace function public.request_album_writer(p_name text, p_phone text, p_position text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select public.current_access_level()) < 1 then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;
  if nullif(btrim(p_name), '') is null or nullif(btrim(p_phone), '') is null then
    raise exception '실명과 전화번호를 입력해 주세요.' using errcode = '22023';
  end if;

  update public.profiles
     set name     = left(btrim(p_name), 100),
         phone    = left(btrim(p_phone), 50),
         position = left(nullif(btrim(p_position), ''), 50),
         album_writer_requested_at = now()
   where id = auth.uid();
end;
$$;
revoke all on function public.request_album_writer(text, text, text) from public, anon;
grant execute on function public.request_album_writer(text, text, text) to authenticated;

-- 7. 적용 후 확인: T24 이후 교인이 이미 올린 앨범이 있다면, 그분들은 허용을
--    켜 주기 전까지 자기 앨범을 고치지 못한다. 누가 있는지 본다.
-- select distinct p.name, p.id from public.photo_album_meta m
--   join public.profiles p on p.id = m.author_id
--  where p.access_level < 2 and not p.album_writer;
