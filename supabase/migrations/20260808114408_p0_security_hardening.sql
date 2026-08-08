-- ============================================================
-- Phase 0: additive security hardening.
-- Does NOT change what anon can currently READ (buckets stay
-- public until Phase 2). Closes the anon-write hole, adds the
-- missing write policies that were silently failing, and
-- removes duplicate / never-matching policies.
-- ============================================================

-- 1. Central admin predicate. SECURITY DEFINER so admin checks stop
--    depending on profiles' own SELECT policy staying `auth.uid() = id`.
--    Returns only a boolean about the caller, so it leaks nothing.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- anon needs EXECUTE too: a policy evaluated as anon that cannot execute the
-- function raises 42501 instead of cleanly returning false.
-- (Phase 4 에서 anon 정책이 하나도 남지 않은 것을 확인한 뒤 회수한다.)
grant execute on function public.is_admin() to authenticated, anon;

-- 2. THE HOLE: role `anon`, check was only `bucket_id = 'photoAlbum'`.
--    Anyone with the bundled anon key could upload arbitrary files.
drop policy if exists "public insert photoAlbum" on storage.objects;

-- 3. Dead policies referencing lowercase 'weeklybulletin' (real bucket is
--    'weeklyBulletin') — these never matched a single row.
drop policy if exists "Give anon users access to JPG images in folder eadr9k_1" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder eadr9k_0" on storage.objects;
drop policy if exists "Enable read access for all users" on storage.objects;

-- 4. Exact duplicate of "Admin can delete".
drop policy if exists "Admin can delete files" on storage.objects;

-- 5. church_news_content had two byte-identical UPDATE policies.
drop policy if exists "관리자 수정" on public.church_news_content;

-- 6. MISSING WRITE POLICIES -----------------------------------------
-- sermons had no UPDATE policy at all: SundaySermonPage.handleEditSubmit()
-- matched 0 rows, returned no error, and the UI faked success.
create policy "sermons_update_admin" on public.sermons
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "sermons_delete_admin" on public.sermons
  for delete to authenticated
  using ((select public.is_admin()));

-- weeklyBulletin had no DELETE policy: BulletinPage delete/replace
-- silently no-opped while the UI removed the card.
create policy "obj_delete_bulletin_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'weeklyBulletin' and (select public.is_admin()));

-- Remaining tables: DELETE was absent everywhere. Add for symmetry so a
-- future delete button fails loudly on permission rather than silently.
create policy "pastorcolumn_delete_admin" on public."pastorColumn"
  for delete to authenticated using ((select public.is_admin()));

create policy "news_delete_admin" on public.church_news_content
  for delete to authenticated using ((select public.is_admin()));

create policy "album_delete_admin" on public.photo_album_meta
  for delete to authenticated using ((select public.is_admin()));
