-- ============================================================================
-- T20 — 업로드 후 1달이 지난 문서는 슈퍼관리자만 삭제 (2026-10 요청)
--
-- 작성자(관리자)는 올린 지 1달 안에서만 지울 수 있다. 슈퍼관리자는 기간 제한 없음.
-- 기준은 글에 적는 날짜(date)가 아니라 실제로 올린 시각이라 created_at 을 둔다.
-- 선행: T18.
--
-- 이미 있던 글은 created_at 이 이 마이그레이션을 적용한 시각으로 채워진다.
-- 단, 옛 글은 작성자 기록이 없어 원래부터 슈퍼관리자만 지울 수 있으므로 영향이 없다.
-- ============================================================================

-- 1. 올린 시각
alter table public.church_news_content  add column if not exists created_at timestamptz not null default now();
alter table public.mission_news_content add column if not exists created_at timestamptz not null default now();
alter table public.photo_album_meta     add column if not exists created_at timestamptz not null default now();
alter table public.bulletin_meta        add column if not exists created_at timestamptz not null default now();

-- 2. 작성자·올린 시각은 수정으로 바꿀 수 없다. 등록 때는 서버 시각(날짜를 앞으로
--    당겨 기간을 늘리거나 뒤로 미루는 것을 막는다). T18 의 함수를 갱신한다.
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
    new.created_at  := old.created_at;
  else
    new.author_id   := auth.uid();
    new.author_name := (select p.name from public.profiles p where p.id = auth.uid());
    new.created_at  := now();
  end if;
  return new;
end;
$$;
revoke all on function public.set_post_author() from public;

-- 3. 삭제 규칙 한 곳: 슈퍼관리자, 또는 작성자(관리자)이면서 올린 지 1달 안.
create or replace function public.may_delete_post(is_author boolean, created timestamptz)
returns boolean
language sql
stable
as $$
  select public.is_super_admin()
      or (public.is_admin() and coalesce(is_author, false) and created > now() - interval '1 month')
$$;
revoke all on function public.may_delete_post(boolean, timestamptz) from public;
grant execute on function public.may_delete_post(boolean, timestamptz) to authenticated;

-- 4. 삭제 정책
alter policy "album_delete_admin" on public.photo_album_meta
  using (public.may_delete_post(author_id = (select auth.uid()), created_at));

alter policy "mission_delete_admin" on public.mission_news_content
  using (public.may_delete_post(author_id = (select auth.uid()), created_at));

alter policy "bulletin_meta_delete_author" on public.bulletin_meta
  using (public.may_delete_post(author_id = (select auth.uid()), created_at));

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'church_news_content' and cmd = 'DELETE'
  loop
    execute format(
      'alter policy %I on public.church_news_content using (public.may_delete_post(author_id = (select auth.uid()), created_at))',
      pol.policyname);
  end loop;
end $$;

-- Storage: 파일은 올린 사람(owner_id)·올린 시각(created_at)으로 같은 규칙을 적용한다.
alter policy "obj_delete_admin" on storage.objects
  using (bucket_id in ('churchNews','photoAlbum','missionNews')
         and public.may_delete_post(owner_id = (select auth.uid())::text, created_at));

alter policy "obj_delete_bulletin_admin" on storage.objects
  using (bucket_id = 'weeklyBulletin'
         and public.may_delete_post(owner_id = (select auth.uid())::text, created_at));
