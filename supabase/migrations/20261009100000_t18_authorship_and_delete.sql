-- ============================================================================
-- T18 — 소식과나눔 게시물: 작성자 기록 + 삭제 권한 (2026-10 요청)
--
-- 1. 슈퍼관리자(access_level 3) 신설. is_admin() 은 '등급 2 이상' 이라 그대로
--    관리자 권한을 모두 가진다. 삭제만 슈퍼관리자 또는 작성자로 좁힌다.
-- 2. 교회소식·선교소식·포토앨범·주보에 작성자(author_id, author_name)를 남긴다.
--    author_name 은 profiles 가 본인 행만 읽히기 때문에 등록 시점의 이름을
--    트리거가 복사해 둔다(클라이언트가 속일 수 없다).
-- 3. 삭제: 슈퍼관리자 또는 작성자(관리자)만. 작성자 없는 옛 글은 슈퍼관리자만.
--
-- 적용 후 아래 5번의 UPDATE 로 본인 계정을 슈퍼관리자로 올린다.
-- ============================================================================

-- 1. 슈퍼관리자 등급
alter table public.profiles drop constraint if exists profiles_access_level_check;
alter table public.profiles
  add constraint profiles_access_level_check check (access_level between 0 and 3);

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_access_level() >= 3
$$;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- 2. 작성자 컬럼
alter table public.church_news_content  add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table public.church_news_content  add column if not exists author_name text;
alter table public.mission_news_content add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table public.mission_news_content add column if not exists author_name text;
alter table public.photo_album_meta     add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table public.photo_album_meta     add column if not exists author_name text;

-- 주보는 테이블이 없었다(파일명이 곧 날짜). 작성자를 담을 곳을 만든다.
create table if not exists public.bulletin_meta (
  id          text primary key,   -- 'YYYYMMDD' — storage 파일명 접두와 같다
  author_id   uuid references auth.users(id) on delete set null,
  author_name text
);
alter table public.bulletin_meta enable row level security;
revoke all on public.bulletin_meta from anon;
grant select, insert, update, delete on public.bulletin_meta to authenticated;

create policy "bulletin_meta_select_approved" on public.bulletin_meta
  for select to authenticated
  using ((select public.current_access_level()) >= 1);
create policy "bulletin_meta_insert_admin" on public.bulletin_meta
  for insert to authenticated
  with check ((select public.is_admin()));
create policy "bulletin_meta_update_admin" on public.bulletin_meta
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 3. 등록할 때 작성자를 서버가 채우고(넘어온 값은 무시), 수정할 때는 기존 값으로
--    고정한다. 고정하지 않으면 관리자가 UPDATE 로 author_id 를 자기로 바꿔
--    남의 글을 지울 수 있다.
create or replace function public.set_post_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.author_id   := old.author_id;
    new.author_name := old.author_name;
  else
    new.author_id   := auth.uid();
    new.author_name := (select p.name from public.profiles p where p.id = auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function public.set_post_author() from public;

do $$
declare t text;
begin
  foreach t in array array['church_news_content','mission_news_content','photo_album_meta','bulletin_meta'] loop
    execute format('drop trigger if exists set_author on public.%I', t);
    execute format('create trigger set_author before insert or update on public.%I for each row execute function public.set_post_author()', t);
  end loop;
end $$;

-- 4. 삭제 정책: 슈퍼관리자 또는 작성자(관리자)
-- (drop 문을 MCP 가 막는 경우를 위해 alter policy 를 쓴다. photo_album_meta 의
--  삭제 정책 이름은 P0 마이그레이션의 "album_delete_admin".)
alter policy "album_delete_admin" on public.photo_album_meta
  using ((select public.is_super_admin()) or ((select public.is_admin()) and author_id = (select auth.uid())));

alter policy "mission_delete_admin" on public.mission_news_content
  using ((select public.is_super_admin()) or ((select public.is_admin()) and author_id = (select auth.uid())));

create policy "bulletin_meta_delete_author" on public.bulletin_meta
  for delete to authenticated
  using ((select public.is_super_admin()) or ((select public.is_admin()) and author_id = (select auth.uid())));

-- church_news_content 의 삭제 정책 이름은 환경마다 다를 수 있어 찾아서 바꾼다.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'church_news_content' and cmd = 'DELETE'
  loop
    execute format(
      'alter policy %I on public.church_news_content using ((select public.is_super_admin()) or ((select public.is_admin()) and author_id = (select auth.uid())))',
      pol.policyname);
  end loop;
end $$;

-- Storage: 사진·주보 파일 삭제도 같은 규칙. 업로드한 사람(owner_id)이 곧 작성자다.
-- 주의: 다른 관리자가 올린 사진을 수정 화면에서 지우는 것도 이제 막힌다.
alter policy "obj_delete_admin" on storage.objects
  using (bucket_id in ('churchNews','photoAlbum','missionNews')
         and ((select public.is_super_admin()) or ((select public.is_admin()) and owner_id = (select auth.uid())::text)));

alter policy "obj_delete_bulletin_admin" on storage.objects
  using (bucket_id = 'weeklyBulletin'
         and ((select public.is_super_admin()) or ((select public.is_admin()) and owner_id = (select auth.uid())::text)));

-- 5. 슈퍼관리자 지정 (이메일을 확인하고 실행)
-- update public.profiles set access_level = 3
--  where id = (select id from auth.users where email = 'hunga.seo@gmail.com');
