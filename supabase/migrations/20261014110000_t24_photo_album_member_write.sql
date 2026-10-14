-- ============================================================================
-- T24 — 포토앨범: 교인도 등록, 수정·삭제는 본인 글만 1달 안 (2026-10 요청)
--
--   · 등록: 승인 교인(등급 1) 이상 누구나.
--   · 수정·삭제: 작성자 본인이고 올린 지 1달 안일 때만. 관리자(2등급)도 같다.
--   · 슈퍼관리자(3등급): 기간·작성자와 무관하게 언제나.
--   · 작성자 기록이 없는 옛 앨범: 슈퍼관리자만.
--
-- 판정 기준은 '앨범' 하나다. 사진 파일 이름이 앨범 ID 로 시작하므로
-- ({YYYY-MM-DD}_{numId}_..._pNN.ext) 파일 권한도 그 앨범의 작성자·올린 시각으로
-- 정한다. 그래야 남의 앨범에 사진을 끼워 넣거나 빼는 길이 없다.
--
-- 등록 순서가 바뀐다(화면도 함께 바뀐다): 앨범 정보 행을 먼저 만들고 사진을
-- 올린다. 정보 행이 있어야 업로드 순간 '내 앨범인가' 를 서버가 판정할 수 있다.
--
-- 선행: T18(작성자·is_super_admin), T20(created_at·set_post_author 트리거).
-- MCP 가 drop 을 막으므로 기존 정책은 alter 로 고치고, 새 정책은 없을 때만 만든다.
-- ============================================================================

-- 1. 파일 이름 → 앨범 ID. 형식에 맞지 않으면 null(아무 권한도 얻지 못한다).
create or replace function public.album_id_of(p_name text)
returns text
language sql
immutable
as $$
  select substring(p_name from '^(\d{4}-\d{2}-\d{2}_\d+)_')
$$;
revoke all on function public.album_id_of(text) from public;
grant execute on function public.album_id_of(text) to authenticated;

-- 2. 이 앨범을 고치거나 지울 수 있는가. 정보 행·파일 정책이 모두 이 한 곳을 본다.
--    security definer: 정책 안에서 photo_album_meta 를 다시 읽을 때 RLS 가
--    겹겹이 걸리지 않게.
create or replace function public.may_manage_album(p_album_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_super_admin()
      or (public.current_access_level() >= 1
          and exists (
            select 1 from public.photo_album_meta m
             where m.id = p_album_id
               and m.author_id = auth.uid()
               and m.created_at > now() - interval '1 month'))
$$;
revoke all on function public.may_manage_album(text) from public;
grant execute on function public.may_manage_album(text) to authenticated;

-- 3. 새 앨범 ID 인가. 이미 사진이 올라가 있는 ID(정보 행이 없는 옛 앨범 포함)에
--    정보 행을 새로 만들어 '작성자' 가 되는 것을 막는다.
create or replace function public.album_id_unclaimed(p_album_id text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select p_album_id ~ '^\d{4}-\d{2}-\d{2}_\d+$'
     and not exists (
       select 1 from storage.objects o
        where o.bucket_id = 'photoAlbum'
          and starts_with(o.name, p_album_id || '_'))
$$;
revoke all on function public.album_id_unclaimed(text) from public;
grant execute on function public.album_id_unclaimed(text) to authenticated;

-- 4. photo_album_meta 정책
--    INSERT·UPDATE 정책은 마이그레이션 밖(대시보드)에서 만들어져 이름이 환경마다
--    다를 수 있다. 찾아서 고치고, 없으면 만든다. 'ALL' 정책이 있으면 아래 규칙이
--    무력해지므로(허용 정책은 OR 로 합쳐진다) 멈추고 알린다.
do $$
declare pol record;
declare found_insert boolean := false;
declare found_update boolean := false;
begin
  if exists (select 1 from pg_policies
              where schemaname = 'public' and tablename = 'photo_album_meta' and cmd = 'ALL') then
    raise exception 'photo_album_meta 에 FOR ALL 정책이 있습니다. 먼저 확인해 주세요: select policyname from pg_policies where tablename = ''photo_album_meta'';';
  end if;

  for pol in
    select policyname, cmd from pg_policies
     where schemaname = 'public' and tablename = 'photo_album_meta' and cmd in ('INSERT', 'UPDATE')
  loop
    if pol.cmd = 'INSERT' then
      found_insert := true;
      execute format(
        'alter policy %I on public.photo_album_meta with check (public.is_super_admin() or (public.current_access_level() >= 1 and public.album_id_unclaimed(id)))',
        pol.policyname);
    else
      found_update := true;
      execute format(
        'alter policy %I on public.photo_album_meta using (public.may_manage_album(id)) with check (public.may_manage_album(id))',
        pol.policyname);
    end if;
  end loop;

  if not found_insert then
    create policy "album_insert_member" on public.photo_album_meta
      for insert to authenticated
      with check (public.is_super_admin() or (public.current_access_level() >= 1 and public.album_id_unclaimed(id)));
  end if;
  if not found_update then
    create policy "album_update_author" on public.photo_album_meta
      for update to authenticated
      using (public.may_manage_album(id))
      with check (public.may_manage_album(id));
  end if;
end $$;

alter policy "album_delete_admin" on public.photo_album_meta
  using (public.may_manage_album(id));

-- 5. Storage: photoAlbum 을 관리자 공용 정책에서 빼고 앨범 기준 정책으로 옮긴다.
--    (빼지 않으면 관리자 정책과 OR 로 합쳐져 관리자가 남의 앨범을 고칠 수 있다.)
alter policy "obj_insert_admin" on storage.objects
  with check (bucket_id in ('churchNews','weeklyBulletin','missionNews') and (select public.is_admin()));

alter policy "obj_update_admin" on storage.objects
  using      (bucket_id in ('churchNews','weeklyBulletin','missionNews') and (select public.is_admin()))
  with check (bucket_id in ('churchNews','weeklyBulletin','missionNews') and (select public.is_admin()));

alter policy "obj_delete_admin" on storage.objects
  using (bucket_id in ('churchNews','missionNews')
         and public.may_delete_post(owner_id = (select auth.uid())::text, created_at));

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'album_obj_insert') then
    create policy "album_obj_insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'photoAlbum' and public.may_manage_album(public.album_id_of(name)));
  end if;
  -- upsert 업로드가 같은 이름을 덮을 때 필요하다.
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'album_obj_update') then
    create policy "album_obj_update" on storage.objects
      for update to authenticated
      using      (bucket_id = 'photoAlbum' and public.may_manage_album(public.album_id_of(name)))
      with check (bucket_id = 'photoAlbum' and public.may_manage_album(public.album_id_of(name)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'album_obj_delete') then
    create policy "album_obj_delete" on storage.objects
      for delete to authenticated
      using (bucket_id = 'photoAlbum' and public.may_manage_album(public.album_id_of(name)));
  end if;
end $$;

-- 6. 적용 후 확인: photoAlbum 을 다루는 정책이 album_* 셋과 조회(approved list photoAlbum)만
--    남았는지 본다.
-- select policyname, cmd from pg_policies
--  where schemaname = 'storage' and tablename = 'objects'
--    and (qual like '%photoAlbum%' or with_check like '%photoAlbum%');
